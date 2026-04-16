/**
 * Direct HTTP image downloader for eUnity DICOM viewer.
 *
 * Downloads images from eUnity WITHOUT Playwright by:
 * 1. Following the SAML chain (built-in fetch) to get JSESSIONID on eunitypg
 * 2. Calling AmfServicesServlet to initialize the session for a study
 * 3. Calling CustomImageServlet to download pixel data
 *
 * The eUnity server uses a proprietary AMF protocol:
 * - Request/response type: com.clientoutlook.web.metaservices.AmfServicesMessage
 * - messageType = "call" for requests, "response" for responses
 * - body = AmfServicesRequest for requests, AmfServicesResponse for responses
 *
 * Protocol reverse-engineered from eUnity's Dart/WASM viewer network traffic.
 */
import * as tough from 'tough-cookie';
import * as fs from 'fs';
import * as path from 'path';
import { MyChartRequest } from '../myChartRequest';
import { FdiContext, followSamlChain, getImageViewerSamlUrl } from './imagingViewer';
import { fetchWithCookies, abortAfter } from './fetch';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── AMF3 Writer ───

/**
 * AMF3 binary writer for constructing eUnity API requests.
 *
 * Supports the full AMF3 subset used by eUnity's WASM viewer:
 * - Typed objects (sealed, dynamic, externalizable)
 * - Arrays, strings, integers, booleans, null
 * - String reference table for deduplication
 * - Externalizable objects (ArrayCollection, StudyListRequest)
 *
 * Protocol reverse-engineered from captured browser AMF traffic via
 * Playwright CDP Fetch domain interception.
 */
class AMF3Writer {
  private buf: number[] = [];
  private stringTable: string[] = [];

  writeU29(value: number) {
    if (value < 0x80) {
      this.buf.push(value);
    } else if (value < 0x4000) {
      this.buf.push(((value >> 7) & 0x7F) | 0x80);
      this.buf.push(value & 0x7F);
    } else if (value < 0x200000) {
      this.buf.push(((value >> 14) & 0x7F) | 0x80);
      this.buf.push(((value >> 7) & 0x7F) | 0x80);
      this.buf.push(value & 0x7F);
    } else {
      this.buf.push(((value >> 22) & 0x7F) | 0x80);
      this.buf.push(((value >> 15) & 0x7F) | 0x80);
      this.buf.push(((value >> 8) & 0x7F) | 0x80);
      this.buf.push(value & 0xFF);
    }
  }

  writeNull() { this.buf.push(0x01); }
  writeTrue() { this.buf.push(0x03); }
  writeFalse() { this.buf.push(0x02); }
  writeInteger(value: number) { this.buf.push(0x04); this.writeU29(value); }

  writeString(str: string) { this.buf.push(0x06); this.writeStringValue(str); }

  /** Write a string value (without the 0x06 marker). Handles string reference table. */
  writeStringValue(str: string) {
    if (str === '') {
      // Empty string is always inline (U29 = 0x01 = length 0, inline bit set)
      this.writeU29(1);
      return;
    }
    // Check if string is already in the reference table
    const refIdx = this.stringTable.indexOf(str);
    if (refIdx >= 0) {
      this.writeU29(refIdx << 1); // reference: index << 1, inline bit = 0
      return;
    }
    // Inline string: add to table, then write
    this.stringTable.push(str);
    const bytes = Buffer.from(str, 'utf-8');
    this.writeU29((bytes.length << 1) | 1);
    this.buf.push(...bytes);
  }

  /** Write a 32-bit big-endian integer directly (for Externalizable headers). */
  writeBE32(value: number) {
    this.buf.push((value >> 24) & 0xFF);
    this.buf.push((value >> 16) & 0xFF);
    this.buf.push((value >> 8) & 0xFF);
    this.buf.push(value & 0xFF);
  }

  /**
   * Write a typed AMF3 object with sealed members (non-dynamic, non-externalizable).
   * Traits bits: 0x03 | (memberCount << 4)
   */
  writeTypedObject(
    className: string,
    sealedMembers: string[],
    values: ((w: AMF3Writer) => void)[],
  ) {
    this.buf.push(0x0a);
    const traits = 0x03 | (sealedMembers.length << 4);
    this.writeU29(traits);
    this.writeStringValue(className);
    for (const name of sealedMembers) this.writeStringValue(name);
    for (const valueFn of values) valueFn(this);
  }

  /**
   * Write a dynamic AMF3 object (sealed members + dynamic key-value pairs).
   * Traits bits: 0x0B | (sealedMemberCount << 4) (dynamic bit = 0x04 set, inline bits = 0x03)
   */
  writeDynamicObject(
    className: string,
    sealedMembers: string[],
    sealedValues: ((w: AMF3Writer) => void)[],
    dynamicPairs: [string, (w: AMF3Writer) => void][],
  ) {
    this.buf.push(0x0a);
    const traits = 0x0B | (sealedMembers.length << 4); // 0x03 | 0x08 (dynamic bit)
    this.writeU29(traits);
    this.writeStringValue(className);
    for (const name of sealedMembers) this.writeStringValue(name);
    for (const valueFn of sealedValues) valueFn(this);
    // Dynamic key-value pairs, terminated by empty string
    for (const [key, valueFn] of dynamicPairs) {
      this.writeStringValue(key);
      valueFn(this);
    }
    this.writeStringValue(''); // empty string terminates dynamic section
  }

  /**
   * Write an Externalizable AMF3 object.
   * Traits bits: 0x07 (inline + externalizable bits).
   * The bodyFn writes the custom serialized data.
   */
  writeExternalizableObject(
    className: string,
    bodyFn: (w: AMF3Writer) => void,
  ) {
    this.buf.push(0x0a);
    this.writeU29(0x07); // externalizable: inline=1, ext=1, dynamic=1 → bits 0,1,2 all set
    this.writeStringValue(className);
    bodyFn(this);
  }

  writeArray(items: ((w: AMF3Writer) => void)[]) {
    this.buf.push(0x09);
    this.writeU29((items.length << 1) | 1);
    this.writeStringValue(''); // empty associative
    for (const item of items) item(this);
  }

  toBuffer(): Buffer { return Buffer.from(this.buf); }
}

// ─── AMF3 Request Construction ───

/**
 * Build an AMF3 call to AmfServicesServlet.
 *
 * Protocol (reverse-engineered from captured browser traffic):
 * - Outer object: com.clientoutlook.web.metaservices.AmfServicesMessage
 *   - messageID: incrementing string ID (e.g. "HTTPSimpleLoader_1")
 *   - messageType: "call"
 *   - body: com.clientoutlook.web.metaservices.AmfServicesRequest
 *     - service: service class name (e.g. "StudyService")
 *     - method: method name (e.g. "getStudyListMeta")
 *     - parameters: array of method arguments (NOT "args")
 *
 * Member order matters for AMF3 sealed objects: messageID comes BEFORE messageType.
 */
function buildAmfCall(
  messageID: string,
  service: string,
  method: string,
  parameters: ((w: AMF3Writer) => void)[],
): Buffer {
  const w = new AMF3Writer();
  w.writeTypedObject(
    'com.clientoutlook.web.metaservices.AmfServicesMessage',
    ['messageID', 'messageType', 'body'],
    [
      (w) => w.writeString(messageID),
      (w) => w.writeString('call'),
      (w) => w.writeTypedObject(
        'com.clientoutlook.web.metaservices.AmfServicesRequest',
        ['service', 'method', 'parameters'],
        [
          (w2) => w2.writeString(service),
          (w2) => w2.writeString(method),
          (w2) => w2.writeArray(parameters),
        ],
      ),
    ],
  );
  return w.toBuffer();
}

/**
 * Build the getStudyListMeta AMF request.
 *
 * This is the first call the WASM viewer makes after getting a JSESSIONID.
 * It initializes the server-side session for a specific study, which is
 * required before CustomImageServlet will serve image data (otherwise 403).
 *
 * The single parameter is a StudyListRequest — an Externalizable AMF3 object
 * with a custom binary format containing:
 *   - 4-byte BE header (value 2)
 *   - String "getStudyList" (method qualifier)
 *   - String "1.2.0" (version)
 *   - Anonymous dynamic object with:
 *     - notUsed: true
 *     - requestedPHI: ArrayCollection wrapping RequestedPHI objects
 *     - environment: Environment object
 *
 * Reverse-engineered from captured browser AMF traffic (748 bytes).
 */
export function buildGetStudyListMetaRequest(
  accession: string,
  serviceInstance: string,
  patientId: string,
): Buffer {
  return buildAmfCall('HTTPSimpleLoader_1', 'StudyService', 'getStudyListMeta', [
    (w) => {
      // StudyListRequest is Externalizable — custom binary format
      w.writeExternalizableObject(
        'com.clientoutlook.web.metaservices.StudyListRequest',
        (w) => {
          // 4-byte big-endian header (observed value: 2)
          w.writeBE32(2);
          // Method qualifier string
          w.writeString('getStudyList');
          // Version string
          w.writeString('1.2.0');
          // Anonymous sealed object with 3 members and empty class name.
          // NOT dynamic — the browser uses plain sealed traits (0x33 = 3 members, no dynamic flag).
          w.writeTypedObject(
            '', // empty class name = anonymous object
            ['notUsed', 'requestedPHI', 'environment'],
            [
              // notUsed: true
              (w) => w.writeTrue(),
              // requestedPHI: ArrayCollection wrapping RequestedPHI objects
              (w) => {
                // ArrayCollection is Externalizable — wraps a standard AMF3 array
                w.writeExternalizableObject(
                  'flex.messaging.io.ArrayCollection',
                  (w) => {
                    w.writeArray([
                      (w) => {
                        // RequestedPHI sealed object (8 members)
                        w.writeTypedObject(
                          'com.clientoutlook.data.RequestedPHI',
                          [
                            'patientId',
                            'studyUID',
                            'accessionNumber',
                            'serviceInstanceParameter',
                            'serviceInstanceProperties',
                            'serviceInstance',
                            'originalServiceInstanceParameter',
                            'originalServiceInstance',
                          ],
                          [
                            (w) => w.writeString(patientId),        // e.g. "<MRN>$$$<site>"
                            (w) => w.writeNull(),                    // studyUID: null
                            (w) => w.writeString(accession),         // e.g. "E48330984"
                            (w) => w.writeString(''),                // serviceInstanceParameter: empty
                            (w) => w.writeNull(),                    // serviceInstanceProperties: null
                            (w) => w.writeString(serviceInstance),   // e.g. "EXAMPLEstudystrategy"
                            (w) => w.writeString(''),                // originalServiceInstanceParameter: empty
                            (w) => w.writeString(serviceInstance),   // originalServiceInstance: same
                          ],
                        );
                      },
                    ]);
                  },
                );
              },
              // environment: Environment sealed object (6 members)
              (w) => {
                w.writeTypedObject(
                  'com.clientoutlook.data.hangingprotocol.Environment',
                  ['levelValue', 'level', 'user', 'roles', 'device', 'numberOfScreens'],
                  [
                    (w) => w.writeNull(),           // levelValue: null
                    (w) => w.writeInteger(0),        // level: 0
                    (w) => w.writeNull(),           // user: null
                    (w) => w.writeNull(),           // roles: null
                    (w) => w.writeString('WEB'),    // device: "WEB"
                    (w) => w.writeString('1'),      // numberOfScreens: "1"
                  ],
                );
              },
            ],
          );
        },
      );
    },
  ]);
}

// ─── AMF3 Response Parsing ───

interface AmfResponse {
  code: number;
  response: string | null;
}

/**
 * Parse the outer AmfServicesMessage response to extract code and response text.
 * Returns null if the response can't be parsed.
 */
export function parseAmfResponse(buf: Buffer): AmfResponse | null {
  // Look for the response pattern: AmfServicesResponse followed by code (integer) and response (string or null)
  const text = buf.toString('latin1');
  const codeIdx = text.indexOf('code');
  if (codeIdx < 0) return null;

  // After "code" member name, look for integer marker (0x04) followed by U29 value
  // The response member follows
  let pos = buf.indexOf(Buffer.from('code'), 0);
  if (pos < 0) return null;
  pos += 4; // skip "code"

  // Skip the second member name (either inline or reference)
  // Look for the AMF3 integer marker after both member names
  // Find position of the integer marker for code value
  while (pos < buf.length && buf[pos] !== 0x04 && buf[pos] !== 0x01) pos++;
  if (pos >= buf.length) return null;

  let code = -1;
  let response: string | null = null;

  if (buf[pos] === 0x04) { // Integer
    pos++;
    code = buf[pos] & 0x7F;
    pos++;
  }

  // Next value is the response (string or null)
  if (pos < buf.length) {
    if (buf[pos] === 0x01) { // null
      response = null;
    } else if (buf[pos] === 0x06) { // string
      pos++;
      // Read U29 string length
      let len = 0;
      if (buf[pos] < 0x80) {
        len = buf[pos] >> 1;
        pos++;
      } else {
        len = ((buf[pos] & 0x7F) << 7) | buf[pos + 1];
        len >>= 1;
        pos += 2;
      }
      if (len > 0 && pos + len <= buf.length) {
        response = buf.toString('utf-8', pos, pos + len);
      }
    }
  }

  return { code, response };
}

/**
 * Parse AMF response for DICOM UIDs (series and instance UIDs).
 * Scans the binary buffer heuristically for UID-like patterns.
 */
function parseAmfForUIDs(amfBuffer: Buffer, studyUID: string): string[] {
  const text = amfBuffer.toString('latin1');
  const uidPattern = /1\.\d+\.\d+\.\d+(?:\.\d+){2,}/g;
  return [...new Set(Array.from(text.matchAll(uidPattern), m => m[0]))]
    .filter(uid => uid !== studyUID);
}

// ─── Study Params Extraction ───

export interface EunityStudyParams {
  accession: string;
  serviceInstance: string;
  patientId: string;
}

/**
 * Extract study parameters from the eUnity viewer URL and/or page HTML body.
 *
 * The viewer URL may contain study params as query parameters, or the `arg`
 * parameter may be an encrypted blob (Example Health System). In the encrypted case, the
 * params are embedded in the viewer HTML as a JSON config object:
 *   "accessionNumber":"E48330984"
 *   "serviceInstance":"EXAMPLEstudystrategy"
 *   "patientId":"<MRN>$$$<site>"
 *
 * Known URL formats:
 * - Encrypted arg: <eunity-host>/e/viewer?CLOAccessKeyID=...&arg=<encrypted>
 * - Plain arg: <eunity-host>/e/viewer?CLOAccessKeyID=...&arg=accession%3D...
 * - Direct params: <eunity-host>/eUnity/viewer/?accession=...
 */
export function parseEunityStudyParams(viewerUrl: string, viewerBody?: string): EunityStudyParams | null {
  let accession = '';
  let serviceInstance = '';
  let patientId = '';

  // Strategy 1: Try URL query parameters
  try {
    const url = new URL(viewerUrl);
    const p = url.searchParams;

    accession = p.get('accession') || p.get('accessionNumber') || '';
    serviceInstance = p.get('serviceInstance') || '';
    patientId = p.get('patientId') || p.get('PatID') || '';

    // Try parsing the 'arg' parameter as a query string
    const arg = p.get('arg');
    if (arg && !accession) {
      try {
        const argParams = new URLSearchParams(arg);
        if (!accession) accession = argParams.get('accession') || argParams.get('accessionNumber') || '';
        if (!serviceInstance) serviceInstance = argParams.get('serviceInstance') || '';
        if (!patientId) patientId = argParams.get('patientId') || argParams.get('PatID') || '';
      } catch { /* encrypted arg, not a query string */ }

      // Try pipe-delimited
      if (!accession && arg.includes('|')) {
        const parts = arg.split('|');
        if (parts.length >= 3) {
          accession = parts[0];
          serviceInstance = parts[1];
          patientId = parts[2];
        }
      }
    }
  } catch { /* invalid URL */ }

  // Strategy 2: Parse the viewer HTML body for the JSON config
  // The eUnity viewer embeds study params in a large JS config object
  if ((!accession || !serviceInstance || !patientId) && viewerBody) {
    // Extract accessionNumber from JSON: "accessionNumber":"E48330984"
    if (!accession) {
      const accMatch = viewerBody.match(/"accessionNumber"\s*:\s*"([^"]+)"/);
      if (accMatch) accession = accMatch[1];
    }

    // Extract serviceInstance from JSON: "serviceInstance":"EXAMPLEstudystrategy"
    if (!serviceInstance) {
      const siMatch = viewerBody.match(/"serviceInstance"\s*:\s*"([^"]+)"/);
      if (siMatch) serviceInstance = siMatch[1];
    }

    // Extract patientId from JSON: "patientId":"<MRN>$$$<site>"
    if (!patientId) {
      const pidMatch = viewerBody.match(/"patientId"\s*:\s*"([^"]+)"/);
      if (pidMatch) patientId = pidMatch[1];
    }
  }

  if (accession && serviceInstance && patientId) {
    return { accession, serviceInstance, patientId };
  }

  console.log(`      [PARAMS] Could not extract study params`);
  console.log(`      [PARAMS] accession=${accession}, serviceInstance=${serviceInstance}, patientId=${patientId}`);
  return null;
}

// ─── AMF Response Series Parsing ───

interface ParsedStudyInfo {
  studyUID: string;
  series: Array<{
    seriesUID: string;
    instanceUID: string;
    seriesDescription: string;
  }>;
}


/**
 * Parse the AMF getStudyListMeta response to extract study UID and series info.
 *
 * The AMF response contains a structured list where series UIDs appear as boundaries,
 * followed by their instance UIDs. For multi-slice studies (CT scans), each series
 * has many instance UIDs (one per slice).
 *
 * Strategy:
 * 1. Find all DICOM UIDs in the binary (pattern: 1.X.X.X.X...)
 * 2. Filter out DICOM standard SOP Class UIDs (1.2.840.10008.*)
 * 3. Identify the study UID
 * 4. Detect series UIDs: UIDs that appear multiple times in the binary are typically
 *    series UIDs (they appear in headers and as references). UIDs appearing exactly
 *    once are typically instance UIDs.
 * 5. Walk UIDs in position order, using series UIDs as group boundaries
 * 6. Each series entry includes ALL its instance UIDs for complete multi-slice support
 */
export function parseStudySeriesFromAmf(amfBuf: Buffer): ParsedStudyInfo | null {
  const text = amfBuf.toString('latin1');

  // Find all DICOM UIDs with positions (including duplicates for frequency analysis)
  const uidPattern = /1\.\d+\.\d+\.\d+(?:\.\d+){2,}/g;
  const uidOccurrences: Array<{ uid: string; pos: number }> = [];
  const uidFrequency = new Map<string, number>();
  const firstPosition = new Map<string, number>();
  let match;
  while ((match = uidPattern.exec(text)) !== null) {
    const uid = match[0];
    // 1.2.840.10008.* = DICOM standard SOP Class UIDs (universal spec, not institution-specific)
    // These are type identifiers like "CT Image Storage" that appear as metadata,
    // not study/series/instance UIDs. Defined in the DICOM standard PS3.4.
    if (uid.startsWith('1.2.840.10008.')) continue;
    uidOccurrences.push({ uid, pos: match.index });
    uidFrequency.set(uid, (uidFrequency.get(uid) || 0) + 1);
    if (!firstPosition.has(uid)) firstPosition.set(uid, match.index);
  }

  if (uidOccurrences.length === 0) return null;

  const uniqueUIDs = [...new Set(uidOccurrences.map(o => o.uid))];
  console.log(`      [AMF-PARSE] ${uniqueUIDs.length} unique study-related UIDs from ${uidOccurrences.length} occurrences`);

  // Study UID: the first UID in the response (AMF always starts with study-level data)
  const studyUID = uniqueUIDs[0];

  // Detect series vs instance UIDs using positional structure analysis.
  //
  // The AMF binary lists UIDs in order: series UID, then its instance UIDs.
  // Within the UID stream, we can detect series boundaries by grouping
  // consecutive UIDs by their "parent" (all segments except the last).
  // Single-UID sub-groups are series UIDs; multi-UID runs are instances.
  //
  // For UIDs with very different roots (e.g., COR/SAG vs NONCONTRAST),
  // we first split by major root boundary, then analyze within each root.

  const orderedUIDs = [...firstPosition.entries()]
    .filter(([uid]) => uid !== studyUID)
    .sort((a, b) => a[1] - b[1])
    .map(([uid]) => uid);

  // Sub-group by "parent" (drop last segment)
  const getParent = (uid: string) => uid.split('.').slice(0, -1).join('.');
  const subGroups: Array<{ parent: string; uids: string[] }> = [];
  let currentParent = '';
  let currentGroup: string[] = [];

  for (const uid of orderedUIDs) {
    const parent = getParent(uid);
    if (parent !== currentParent) {
      if (currentGroup.length > 0) {
        subGroups.push({ parent: currentParent, uids: currentGroup });
      }
      currentParent = parent;
      currentGroup = [uid];
    } else {
      currentGroup.push(uid);
    }
  }
  if (currentGroup.length > 0) {
    subGroups.push({ parent: currentParent, uids: currentGroup });
  }

  // Walk sub-groups to identify series and instance relationships.
  // Single-UID sub-groups are series UIDs; multi-UID sub-groups are their instances.
  const candidateSeriesUIDs: string[] = [];
  const seriesInstances = new Map<string, Set<string>>();
  let currentSeriesUID = '';

  for (const sg of subGroups) {
    if (sg.uids.length === 1) {
      // Single UID — likely a series UID (or a standalone instance like Scout)
      const uid = sg.uids[0];
      // If the previous "series" had no instances, it was actually an instance itself
      // Add it to the current series
      if (currentSeriesUID && seriesInstances.get(currentSeriesUID)!.size === 0) {
        // Previous single was actually an instance, not a series
        // Retroactively add it as an instance of the series before it
        const prevSeries = candidateSeriesUIDs[candidateSeriesUIDs.length - 2];
        if (prevSeries) {
          const oldSeries = candidateSeriesUIDs.pop()!;
          seriesInstances.get(prevSeries)!.add(oldSeries);
          seriesInstances.delete(oldSeries);
        }
      }
      currentSeriesUID = uid;
      candidateSeriesUIDs.push(uid);
      seriesInstances.set(uid, new Set());
    } else {
      // Multi-UID sub-group — these are instances of the current series
      if (currentSeriesUID) {
        for (const uid of sg.uids) {
          seriesInstances.get(currentSeriesUID)!.add(uid);
        }
      }
    }
  }

  // Check if the positional analysis produced useful results.
  // For small studies (X-rays) where all UIDs have unique parents,
  // every UID becomes a "series" with 0 instances — fall back to legacy parser.
  //
  // Also fall back when: the remaining UIDs (excluding study UID) form clean pairs
  // but the positional analysis collapsed them into too few series. This happens when
  // UIDs share a common parent prefix (e.g., 1.3.51.0.7.X) but are actually
  // alternating series/instance pairs.
  const totalInstances = [...seriesInstances.values()].reduce((sum, s) => sum + s.size, 0);
  const expectedPairCount = Math.floor(orderedUIDs.length / 2);
  const actualSeriesWithImages = [...seriesInstances.values()].filter(s => s.size > 0).length;

  if (candidateSeriesUIDs.length === 0 || totalInstances === 0) {
    console.log(`      [AMF-PARSE] Positional analysis found ${candidateSeriesUIDs.length} series with ${totalInstances} instances, falling back to pair-based parsing`);
    return parseStudySeriesFromAmfLegacy(amfBuf);
  }

  // If positional analysis collapsed many UIDs into one series with few instances,
  // and pair-based parsing would produce more series, fall back to pairs.
  // This catches X-ray studies (2-6 views) where UIDs share a parent prefix
  // but are actually separate series+instance pairs.
  // Don't fall back for CT/MRI with many instances per series (>10).
  const maxInstancesPerSeries = Math.max(...[...seriesInstances.values()].map(s => s.size));
  if (expectedPairCount >= 2 && actualSeriesWithImages <= 1 && maxInstancesPerSeries <= 10 && expectedPairCount > actualSeriesWithImages) {
    console.log(`      [AMF-PARSE] Positional analysis found ${actualSeriesWithImages} series with images but ${expectedPairCount} pairs expected, falling back to pair-based parsing`);
    return parseStudySeriesFromAmfLegacy(amfBuf);
  }

  console.log(`      [AMF-PARSE] Detected ${candidateSeriesUIDs.length} series via positional analysis`);

  // Extract series descriptions from nearby readable strings
  const descriptionPattern = /[\x20-\x7e]{3,100}/g;
  const readableStrings: Array<{ text: string; pos: number }> = [];
  let strMatch;
  while ((strMatch = descriptionPattern.exec(text)) !== null) {
    const s = strMatch[0].trim();
    if (/^\d+\.\d+\.\d+/.test(s)) continue;
    if (s.includes('com.clientoutlook') || s.includes('flex.messaging')) continue;
    if (s.includes('AmfServices') || s.includes('HTTPSimpleLoader')) continue;
    if (s.includes('getStudyList') || s.includes('StudyService')) continue;
    if (/^[\d.]+$/.test(s)) continue;
    readableStrings.push({ text: s, pos: strMatch.index });
  }

  // Build the result — flatten each series' instances into individual entries
  // for backward compatibility with the download loop
  const series: ParsedStudyInfo['series'] = [];
  let seriesIdx = 0;
  for (let si = 0; si < candidateSeriesUIDs.length; si++) {
    const seriesUID = candidateSeriesUIDs[si];
    const instances = seriesInstances.get(seriesUID)!;
    const seriesPos = firstPosition.get(seriesUID) ?? 0;
    // Search for descriptions between this series and the next one
    const nextSeriesPos = si + 1 < candidateSeriesUIDs.length
      ? (firstPosition.get(candidateSeriesUIDs[si + 1]) ?? text.length)
      : text.length;

    // Find series description: look for readable strings between this series and the next
    let bestDesc = `Series ${++seriesIdx}`;
    let bestScore = 0;
    for (const rs of readableStrings) {
      if (rs.pos < seriesPos || rs.pos > nextSeriesPos) continue;
      // Prefer strings that look like series names (short, no UIDs, not too generic)
      const s = rs.text;
      if (s.length < 3 || s.length > 50) continue;
      // Score: prefer shorter, more descriptive strings
      let score = 10;
      if (/^[A-Z]/.test(s)) score += 5; // Starts with uppercase
      if (s.includes(' ')) score += 3; // Has spaces (human-readable)
      if (/\d+x\d+|\d+mm/i.test(s)) score += 3; // Resolution-like
      if (s.length < 20) score += 2;
      if (score > bestScore) {
        bestScore = score;
        bestDesc = s;
      }
    }

    if (instances.size === 0) {
      // Series with no detected instances — add a self-referencing entry
      series.push({ seriesUID, instanceUID: seriesUID, seriesDescription: bestDesc });
    } else {
      // Add an entry for EACH instance UID — the download loop iterates these
      const sortedInstances = [...instances].sort((a, b) => {
        const aNum = parseInt(a.split('.').pop()!) || 0;
        const bNum = parseInt(b.split('.').pop()!) || 0;
        return aNum - bNum;
      });

      for (const instanceUID of sortedInstances) {
        series.push({ seriesUID, instanceUID, seriesDescription: bestDesc });
      }
    }

    console.log(`      [AMF-PARSE] ${bestDesc}: ${instances.size} instances`);
  }

  console.log(`      [AMF-PARSE] Total: ${series.length} (seriesUID, instanceUID) entries across ${candidateSeriesUIDs.length} series`);

  return { studyUID, series };
}

/**
 * Legacy pair-based parser for simple studies (X-rays with few series).
 * Used as fallback when the frequency-based series detection doesn't find
 * enough high-frequency UIDs.
 */
function parseStudySeriesFromAmfLegacy(amfBuf: Buffer): ParsedStudyInfo | null {
  const text = amfBuf.toString('latin1');

  const uidPattern = /1\.\d+\.\d+\.\d+(?:\.\d+){2,}/g;
  const allUIDs: string[] = [];
  const uidPositions: Map<string, number> = new Map();
  let match;
  while ((match = uidPattern.exec(text)) !== null) {
    if (!uidPositions.has(match[0]) && !match[0].startsWith('1.2.840.10008.')) {
      allUIDs.push(match[0]);
      uidPositions.set(match[0], match.index);
    }
  }

  if (allUIDs.length === 0) return null;

  // Study UID: the first UID in the response (AMF always starts with study-level data)
  const studyUID = allUIDs[0];
  const otherUIDs = allUIDs.filter(uid => uid !== studyUID);

  if (otherUIDs.length === 0) return { studyUID, series: [] };

  const descriptionPattern = /[\x20-\x7e]{3,100}/g;
  const readableStrings: Array<{ text: string; pos: number }> = [];
  let strMatch;
  while ((strMatch = descriptionPattern.exec(text)) !== null) {
    const s = strMatch[0].trim();
    if (/^\d+\.\d+\.\d+/.test(s)) continue;
    if (s.includes('com.clientoutlook') || s.includes('flex.messaging')) continue;
    if (s.includes('AmfServices') || s.includes('HTTPSimpleLoader')) continue;
    if (s.includes('getStudyList') || s.includes('StudyService')) continue;
    if (/^[\d.]+$/.test(s)) continue;
    readableStrings.push({ text: s, pos: strMatch.index });
  }

  const series: ParsedStudyInfo['series'] = [];
  for (let i = 0; i + 1 < otherUIDs.length; i += 2) {
    const seriesUID = otherUIDs[i];
    const instanceUID = otherUIDs[i + 1];
    const seriesPos = uidPositions.get(seriesUID) ?? 0;

    let bestDesc = `Series ${Math.floor(i / 2) + 1}`;
    let bestDist = Infinity;
    for (const rs of readableStrings) {
      const dist = Math.abs(rs.pos - seriesPos);
      if (dist < bestDist && dist < 500 && rs.text.length >= 3 && rs.text.length <= 80) {
        bestDist = dist;
        bestDesc = rs.text;
      }
    }

    series.push({ seriesUID, instanceUID, seriesDescription: bestDesc });
  }

  return { studyUID, series };
}

// ─── Session Initialization ───

/**
 * Extract the real serviceInstance from an AMF response buffer.
 * The server may return a different serviceInstance than the one we sent
 * (e.g., "MyChart" → "UCSFVNAEDGEBundle" for CT scans). The browser uses
 * this real value for a second AMF init call and all CustomImageServlet requests.
 */
export function extractServiceInstanceFromAmf(amfBuf: Buffer, originalServiceInstance: string): string | null {
  const text = amfBuf.toString('latin1');

  // Strategy 1: Look for a serviceInstance value near the "serviceInstance" or
  // "ServiceInstance" field name in the binary. The value typically follows
  // within 50 bytes of the field name.
  const fieldPositions: number[] = [];
  let idx = 0;
  while ((idx = text.indexOf('erviceInstance', idx)) !== -1) {
    fieldPositions.push(idx);
    idx++;
  }

  for (const pos of fieldPositions) {
    // Look at readable strings within 50 bytes after the field name
    const region = text.substring(pos, pos + 100);
    // Match capitalized identifiers that look like serviceInstance values
    // (not field names like "ServiceInstance", "ServiceInstanceParameter")
    const valuePattern = /([A-Z][A-Za-z0-9]{5,}(?:Bundle|Strategy|strategy))/g;
    let match;
    while ((match = valuePattern.exec(region)) !== null) {
      const val = match[1];
      if (val !== originalServiceInstance && !val.startsWith('ServiceInstance')) {
        return val;
      }
    }
  }

  // Strategy 2: Look for known serviceInstance patterns anywhere in the binary.
  // These are institution-specific identifiers that end in "Bundle" or contain "strategy".
  const globalPattern = /([A-Z][A-Za-z0-9]{4,}Bundle|[A-Z][A-Za-z0-9]{4,}[Ss]trategy)/g;
  let match;
  while ((match = globalPattern.exec(text)) !== null) {
    const val = match[1];
    if (val !== originalServiceInstance) {
      return val;
    }
  }

  return null;
}

/**
 * Initialize an eUnity session by calling AmfServicesServlet with getStudyListMeta.
 * This is required before CustomImageServlet will serve images (otherwise 403).
 *
 * Some studies (e.g., CT scans) use a different serviceInstance than the one in the
 * viewer URL. The browser handles this by making two AMF calls:
 * 1. First with the viewer's serviceInstance (e.g., "MyChart")
 * 2. Second with the real serviceInstance from the response (e.g., "UCSFVNAEDGEBundle")
 *
 * Returns { amfBuf, effectiveServiceInstance } on success.
 */
async function initializeAmfSession(
  cookieJar: tough.CookieJar,
  baseUrl: string,
  accession: string,
  serviceInstance: string,
  patientId: string,
): Promise<{ amfBuf: Buffer; effectiveServiceInstance: string } | null> {
  const amfReq = buildGetStudyListMetaRequest(accession, serviceInstance, patientId);

  const res = await fetchWithCookies(cookieJar, `${baseUrl}/e/AmfServicesServlet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'User-Agent': UA,
    },
    body: amfReq,
  });

  if (!res.ok) {
    console.log(`      [AMF] Request failed: ${res.status}`);
    return null;
  }

  const amfBuf = Buffer.from(await res.arrayBuffer());
  const parsed = parseAmfResponse(amfBuf);

  if (parsed && parsed.code !== 0) {
    console.log(`      [AMF] Error code=${parsed.code}: ${parsed.response ?? '(null)'}`);
  }

  if (parsed && parsed.code === 0) {
    console.log(`      [AMF] Session initialized successfully (${amfBuf.length} bytes)`);
  }

  // Check if the response contains a different serviceInstance
  const realSI = extractServiceInstanceFromAmf(amfBuf, serviceInstance);
  let effectiveServiceInstance = serviceInstance;

  if (realSI && realSI !== serviceInstance) {
    console.log(`      [AMF] Server returned different serviceInstance: ${realSI} (was ${serviceInstance})`);
    console.log(`      [AMF] Making second AMF call with real serviceInstance...`);

    // Make a second AMF call with the real serviceInstance (like the browser does)
    const amfReq2 = buildGetStudyListMetaRequest(accession, realSI, patientId);
    const res2 = await fetchWithCookies(cookieJar, `${baseUrl}/e/AmfServicesServlet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'User-Agent': UA,
      },
      body: amfReq2,
    });

    if (res2.ok) {
      const amfBuf2 = Buffer.from(await res2.arrayBuffer());
      const parsed2 = parseAmfResponse(amfBuf2);
      if (parsed2?.code === 0) {
        console.log(`      [AMF] Second session initialized successfully (${amfBuf2.length} bytes)`);
        // Return the FIRST AMF response (has full study/series data) but with the real serviceInstance
        return { amfBuf, effectiveServiceInstance: realSI };
      }
    }
    // Even if second call fails, use the real serviceInstance
    effectiveServiceInstance = realSI;
  }

  return { amfBuf, effectiveServiceInstance };
}

// ─── eUnity Session ───

export interface EunitySession {
  cookieJar: tough.CookieJar;
  baseUrl: string;
  studyUID: string;
  serviceInstance: string;
  series: Array<{ seriesUID: string; instanceUID: string; seriesDescription: string }>;
}

/**
 * Initialize an eUnity session: SAML chain + AMF init + parse series.
 * Returns the authenticated session with cookies and parsed series list.
 * The cookies can be reused for individual image downloads via downloadSingleImage().
 */
export async function initEunitySession(
  mychartRequest: MyChartRequest,
  fdiContext: FdiContext,
): Promise<EunitySession | null> {
  const viewerSession = await getImageViewerSamlUrl(mychartRequest, fdiContext);
  if (!viewerSession?.samlUrl) return null;

  const session = await followSamlChain(mychartRequest, viewerSession.samlUrl);
  if (!session) return null;

  const studyParams = parseEunityStudyParams(session.viewerUrl, session.viewerBody);
  if (!studyParams) return null;

  const baseUrl = new URL(session.viewerUrl).origin;
  const amfResult = await initializeAmfSession(
    session.cookieJar, baseUrl,
    studyParams.accession, studyParams.serviceInstance, studyParams.patientId,
  );
  if (!amfResult) return null;

  const { amfBuf, effectiveServiceInstance } = amfResult;
  const studyInfo = parseStudySeriesFromAmf(amfBuf);
  if (!studyInfo || studyInfo.series.length === 0) return null;

  return {
    cookieJar: session.cookieJar,
    baseUrl,
    studyUID: studyInfo.studyUID,
    serviceInstance: effectiveServiceInstance,
    series: studyInfo.series,
  };
}

/**
 * Download a single image from an initialized eUnity session.
 * Returns the raw CLO pixel + wrapper data for conversion.
 */
export async function downloadSingleImage(
  eunitySession: EunitySession,
  seriesUID: string,
  objectUID: string,
): Promise<{ pixelData: Buffer; wrapperData?: Buffer } | null> {
  const { data } = await downloadImage(eunitySession.cookieJar, eunitySession.baseUrl, {
    studyUID: eunitySession.studyUID,
    seriesUID,
    objectUID,
    serviceInstance: eunitySession.serviceInstance,
    format: 'CLOWRAPPER',
  });

  if (data.length < 256 || (data.length > 8 && data.toString('ascii', 0, 8) === 'CLOERROR')) {
    return null;
  }

  const CLOCLHAAR_MAGIC = Buffer.from('CLOCLHAAR');
  const haarIdx = data.indexOf(CLOCLHAAR_MAGIC);
  if (haarIdx < 0) return null;

  return {
    pixelData: Buffer.from(data.subarray(haarIdx)),
    wrapperData: haarIdx > 0 ? Buffer.from(data.subarray(0, haarIdx)) : undefined,
  };
}

// ─── Image Download ───

export interface SeriesInfo {
  seriesUID: string;
  description: string;
  instanceCount: number;
}

export interface DirectDownloadResult {
  studyName: string;
  images: DirectDownloadedImage[];
  errors: string[];
  /** Parsed series info from AMF response (available even with maxImages: 0) */
  seriesList?: SeriesInfo[];
}

export interface DirectDownloadedImage {
  filePath: string;
  sizeBytes: number;
  seriesUID: string;
  instanceUID: string;
  seriesDescription: string;
  accessionNumber: string;
  format: string;
  pixelData?: Buffer;
  wrapperData?: Buffer;
}

export interface DirectDownloadOptions {
  skipFileWrite?: boolean;
  /** Stop after downloading this many images (default: unlimited). */
  maxImages?: number;
  /** Number of parallel downloads (default: 10). */
  concurrency?: number;
}

/**
 * Progressive refinement levels for CLOPIXEL requests.
 *
 * The eUnity viewer uses Haar wavelet progressive loading:
 * - Level 1 (0,3,1): Approximation coefficients — lowest resolution base layer
 * - Level 2 (2,3,2): Additional wavelet detail — medium resolution
 * - Level 3 (2,4,3): Final wavelet detail — full resolution
 *
 * Each level response adds detail that's composited on the client side.
 * All three levels together represent the full image quality.
 * Observed from browser WASM viewer network traffic.
 */
const PROGRESSIVE_LEVELS = ['0,3,1', '2,3,2', '2,4,3'];

/**
 * Download an image from CustomImageServlet.
 * NOTE: image/CLJPEG format is NOT supported by the Example Health System eUnity server (returns CLOERROR).
 * Use CLOWRAPPER format to get metadata + low-res preview.
 */
async function downloadImage(
  cookieJar: tough.CookieJar,
  baseUrl: string,
  params: {
    studyUID: string;
    seriesUID: string;
    objectUID: string;
    frameNumber?: number;
    serviceInstance: string;
    format?: 'CLOPIXEL' | 'CLOWRAPPER';
    level?: string;
  }
): Promise<{ data: Buffer; contentType: string }> {
  const format = params.format ?? 'CLOWRAPPER';
  const level = params.level ?? '0';

  let requestType: string;
  let contentType: string;
  let haveImageData: string;

  switch (format) {
    case 'CLOPIXEL':
      requestType = 'CLOPIXEL';
      contentType = 'image/CLHAAR';
      haveImageData = 'partialps';
      break;
    case 'CLOWRAPPER':
      requestType = 'CLOWRAPPER';
      contentType = 'image/CLWAVE;image/CLHAAR;image/CLJPEG';
      haveImageData = 'partialnops';
      break;
  }

  const body = new URLSearchParams({
    requestType,
    contentType,
    studyUID: params.studyUID,
    seriesUID: params.seriesUID,
    objectUID: params.objectUID,
    frameNumber: String(params.frameNumber ?? 1),
    locale: 'en_US',
    haveImageData,
    serializeType: 'zlib',
    compressionVersion: '3',
    serviceInstance: params.serviceInstance,
    level,
  }).toString();

  const res = await fetchWithCookies(cookieJar, `${baseUrl}/e/CustomImageServlet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': UA,
    },
    body,
    signal: abortAfter(30_000),
  });

  if (!res.ok) {
    throw new Error(`CustomImageServlet failed: ${res.status} ${res.statusText}`);
  }

  const responseType = res.headers.get('content-type') || '';
  const data = Buffer.from(await res.arrayBuffer());
  return { data, contentType: responseType };
}

/**
 * Download all progressive CLOPIXEL levels for maximum quality.
 *
 * The eUnity viewer uses Haar wavelet progressive refinement — each level
 * adds more detail to the image. All 3 levels are needed for full quality.
 * Returns an array of {level, data} for each successfully downloaded level.
 */
async function downloadProgressiveClopixel(
  cookieJar: tough.CookieJar,
  baseUrl: string,
  params: {
    studyUID: string;
    seriesUID: string;
    objectUID: string;
    serviceInstance: string;
    frameNumber?: number;
  },
): Promise<Array<{ level: string; data: Buffer }>> {
  const results: Array<{ level: string; data: Buffer }> = [];

  for (const level of PROGRESSIVE_LEVELS) {
    try {
      const { data } = await downloadImage(cookieJar, baseUrl, {
        ...params,
        format: 'CLOPIXEL',
        level,
      });

      // Check for CLOERROR in response
      if (data.length > 8 && data.toString('ascii', 0, 8) === 'CLOERROR') {
        console.log(`        [PIXEL] Level ${level}: server returned CLOERROR, stopping`);
        break;
      }

      results.push({ level, data });
      console.log(`        [PIXEL] Level ${level}: ${(data.length / 1024).toFixed(0)} KB`);
    } catch (err) {
      console.log(`        [PIXEL] Level ${level} failed: ${(err as Error).message}`);
      break;
    }
  }

  return results;
}

// ─── DICOMweb Probing ───

/**
 * Probe the eUnity server for DICOMweb/WADO endpoints.
 *
 * Standard DICOM web service paths to try — if any respond with DICOM data,
 * we can download original DICOM files instead of proprietary CLO format.
 * Returns the first working endpoint path, or null if none found.
 *
 * NOTE: Not available on all eUnity instances — some return 403 or 404.
 * However, other MyChart instances may expose DICOMweb.
 */
export async function probeDicomWeb(
  cookieJar: tough.CookieJar,
  baseUrl: string,
  studyUID: string,
): Promise<{ endpoint: string; contentType: string } | null> {
  const paths = [
    `/e/dicomweb/studies/${studyUID}`,
    `/dicomweb/studies/${studyUID}`,
    `/wado-rs/studies/${studyUID}`,
    `/e/wado-rs/studies/${studyUID}`,
    `/e/dicomweb/studies/${studyUID}/metadata`,
    `/dicomweb/studies/${studyUID}/metadata`,
    `/e/wado?requestType=WADO&studyUID=${studyUID}&contentType=application/dicom`,
    `/wado?requestType=WADO&studyUID=${studyUID}&contentType=application/dicom`,
  ];

  for (const urlPath of paths) {
    try {
      const res = await fetchWithCookies(cookieJar, `${baseUrl}${urlPath}`, {
        method: 'GET',
        headers: {
          'User-Agent': UA,
          'Accept': 'multipart/related; type="application/dicom", application/dicom+json, application/json',
        },
      });

      const ct = res.headers.get('content-type') || '';

      if (res.ok && (ct.includes('dicom') || ct.includes('multipart') || ct.includes('json'))) {
        console.log(`      [DICOMweb] Found endpoint: ${urlPath} (${ct})`);
        return { endpoint: urlPath, contentType: ct };
      }

      // Consume response body to prevent connection leak
      await res.arrayBuffer();
    } catch {
      // Connection errors are expected for non-existent endpoints
    }
  }

  return null;
}

function isCloFormat(buf: Buffer): boolean {
  return buf.length > 3 && buf.toString('ascii', 0, 3) === 'CLO';
}

// ─── Main Entry Point ───

/**
 * Download all images from an eUnity session using direct HTTP requests.
 *
 * Flow:
 * 1. Follow SAML chain to get authenticated eUnity session
 * 2. Call AmfServicesServlet getStudyListMeta to initialize the session
 * 3. Download each image via CustomImageServlet
 *
 * The AMF initialization step is critical — without it, CustomImageServlet returns 403.
 */
export async function downloadImagingDirect(
  mychartRequest: MyChartRequest,
  samlUrl: string,
  studyName: string,
  outputDir: string,
  studyParams: {
    studyUID: string;
    accession: string;
    serviceInstance: string;
    patientId: string;
  },
  seriesInfo: Array<{
    seriesUID: string;
    instanceUID: string;
    seriesDescription: string;
  }>,
): Promise<DirectDownloadResult> {
  const result: DirectDownloadResult = {
    studyName,
    images: [],
    errors: [],
  };

  try {
    // Step 1: Follow SAML chain
    console.log('      Following SAML chain...');
    const session = await followSamlChain(mychartRequest, samlUrl);
    if (!session) {
      result.errors.push('Failed to follow SAML chain to eUnity');
      return result;
    }
    console.log(`      Got eUnity session (JSESSIONID: ${session.jsessionId?.substring(0, 12)}...)`);

    const baseUrl = new URL(session.viewerUrl).origin;
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Step 2: Initialize AMF session
    console.log('      Initializing AMF session...');
    const amfResult = await initializeAmfSession(
      session.cookieJar,
      baseUrl,
      studyParams.accession,
      studyParams.serviceInstance,
      studyParams.patientId,
    );

    if (!amfResult) {
      result.errors.push('AMF session initialization failed');
      return result;
    }

    const { amfBuf: amfResponse, effectiveServiceInstance } = amfResult;
    if (effectiveServiceInstance !== studyParams.serviceInstance) {
      studyParams.serviceInstance = effectiveServiceInstance;
    }

    // Parse UIDs from AMF response if available
    const uids = parseAmfForUIDs(amfResponse, studyParams.studyUID);
    if (uids.length > 0) {
      console.log(`      AMF returned ${uids.length} UIDs`);
    }

    // Step 3: Download images (wrapper + progressive pixel levels)
    for (const series of seriesInfo) {
      console.log(`      Downloading ${series.seriesDescription}...`);
      const safeName = studyName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
      const safeDesc = series.seriesDescription.replace(/[^a-zA-Z0-9_-]/g, '_');

      try {
        // CLOWRAPPER: metadata + base image data
        const { data } = await downloadImage(session.cookieJar, baseUrl, {
          studyUID: studyParams.studyUID,
          seriesUID: series.seriesUID,
          objectUID: series.instanceUID,
          serviceInstance: studyParams.serviceInstance,
          format: 'CLOWRAPPER',
        });

        // Skip empty/error responses
        if (data.length < 256 || (data.length > 8 && data.toString('ascii', 0, 8) === 'CLOERROR')) {
          console.log(`      Skipping ${series.seriesDescription}: empty or error response (${data.length} bytes)`);
          continue;
        }

        const ext = isCloFormat(data) ? '.clo' : '.bin';
        const fileName = `${safeName}_${safeDesc}_wrapper${ext}`;
        const filePath = path.join(outputDir, fileName);
        await fs.promises.writeFile(filePath, data);

        result.images.push({
          filePath,
          sizeBytes: data.length,
          seriesUID: series.seriesUID,
          instanceUID: series.instanceUID,
          seriesDescription: series.seriesDescription,
          accessionNumber: studyParams.accession,
          format: isCloFormat(data) ? 'CLHAAR' : 'UNKNOWN',
        });

        console.log(`      Saved: ${fileName} (${data.length} bytes)`);

        // Progressive CLOPIXEL levels for full resolution
        const pixelLevels = await downloadProgressiveClopixel(session.cookieJar, baseUrl, {
          studyUID: studyParams.studyUID,
          seriesUID: series.seriesUID,
          objectUID: series.instanceUID,
          serviceInstance: studyParams.serviceInstance,
        });

        for (const pl of pixelLevels) {
          const levelTag = pl.level.replace(/,/g, '-');
          const pixelFileName = `${safeName}_${safeDesc}_pixel_L${levelTag}${isCloFormat(pl.data) ? '.clo' : '.bin'}`;
          const pixelFilePath = path.join(outputDir, pixelFileName);
          await fs.promises.writeFile(pixelFilePath, pl.data);

          result.images.push({
            filePath: pixelFilePath,
            sizeBytes: pl.data.length,
            seriesUID: series.seriesUID,
            instanceUID: series.instanceUID,
            seriesDescription: `${series.seriesDescription} (pixel L${levelTag})`,
            accessionNumber: studyParams.accession,
            format: isCloFormat(pl.data) ? `CLHAAR_PIXEL_L${levelTag}` : 'UNKNOWN',
          });
        }
      } catch (err) {
        result.errors.push(`${series.seriesDescription}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    result.errors.push(`Fatal: ${(err as Error).message}`);
  }

  return result;
}

// ─── Self-Contained Download Entry Point ───

/**
 * Download all images from an imaging study using direct HTTP requests.
 *
 * This is the main entry point for the CLI `--action get-imaging` flow.
 * It handles the entire pipeline automatically:
 * 1. Gets a fresh SAML URL from FdiData
 * 2. Follows the SAML chain to get an authenticated eUnity session
 * 3. Extracts study parameters (accession, serviceInstance, patientId) from the viewer URL
 * 4. Calls AmfServicesServlet getStudyListMeta to initialize the session and get series info
 * 5. Downloads CLO image data for each series via CustomImageServlet
 *
 * Returns the download results including file paths, sizes, and any errors.
 */
export async function downloadImagingStudyDirect(
  mychartRequest: MyChartRequest,
  fdiContext: FdiContext,
  studyName: string,
  outputDir: string,
  options?: DirectDownloadOptions,
): Promise<DirectDownloadResult> {
  const result: DirectDownloadResult = {
    studyName,
    images: [],
    errors: [],
  };

  try {
    // Step 1: Get SAML URL from FdiData
    console.log('      Getting SAML URL for direct download...');
    const viewerSession = await getImageViewerSamlUrl(mychartRequest, fdiContext);
    if (!viewerSession?.samlUrl) {
      result.errors.push('Could not get SAML URL from FdiData');
      return result;
    }

    // Step 2: Follow SAML chain to eUnity
    console.log('      Following SAML chain...');
    const session = await followSamlChain(mychartRequest, viewerSession.samlUrl);
    if (!session) {
      result.errors.push('Failed to follow SAML chain to eUnity');
      return result;
    }
    console.log(`      Got eUnity session (JSESSIONID: ${session.jsessionId?.substring(0, 12)}...)`);

    // Step 3: Extract study params from viewer URL
    const studyParams = parseEunityStudyParams(session.viewerUrl, session.viewerBody);
    if (!studyParams) {
      result.errors.push(`Could not extract study params from viewer URL: ${session.viewerUrl}`);
      return result;
    }
    console.log(`      Study params: accession=${studyParams.accession}, serviceInstance=${studyParams.serviceInstance}`);

    const baseUrl = new URL(session.viewerUrl).origin;
    const skipFileWrite = options?.skipFileWrite ?? false;
    if (!skipFileWrite) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // Step 4: Initialize AMF session (required before CustomImageServlet will serve images)
    console.log('      Initializing AMF session...');
    const amfResult = await initializeAmfSession(
      session.cookieJar,
      baseUrl,
      studyParams.accession,
      studyParams.serviceInstance,
      studyParams.patientId,
    );

    if (!amfResult) {
      result.errors.push('AMF session initialization failed');
      return result;
    }

    const { amfBuf: amfResponse, effectiveServiceInstance } = amfResult;
    if (effectiveServiceInstance !== studyParams.serviceInstance) {
      console.log(`      Using effective serviceInstance: ${effectiveServiceInstance}`);
      studyParams.serviceInstance = effectiveServiceInstance;
    }

    // Step 5: Parse series info from AMF response
    const studyInfo = parseStudySeriesFromAmf(amfResponse);
    if (!studyInfo || studyInfo.series.length === 0) {
      result.errors.push('Could not parse series info from AMF response');
      return result;
    }
    console.log(`      Found ${studyInfo.series.length} series, studyUID: ${studyInfo.studyUID.substring(0, 30)}...`);

    // Build series list summary (available even with maxImages: 0)
    const seriesMap = new Map<string, { description: string; count: number }>();
    for (const s of studyInfo.series) {
      const existing = seriesMap.get(s.seriesUID);
      if (existing) {
        existing.count++;
      } else {
        seriesMap.set(s.seriesUID, { description: s.seriesDescription, count: 1 });
      }
    }
    result.seriesList = [...seriesMap.entries()].map(([seriesUID, { description, count }]) => ({
      seriesUID,
      description,
      instanceCount: count,
    }));

    // Step 6: Download images — each (seriesUID, instanceUID) pair is a separate image.
    // Download in parallel batches for speed (CT scans can have 700+ slices).
    const maxImages = options?.maxImages ?? Infinity;
    const concurrency = options?.concurrency ?? 5;
    const seriesToDownload = studyInfo.series.slice(0, maxImages);
    const safeName = studyName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const CLOCLHAAR_MAGIC = Buffer.from('CLOCLHAAR');
    let completed = 0;

    async function downloadOne(series: typeof studyInfo.series[0]): Promise<void> {
      try {
        const { data } = await downloadImage(session!.cookieJar, baseUrl, {
          studyUID: studyInfo!.studyUID,
          seriesUID: series.seriesUID,
          objectUID: series.instanceUID,
          serviceInstance: studyParams!.serviceInstance,
          format: 'CLOWRAPPER',
        });

        completed++;
        if (data.length < 256 || (data.length > 8 && data.toString('ascii', 0, 8) === 'CLOERROR')) {
          if (completed % 50 === 0 || completed === seriesToDownload.length) {
            console.log(`      [${completed}/${seriesToDownload.length}] Progress...`);
          }
          return;
        }

        const safeDesc = series.seriesDescription.replace(/[^a-zA-Z0-9_-]/g, '_');

        if (skipFileWrite) {
          const haarIdx = data.indexOf(CLOCLHAAR_MAGIC);
          if (haarIdx >= 0) {
            const wrapperMetadata = haarIdx > 0 ? data.subarray(0, haarIdx) : undefined;
            const embeddedPixelData = data.subarray(haarIdx);
            result.images.push({
              filePath: '',
              sizeBytes: embeddedPixelData.length,
              seriesUID: series.seriesUID,
              instanceUID: series.instanceUID,
              seriesDescription: series.seriesDescription,
              accessionNumber: studyParams!.accession,
              format: 'CLHAAR',
              pixelData: Buffer.from(embeddedPixelData),
              wrapperData: wrapperMetadata ? Buffer.from(wrapperMetadata) : undefined,
            });
          }
        } else {
          const ext = isCloFormat(data) ? '.clo' : '.bin';
          const fileName = `${safeName}_${safeDesc}_wrapper${ext}`;
          const filePath = path.join(outputDir, fileName);
          await fs.promises.writeFile(filePath, data);

          const pixelLevels = await downloadProgressiveClopixel(session!.cookieJar, baseUrl, {
            studyUID: studyInfo!.studyUID,
            seriesUID: series.seriesUID,
            objectUID: series.instanceUID,
            serviceInstance: studyParams!.serviceInstance,
          });

          result.images.push({
            filePath,
            sizeBytes: data.length,
            seriesUID: series.seriesUID,
            instanceUID: series.instanceUID,
            seriesDescription: series.seriesDescription,
            accessionNumber: studyParams!.accession,
            format: isCloFormat(data) ? 'CLHAAR' : 'UNKNOWN',
          });

          for (const pl of pixelLevels) {
            const levelTag = pl.level.replace(/,/g, '-');
            const pixelFileName = `${safeName}_${safeDesc}_pixel_L${levelTag}${isCloFormat(pl.data) ? '.clo' : '.bin'}`;
            const pixelFilePath = path.join(outputDir, pixelFileName);
            await fs.promises.writeFile(pixelFilePath, pl.data);

            result.images.push({
              filePath: pixelFilePath,
              sizeBytes: pl.data.length,
              seriesUID: series.seriesUID,
              instanceUID: series.instanceUID,
              seriesDescription: `${series.seriesDescription} (pixel L${levelTag})`,
              accessionNumber: studyParams!.accession,
              format: isCloFormat(pl.data) ? `CLHAAR_PIXEL_L${levelTag}` : 'UNKNOWN',
            });
          }
        }

        if (completed % 50 === 0 || completed === seriesToDownload.length) {
          console.log(`      [${completed}/${seriesToDownload.length}] Downloaded ${(data.length / 1024).toFixed(0)} KB - ${series.seriesDescription}`);
        }
      } catch (err) {
        completed++;
        result.errors.push(`${series.seriesDescription}: ${(err as Error).message}`);
      }
    }

    // Run downloads in parallel batches
    console.log(`      Downloading ${seriesToDownload.length} images (concurrency: ${concurrency})...`);
    for (let i = 0; i < seriesToDownload.length; i += concurrency) {
      const batch = seriesToDownload.slice(i, i + concurrency);
      await Promise.all(batch.map(s => downloadOne(s)));
    }
  } catch (err) {
    result.errors.push(`Fatal: ${(err as Error).message}`);
  }

  return result;
}

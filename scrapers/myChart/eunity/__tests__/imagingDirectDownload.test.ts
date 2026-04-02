import { describe, it, expect } from 'bun:test';
import {
  parseAmfResponse,
  parseStudySeriesFromAmf,
  parseEunityStudyParams,
  extractServiceInstanceFromAmf,
  buildGetStudyListMetaRequest,
} from '../imagingDirectDownload';

// ─── Helper: build a fake AMF binary with UIDs laid out like a real response ───

/**
 * Build a fake AMF binary buffer that contains DICOM UIDs in a realistic order.
 * The format mimics the eUnity getStudyListMeta response:
 * - Study UID first
 * - Then series UIDs interleaved with their instance UIDs
 * - SOP Class UIDs mixed in as metadata
 */
function buildFakeAmfBinary(opts: {
  studyUID: string;
  series: Array<{ seriesUID: string; instanceUIDs: string[] }>;
  sopClassUIDs?: string[];
}): Buffer {
  const parts: string[] = [];

  // AMF header-like bytes
  parts.push('\x00\x03com.clientoutlook.web.metaservices.AmfServicesMessage');
  parts.push('\x00\x00\x00\x00'); // code = 0 (success)

  // Study UID
  parts.push(`\x06${opts.studyUID}`);

  // SOP Class UIDs (these should be filtered out)
  for (const sop of opts.sopClassUIDs || ['1.2.840.10008.5.1.4.1.1.2']) {
    parts.push(`\x06${sop}`);
  }

  // Series and their instances, in order
  for (const s of opts.series) {
    parts.push(`\x06${s.seriesUID}`);
    for (const inst of s.instanceUIDs) {
      parts.push(`\x06${inst}`);
    }
  }

  return Buffer.from(parts.join(''), 'latin1');
}

// ─── parseAmfResponse ───

describe('parseAmfResponse', () => {
  it('parses a successful AMF response (code 0)', () => {
    // Build AMF with "code" followed by integer marker 0x04 and value 0
    const buf = Buffer.from(
      'headercode\x04\x00\x01',
      'latin1'
    );
    const result = parseAmfResponse(buf);
    expect(result).not.toBeNull();
    expect(result!.code).toBe(0);
  });

  it('parses an error AMF response (code != 0)', () => {
    const buf = Buffer.from(
      'headercode\x04\x05\x01',
      'latin1'
    );
    const result = parseAmfResponse(buf);
    expect(result).not.toBeNull();
    expect(result!.code).toBe(5);
  });

  it('returns null for empty buffer', () => {
    expect(parseAmfResponse(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for buffer without code field', () => {
    expect(parseAmfResponse(Buffer.from('no code field here'))).toBeNull();
  });
});

// ─── parseStudySeriesFromAmf ───

describe('parseStudySeriesFromAmf', () => {
  it('returns null for empty buffer', () => {
    expect(parseStudySeriesFromAmf(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for buffer with no DICOM UIDs', () => {
    expect(parseStudySeriesFromAmf(Buffer.from('no uids here'))).toBeNull();
  });

  it('parses a simple X-ray study with one series and one instance', () => {
    const buf = buildFakeAmfBinary({
      studyUID: '1.2.840.114350.2.539.1.12345',
      series: [
        { seriesUID: '1.2.840.113619.2.55.3.123456.100', instanceUIDs: ['1.2.840.113619.2.55.3.123456.200.1'] },
      ],
    });
    const result = parseStudySeriesFromAmf(buf);
    expect(result).not.toBeNull();
    expect(result!.studyUID).toBe('1.2.840.114350.2.539.1.12345');
    expect(result!.series.length).toBeGreaterThanOrEqual(1);
  });

  it('parses multi-slice series correctly (CT-like)', () => {
    // Simulate a CT scan: one series with many sequential instance UIDs
    const instanceUIDs = Array.from({ length: 47 }, (_, i) =>
      `1.2.840.113619.2.437.3.163582262.142.1644587903.267.${i + 1}`
    );

    const buf = buildFakeAmfBinary({
      studyUID: '1.2.276.0.45.1.3.11.3279576776.2952347416',
      series: [
        {
          seriesUID: '1.2.840.113619.2.437.3.163582262.142.1644587903.265',
          instanceUIDs,
        },
      ],
    });

    const result = parseStudySeriesFromAmf(buf);
    expect(result).not.toBeNull();
    // Should have all 47 instances
    const totalInstances = result!.series.length;
    expect(totalInstances).toBe(47);
    // All should share the same seriesUID
    const uniqueSeries = new Set(result!.series.map(s => s.seriesUID));
    expect(uniqueSeries.size).toBe(1);
  });

  it('parses multiple series with different instance counts', () => {
    const buf = buildFakeAmfBinary({
      studyUID: '1.2.276.0.45.1.3.11.100.200',
      series: [
        {
          seriesUID: '1.2.840.113619.2.437.3.100.260',
          instanceUIDs: ['1.2.840.113619.2.437.3.100.262.1'],
        },
        {
          seriesUID: '1.2.840.113619.2.437.3.100.265',
          instanceUIDs: Array.from({ length: 10 }, (_, i) =>
            `1.2.840.113619.2.437.3.100.267.${i + 1}`
          ),
        },
        {
          seriesUID: '1.2.840.113619.2.437.3.100.265.3',
          instanceUIDs: Array.from({ length: 5 }, (_, i) =>
            `1.2.840.113619.2.437.3.100.318.${i + 1}`
          ),
        },
      ],
    });

    const result = parseStudySeriesFromAmf(buf);
    expect(result).not.toBeNull();
    // Total entries should be 1 + 10 + 5 = 16
    expect(result!.series.length).toBe(16);
  });

  it('filters out DICOM SOP Class UIDs', () => {
    const buf = buildFakeAmfBinary({
      studyUID: '1.2.276.0.45.1.3.11.100.200',
      sopClassUIDs: [
        '1.2.840.10008.5.1.4.1.1.2',     // CT Image Storage
        '1.2.840.10008.5.1.4.1.1.7',     // Secondary Capture
        '1.2.840.10008.5.1.4.1.1.88.22', // Enhanced SR
      ],
      series: [
        {
          seriesUID: '1.2.840.113619.2.437.3.100.265',
          instanceUIDs: ['1.2.840.113619.2.437.3.100.267.1'],
        },
      ],
    });

    const result = parseStudySeriesFromAmf(buf);
    expect(result).not.toBeNull();
    // SOP Class UIDs should not appear in the results
    const allUIDs = [result!.studyUID, ...result!.series.map(s => s.seriesUID), ...result!.series.map(s => s.instanceUID)];
    for (const uid of allUIDs) {
      expect(uid.startsWith('1.2.840.10008.')).toBe(false);
    }
  });

  it('handles series with different OID roots (like COR/SAG)', () => {
    // COR and SAG use a different OID root than the main series
    const buf = buildFakeAmfBinary({
      studyUID: '1.2.276.0.45.1.3.11.100.200',
      series: [
        {
          seriesUID: '1.2.840.113619.2.437.3.100.265',
          instanceUIDs: Array.from({ length: 3 }, (_, i) =>
            `1.2.840.113619.2.437.3.100.267.${i + 1}`
          ),
        },
        {
          // Different OID root for COR
          seriesUID: '1.2.840.113619.2.5.163582262.21241718.601',
          instanceUIDs: Array.from({ length: 4 }, (_, i) =>
            `1.2.840.113619.2.5.42240442.11628.${214 + i * 2}`
          ),
        },
      ],
    });

    const result = parseStudySeriesFromAmf(buf);
    expect(result).not.toBeNull();
    // Should have 3 + 4 = 7 total entries
    expect(result!.series.length).toBe(7);
    // Should have entries from both OID roots
    const hasMainRoot = result!.series.some(s => s.seriesUID.includes('437'));
    const hasCORRoot = result!.series.some(s => s.seriesUID.includes('163582262'));
    expect(hasMainRoot).toBe(true);
    expect(hasCORRoot).toBe(true);
  });

  it('uses first UID as study UID without relying on hardcoded prefixes', () => {
    // Use a completely custom OID root — should still work
    const buf = buildFakeAmfBinary({
      studyUID: '1.3.6.1.4.1.99999.1.2.3.4',
      series: [
        {
          seriesUID: '1.3.6.1.4.1.99999.2.100',
          instanceUIDs: ['1.3.6.1.4.1.99999.2.200.1'],
        },
      ],
    });

    const result = parseStudySeriesFromAmf(buf);
    expect(result).not.toBeNull();
    expect(result!.studyUID).toBe('1.3.6.1.4.1.99999.1.2.3.4');
  });
});

// ─── parseEunityStudyParams ───

describe('parseEunityStudyParams', () => {
  it('extracts params from URL query string', () => {
    const url = 'https://myimages.example.com/e/viewer?accession=12345&serviceInstance=MyChart&patientId=67890';
    const result = parseEunityStudyParams(url);
    expect(result).not.toBeNull();
    expect(result!.accession).toBe('12345');
    expect(result!.serviceInstance).toBe('MyChart');
    expect(result!.patientId).toBe('67890');
  });

  it('extracts params from viewer HTML body JSON', () => {
    const url = 'https://myimages.example.com/e/viewer?CLOAccessKeyID=abc&arg=encrypted';
    const body = `
      some html content
      "accessionNumber":"E48330984"
      "serviceInstance":"TestBundle"
      "patientId":"12345$$$SITE"
      more content
    `;
    const result = parseEunityStudyParams(url, body);
    expect(result).not.toBeNull();
    expect(result!.accession).toBe('E48330984');
    expect(result!.serviceInstance).toBe('TestBundle');
    expect(result!.patientId).toBe('12345$$$SITE');
  });

  it('returns null when params cannot be extracted', () => {
    const url = 'https://myimages.example.com/e/viewer?CLOAccessKeyID=abc&arg=encrypted';
    const result = parseEunityStudyParams(url);
    expect(result).toBeNull();
  });

  it('extracts params from pipe-delimited arg', () => {
    const url = 'https://myimages.example.com/e/viewer?arg=ACC123|ServiceInst|PatID456';
    const result = parseEunityStudyParams(url);
    expect(result).not.toBeNull();
    expect(result!.accession).toBe('ACC123');
    expect(result!.serviceInstance).toBe('ServiceInst');
    expect(result!.patientId).toBe('PatID456');
  });
});

// ─── extractServiceInstanceFromAmf ───

describe('extractServiceInstanceFromAmf', () => {
  it('extracts a different serviceInstance from AMF response', () => {
    const buf = Buffer.from(
      'some binary data UCSFVNAEDGEBundle more data serviceInstance MyChart end',
      'latin1'
    );
    const result = extractServiceInstanceFromAmf(buf, 'MyChart');
    expect(result).toBe('UCSFVNAEDGEBundle');
  });

  it('returns null when no different serviceInstance is found', () => {
    const buf = Buffer.from('some binary data MyChart more data', 'latin1');
    const result = extractServiceInstanceFromAmf(buf, 'MyChart');
    expect(result).toBeNull();
  });

  it('ignores ServiceInstance and ServiceInstanceParameter field names', () => {
    const buf = Buffer.from(
      'ServiceInstance ServiceInstanceParameter someOtherData',
      'latin1'
    );
    const result = extractServiceInstanceFromAmf(buf, 'MyChart');
    // Should not match ServiceInstance or ServiceInstanceParameter
    expect(result).toBeNull();
  });

  it('finds various serviceInstance naming patterns', () => {
    const patterns = [
      { input: 'SomeHospitalBundle', expected: 'SomeHospitalBundle' },
      { input: 'SPRINGFIELDStudyStrategy', expected: 'SPRINGFIELDStudyStrategy' },
      { input: 'UCLAVNAEDGEBundle', expected: 'UCLAVNAEDGEBundle' },
    ];

    for (const { input, expected } of patterns) {
      const buf = Buffer.from(`data ${input} more`, 'latin1');
      const result = extractServiceInstanceFromAmf(buf, 'MyChart');
      expect(result).toBe(expected);
    }
  });
});

// ─── buildGetStudyListMetaRequest ───

describe('buildGetStudyListMetaRequest', () => {
  it('returns a Buffer containing the accession number', () => {
    const buf = buildGetStudyListMetaRequest('ACC123', 'MyChart', 'PAT456');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    const text = buf.toString('latin1');
    expect(text).toContain('ACC123');
    expect(text).toContain('MyChart');
    expect(text).toContain('PAT456');
  });

  it('includes AMF class names', () => {
    const buf = buildGetStudyListMetaRequest('ACC', 'SI', 'PID');
    const text = buf.toString('latin1');
    expect(text).toContain('AmfServicesMessage');
    expect(text).toContain('getStudyListMeta');
    expect(text).toContain('StudyService');
  });

  it('produces different output for different params', () => {
    const buf1 = buildGetStudyListMetaRequest('ACC1', 'SI1', 'PID1');
    const buf2 = buildGetStudyListMetaRequest('ACC2', 'SI2', 'PID2');
    expect(buf1.equals(buf2)).toBe(false);
  });
});

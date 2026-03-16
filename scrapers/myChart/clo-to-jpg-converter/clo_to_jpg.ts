#!/usr/bin/env bun
/**
 * Convert eUnity CLO (ClientOutlook) image files to JPEG.
 *
 * TypeScript port of clo_to_jpg.py. CLO files use a proprietary Haar wavelet
 * format from the eUnity/ClientOutlook DICOM viewer. This script decodes
 * CLOCLHAAR pixel files and CLOHEADERZ01 wrapper files to produce standard
 * JPEG images.
 *
 * Usage:
 *   bun scripts/clo_to_jpg/clo_to_jpg.ts <input.clo> [output.jpg]
 *   bun scripts/clo_to_jpg/clo_to_jpg.ts <directory_with_clo_files> [output_directory]
 *
 * Requirements:
 *   bun add fzstd sharp
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { inflateSync } from "zlib";
import { decompress as zstdDecompress } from "fzstd";
import sharp from "sharp";

const CLOCLHAAR_MAGIC = Buffer.from("CLOCLHAAR###");
const CLOHEADERZ01_MAGIC = Buffer.from("CLOHEADERZ01");
const MARKER = Buffer.from([0x35, 0xfa]);
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const TILE_SIZE = 256;

// ==================== AMF3 Parser ====================

interface AMF3Traits {
  class: string;
  externalizable: boolean;
  dynamic: boolean;
  members: string[];
}

export class AMF3Reader {
  private data: Buffer;
  private pos: number;
  private stringRefs: string[] = [];
  private objectRefs: any[] = [];
  private traitsRefs: AMF3Traits[] = [];

  constructor(data: Buffer) {
    this.data = data;
    this.pos = 0;
  }

  readU8(): number {
    return this.data[this.pos++];
  }

  readU29(): number {
    let n = 0;
    for (let i = 0; i < 3; i++) {
      const b = this.readU8();
      n = (n << 7) | (b & 0x7f);
      if (!(b & 0x80)) return n;
    }
    return (n << 8) | this.readU8();
  }

  readString(): string {
    const ref = this.readU29();
    if (ref & 1) {
      const length = ref >> 1;
      if (length === 0) return "";
      const s = this.data.subarray(this.pos, this.pos + length).toString("utf-8");
      this.pos += length;
      this.stringRefs.push(s);
      return s;
    }
    return this.stringRefs[ref >> 1];
  }

  readDouble(): number {
    const v = this.data.readDoubleBE(this.pos);
    this.pos += 8;
    return v;
  }

  readValue(depth = 0): any {
    if (depth > 20) return null;
    const marker = this.readU8();
    if (marker === 0x00 || marker === 0x01) return null;
    if (marker === 0x02) return false;
    if (marker === 0x03) return true;
    if (marker === 0x04) return this.readU29();
    if (marker === 0x05) return this.readDouble();
    if (marker === 0x06) return this.readString();
    if (marker === 0x08) {
      this.readU29();
      return this.readDouble();
    }
    if (marker === 0x09) return this.readArray(depth);
    if (marker === 0x0a) return this.readObject(depth);
    if (marker === 0x0c) {
      const ref = this.readU29();
      if (ref & 1) {
        const length = ref >> 1;
        const data = Buffer.from(this.data.subarray(this.pos, this.pos + length));
        this.pos += length;
        this.objectRefs.push(data);
        return data;
      }
      return this.objectRefs[ref >> 1];
    }
    return null;
  }

  private readArray(depth: number): any {
    const ref = this.readU29();
    if (!(ref & 1)) return this.objectRefs[ref >> 1];
    const count = ref >> 1;
    // Read associative part
    while (true) {
      const key = this.readString();
      if (key === "") break;
      this.readValue(depth + 1);
    }
    const dense: any[] = [];
    for (let i = 0; i < count; i++) {
      dense.push(this.readValue(depth + 1));
    }
    this.objectRefs.push(dense);
    return dense;
  }

  private readObject(depth: number): any {
    const ref = this.readU29();
    if (!(ref & 1)) return this.objectRefs[ref >> 1];
    let traits: AMF3Traits;
    if (ref & 2) {
      const members: string[] = [];
      const memberCount = ref >> 4;
      const className = this.readString();
      for (let i = 0; i < memberCount; i++) {
        members.push(this.readString());
      }
      traits = {
        class: className,
        externalizable: !!(ref & 4),
        dynamic: !!(ref & 8),
        members,
      };
      this.traitsRefs.push(traits);
    } else {
      traits = this.traitsRefs[ref >> 2];
    }
    const obj: any = { _class: traits.class };
    this.objectRefs.push(obj);
    if (traits.externalizable) {
      obj._data = this.readValue(depth + 1);
      return obj;
    }
    for (const name of traits.members) {
      try {
        obj[name] = this.readValue(depth + 1);
      } catch {
        break;
      }
    }
    if (traits.dynamic) {
      while (true) {
        try {
          const key = this.readString();
          if (key === "") break;
          obj[key] = this.readValue(depth + 1);
        } catch {
          break;
        }
      }
    }
    return obj;
  }
}

// ==================== Wrapper Parser ====================

export interface CloMetadata {
  photometric?: string;
  bits_stored?: number;
  high_pixel_value?: number;
  is_signed?: number;
  window_center?: number;
  window_width?: number;
  presentation_lut_shape?: string;
  rescale_slope?: number;
  rescale_intercept?: number;
  voi_lut?: Uint16Array;
  voi_lut_start?: number;
  voi_lut_bits?: number;
}

export function parseWrapper(input: string | Buffer): CloMetadata {
  const data = typeof input === 'string' ? readFileSync(input) : input;
  if (data.subarray(0, 12).compare(CLOHEADERZ01_MAGIC) !== 0) {
    throw new Error(`Not a CLOHEADERZ01 file`);
  }

  let decompressed: Buffer;
  try {
    decompressed = inflateSync(data.subarray(16));
  } catch (e) {
    throw new Error(`Failed to decompress wrapper: ${e}`);
  }

  const metadata: CloMetadata = {};

  try {
    const reader = new AMF3Reader(decompressed);
    const result = reader.readValue();
    if (result && typeof result === "object" && !Array.isArray(result)) {
      if (typeof result.photometricInterpretation === "string") {
        metadata.photometric = result.photometricInterpretation;
      }
      if (typeof result.bitsStored === "number" && result.bitsStored > 0) {
        metadata.bits_stored = Math.floor(result.bitsStored);
      }
      if (typeof result.highPixelValue === "number" && result.highPixelValue > 0) {
        metadata.high_pixel_value = Math.floor(result.highPixelValue);
      }
      if (typeof result.isSigned === "number") {
        metadata.is_signed = Math.floor(result.isSigned);
      }
      if (typeof result.windowCenter === "number" && result.windowCenter > 0) {
        metadata.window_center = result.windowCenter;
      }
      if (typeof result.windowWidth === "number" && result.windowWidth > 0) {
        metadata.window_width = result.windowWidth;
      }
      if (typeof result.presentationLutShape === "string") {
        metadata.presentation_lut_shape = result.presentationLutShape;
      }
      if (typeof result.rescaleSlope === "number") {
        metadata.rescale_slope = result.rescaleSlope;
      }
      if (typeof result.rescaleIntercept === "number") {
        metadata.rescale_intercept = result.rescaleIntercept;
      }

      // Extract VOI LUT
      const voi = result.voiLut;
      if (voi && Buffer.isBuffer(voi.lut)) {
        const lutData = voi.lut as Buffer;
        const elements = voi.elements || 0;
        const start = voi.start || 0;
        const bits = voi.bits || 16;
        const isLE = voi.lutIsLittleEndian ?? 1;

        if (elements > 0 && lutData.length >= elements * 2) {
          const lut = new Uint16Array(elements);
          for (let i = 0; i < elements; i++) {
            lut[i] = isLE
              ? lutData.readUInt16LE(i * 2)
              : lutData.readUInt16BE(i * 2);
          }
          metadata.voi_lut = lut;
          metadata.voi_lut_start = Math.floor(start);
          metadata.voi_lut_bits = Math.floor(bits);
        }
      }
    }
  } catch {
    // AMF3 parsing failed, try fallback
  }

  // Fallback: text-based detection
  if (!metadata.photometric) {
    const text = decompressed.toString("latin1");
    if (text.includes("MONOCHROME1")) {
      metadata.photometric = "MONOCHROME1";
    } else if (text.includes("MONOCHROME2")) {
      metadata.photometric = "MONOCHROME2";
    }
  }

  return metadata;
}

// ==================== Pixel File Parser ====================

export function parsePixelHeader(data: Buffer): { width: number; height: number } {
  if (data.subarray(0, 12).compare(CLOCLHAAR_MAGIC) !== 0) {
    throw new Error("Not a CLOCLHAAR pixel file");
  }
  if (data[16] !== 0x35 || data[17] !== 0xfa) {
    throw new Error("Expected 35fa marker at offset 16");
  }
  const width = data.readUInt32LE(24);
  const height = data.readUInt32LE(28);
  if (width === 0 || height === 0 || width > 65535 || height > 65535) {
    throw new Error(`Invalid dimensions: ${width}x${height}`);
  }
  return { width, height };
}

export type TileKey = string; // "group,tileRow,tileCol,blockNum"
export type TileMap = Map<TileKey, Uint8Array>;

export function tileKey(group: number, tileRow: number, tileCol: number, blockNum: number): TileKey {
  return `${group},${tileRow},${tileCol},${blockNum}`;
}

export function parseTileKey(key: TileKey): [number, number, number, number] {
  const parts = key.split(",");
  return [+parts[0], +parts[1], +parts[2], +parts[3]];
}

export function extractTiles(data: Buffer): TileMap {
  const tiles: TileMap = new Map();
  let pos = 96;
  let groupIdx = -1;
  let tileRow = 0;
  let tileCol = 0;

  while (pos < data.length - 4) {
    if (data[pos] === 0x35 && data[pos + 1] === 0xfa) {
      const level = data.readUInt16BE(pos + 2);
      const val1 = data.readUInt32LE(pos + 4);
      const val2 = data.readUInt32LE(pos + 8);

      if (level === 2) {
        groupIdx++;
        tileRow = 0;
        tileCol = 0;
      } else if (level === 3) {
        tileRow = (val2 >> 16) & 0xffff;
        tileCol = val2 & 0xffff;
      } else if (level === 5) {
        const compressedSize = val1;
        const blockNum = val2;
        const dataPos = pos + 16;

        if (
          dataPos < data.length - 4 &&
          data[dataPos] === 0x28 &&
          data[dataPos + 1] === 0xb5 &&
          data[dataPos + 2] === 0x2f &&
          data[dataPos + 3] === 0xfd
        ) {
          try {
            const compressed = new Uint8Array(
              data.buffer,
              data.byteOffset + dataPos,
              compressedSize
            );
            const decompressed = zstdDecompress(compressed);
            tiles.set(
              tileKey(groupIdx, tileRow, tileCol, blockNum),
              decompressed
            );
          } catch {
            try {
              const compressed = new Uint8Array(
                data.buffer,
                data.byteOffset + dataPos,
                data.length - dataPos
              );
              const decompressed = zstdDecompress(compressed);
              tiles.set(
                tileKey(groupIdx, tileRow, tileCol, blockNum),
                decompressed
              );
            } catch {
              // Skip this tile
            }
          }
          pos = dataPos + compressedSize;
          continue;
        }
      }
      pos += 16;
    } else {
      pos++;
    }
  }

  return tiles;
}

// ==================== Wavelet Reconstruction ====================

export function computeWaveletLevels(width: number, height: number, numDetailGroups?: number): [number, number][] {
  const levels: [number, number][] = [];
  let cw = width;
  let ch = height;
  if (numDetailGroups !== undefined && numDetailGroups > 0) {
    // Use the actual number of detail groups from the tile data
    for (let i = 0; i < numDetailGroups; i++) {
      cw = (cw + 1) >> 1;
      ch = (ch + 1) >> 1;
      levels.push([ch, cw]);
    }
  } else {
    // Fallback: estimate from dimensions (stops when both fit in a tile)
    while (cw > TILE_SIZE || ch > TILE_SIZE) {
      cw = (cw + 1) >> 1;
      ch = (ch + 1) >> 1;
      levels.push([ch, cw]);
    }
  }
  levels.reverse();
  return levels;
}

function assembleSubbandU16(
  tiles: TileMap,
  group: number,
  lsbBlock: number,
  msbBlock: number,
  h: number,
  w: number
): Uint16Array {
  const total = h * w;
  const lk0 = tileKey(group, 0, 0, lsbBlock);
  const mk0 = tileKey(group, 0, 0, msbBlock);

  // Check if stored as a single untiled block
  if (tiles.has(lk0) && tiles.has(mk0)) {
    const lsbData = tiles.get(lk0)!;
    const msbData = tiles.get(mk0)!;
    if (lsbData.length >= total && msbData.length >= total) {
      const result = new Uint16Array(total);
      for (let i = 0; i < total; i++) {
        result[i] = msbData[i] * 256 + lsbData[i];
      }
      return result;
    }
  }

  // Tiled assembly
  const result = new Uint16Array(total);

  // Find tile keys for this group/block
  const tilePositions: [number, number][] = [];
  for (const key of tiles.keys()) {
    const [g, tr, tc, bn] = parseTileKey(key);
    if (g === group && bn === lsbBlock) {
      tilePositions.push([tr, tc]);
    }
  }
  if (tilePositions.length === 0) return result;

  const nTileRows = Math.max(...tilePositions.map(([tr]) => tr)) + 1;
  const nTileCols = Math.max(...tilePositions.map(([, tc]) => tc)) + 1;

  // Compute standard tile width from actual tile column count
  const stdTileW = nTileCols === 1 ? w : TILE_SIZE;
  const firstData = tiles.get(lk0);
  let stdTileH = firstData ? Math.floor(firstData.length / stdTileW) : TILE_SIZE;
  stdTileH = Math.max(stdTileH, 1);

  for (let tr = 0; tr < nTileRows; tr++) {
    for (let tc = 0; tc < nTileCols; tc++) {
      const lk = tileKey(group, tr, tc, lsbBlock);
      const mk = tileKey(group, tr, tc, msbBlock);
      if (!tiles.has(lk) || !tiles.has(mk)) continue;

      const tw = (tc === nTileCols - 1) ? (w - tc * stdTileW) : stdTileW;
      const lsbData = tiles.get(lk)!;
      const msbData = tiles.get(mk)!;
      let th = tw > 0 ? Math.floor(lsbData.length / tw) : 0;
      th = Math.min(th, h - tr * stdTileH);

      const expected = th * tw;
      if (lsbData.length >= expected && msbData.length >= expected) {
        const r0 = tr * stdTileH;
        const c0 = tc * stdTileW;
        for (let r = 0; r < th; r++) {
          for (let c = 0; c < tw; c++) {
            const srcIdx = r * tw + c;
            const dstIdx = (r0 + r) * w + (c0 + c);
            result[dstIdx] = msbData[srcIdx] * 256 + lsbData[srcIdx];
          }
        }
      }
    }
  }

  return result;
}

function getSubbandBytes(
  tiles: TileMap,
  group: number,
  blockNum: number,
  h: number,
  w: number
): Uint8Array {
  const total = h * w;
  const key0 = tileKey(group, 0, 0, blockNum);

  // Check if stored as a single untiled block
  if (tiles.has(key0)) {
    const data = tiles.get(key0)!;
    if (data.length >= total) {
      return data.subarray(0, total);
    }
  }

  // Tiled assembly
  const result = new Uint8Array(total);

  const tilePositions: [number, number][] = [];
  for (const key of tiles.keys()) {
    const [g, tr, tc, bn] = parseTileKey(key);
    if (g === group && bn === blockNum) {
      tilePositions.push([tr, tc]);
    }
  }
  if (tilePositions.length === 0) return result;

  const nTileRows = Math.max(...tilePositions.map(([tr]) => tr)) + 1;
  const nTileCols = Math.max(...tilePositions.map(([, tc]) => tc)) + 1;

  const stdTileW = nTileCols === 1 ? w : TILE_SIZE;
  const firstData = tiles.get(key0);
  let stdTileH = firstData ? Math.floor(firstData.length / stdTileW) : TILE_SIZE;
  stdTileH = Math.max(stdTileH, 1);

  for (let tr = 0; tr < nTileRows; tr++) {
    for (let tc = 0; tc < nTileCols; tc++) {
      const key = tileKey(group, tr, tc, blockNum);
      if (!tiles.has(key)) continue;

      const data = tiles.get(key)!;
      const tw = (tc === nTileCols - 1) ? (w - tc * stdTileW) : stdTileW;
      let th = tw > 0 ? Math.floor(data.length / tw) : 0;
      th = Math.min(th, h - tr * stdTileH);

      for (let r = 0; r < th; r++) {
        const srcStart = r * tw;
        const dstRow = tr * stdTileH + r;
        if (dstRow >= h) break;
        const dstIdx = dstRow * w + tc * stdTileW;
        result.set(data.subarray(srcStart, srcStart + tw), dstIdx);
      }
    }
  }

  return result;
}

export function zigzagDecode(unsigned: Int32Array): Int32Array {
  const signed = new Int32Array(unsigned.length);
  for (let i = 0; i < unsigned.length; i++) {
    const n = unsigned[i];
    signed[i] = n & 1 ? -((n + 1) >> 1) : n >> 1;
  }
  return signed;
}

function inverseHaarLevel(
  ll: Uint16Array,
  inH: number,
  inW: number,
  tiles: TileMap,
  group: number,
  outH: number,
  outW: number
): Uint16Array {
  // Get detail subband raw bytes
  const lhLow = getSubbandBytes(tiles, group, 1, inH, inW);
  const lhHigh = getSubbandBytes(tiles, group, 65537, inH, inW);
  const hlLow = getSubbandBytes(tiles, group, 2, inH, inW);
  const hlHigh = getSubbandBytes(tiles, group, 65538, inH, inW);
  const hhLow = getSubbandBytes(tiles, group, 3, inH, inW);
  const hhHigh = getSubbandBytes(tiles, group, 65539, inH, inW);
  const overflow = getSubbandBytes(tiles, group, 4, inH, inW);

  const n = inH * inW;

  // Combine byte planes and apply overflow bits, then zigzag decode
  const lhU = new Int32Array(n);
  const hlU = new Int32Array(n);
  const hhU = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const ov = overflow[i];
    lhU[i] = (lhHigh[i] * 256 + lhLow[i]) | ((ov & 1) << 16);
    hlU[i] = (hlHigh[i] * 256 + hlLow[i]) | (((ov >> 1) & 1) << 16);
    hhU[i] = (hhHigh[i] * 256 + hhLow[i]) | (((ov >> 2) & 3) << 16);
  }

  const lh = zigzagDecode(lhU);
  const hl = zigzagDecode(hlU);
  const hh = zigzagDecode(hhU);

  // Lifting scheme inverse Haar
  const out00 = new Int32Array(n);
  const out01 = new Int32Array(n);
  const out10 = new Int32Array(n);
  const out11 = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const s = ll[i]; // LL (unsigned 16-bit)
    const a = hl[i]; // vertical detail
    const b = lh[i]; // horizontal detail
    const c = hh[i]; // diagonal detail

    const z = s - (a >> 1);
    const lInit = b - (c >> 1);
    const aa = z - (lInit >> 1);
    out00[i] = aa;
    out01[i] = lInit + aa;
    const lUpd = lInit + c;
    const nVal = a + z - (lUpd >> 1);
    out10[i] = nVal;
    out11[i] = lUpd + nVal;
  }

  // Interleave into output
  const output = new Int32Array(outH * outW);
  const actualH = Math.min(inH * 2, outH);
  const actualW = Math.min(inW * 2, outW);
  const nEvenRows = (actualH + 1) >> 1;
  const nOddRows = actualH >> 1;
  const nEvenCols = (actualW + 1) >> 1;
  const nOddCols = actualW >> 1;

  // out00 → even rows, even cols
  for (let r = 0; r < nEvenRows; r++) {
    for (let c = 0; c < nEvenCols; c++) {
      output[(r * 2) * outW + (c * 2)] = out00[r * inW + c];
    }
  }
  // out01 → even rows, odd cols
  for (let r = 0; r < nEvenRows; r++) {
    for (let c = 0; c < nOddCols; c++) {
      output[(r * 2) * outW + (c * 2 + 1)] = out01[r * inW + c];
    }
  }
  // out10 → odd rows, even cols
  for (let r = 0; r < nOddRows; r++) {
    for (let c = 0; c < nEvenCols; c++) {
      output[(r * 2 + 1) * outW + (c * 2)] = out10[r * inW + c];
    }
  }
  // out11 → odd rows, odd cols
  for (let r = 0; r < nOddRows; r++) {
    for (let c = 0; c < nOddCols; c++) {
      output[(r * 2 + 1) * outW + (c * 2 + 1)] = out11[r * inW + c];
    }
  }

  // Handle odd output dimensions
  if (outH > actualH && actualH > 0) {
    for (let c = 0; c < outW; c++) {
      output[actualH * outW + c] = output[(actualH - 1) * outW + c];
    }
  }
  if (outW > actualW && actualW > 0) {
    for (let r = 0; r < outH; r++) {
      output[r * outW + actualW] = output[r * outW + actualW - 1];
    }
  }

  // Convert to uint16
  const result = new Uint16Array(outH * outW);
  for (let i = 0; i < outH * outW; i++) {
    result[i] = output[i] & 0xffff;
  }
  return result;
}

export function applyVoiLut(img16: Uint16Array, h: number, w: number, metadata: CloMetadata): Uint16Array {
  if (metadata.voi_lut) {
    const start = metadata.voi_lut_start || 0;
    const elements = metadata.voi_lut.length;
    const result = new Uint16Array(h * w);
    for (let i = 0; i < h * w; i++) {
      let idx = img16[i] - start;
      if (idx < 0) idx = 0;
      if (idx >= elements) idx = elements - 1;
      result[i] = metadata.voi_lut[idx];
    }
    return result;
  }

  // Fallback: window center/width
  if (metadata.window_center && metadata.window_width && metadata.window_center > 0 && metadata.window_width > 0) {
    const lower = metadata.window_center - metadata.window_width / 2;
    const upper = metadata.window_center + metadata.window_width / 2;
    const bits = metadata.voi_lut_bits || 16;
    const maxOut = (1 << bits) - 1;
    const result = new Uint16Array(h * w);
    for (let i = 0; i < h * w; i++) {
      const v = (img16[i] - lower) / (upper - lower) * maxOut;
      result[i] = Math.max(0, Math.min(maxOut, Math.round(v)));
    }
    return result;
  }

  return img16;
}

export function to8bit(img: Uint16Array, invert: boolean): Uint8Array {
  let maxVal = 1;
  for (let i = 0; i < img.length; i++) {
    if (img[i] > maxVal) maxVal = img[i];
  }
  const result = new Uint8Array(img.length);
  for (let i = 0; i < img.length; i++) {
    let v = Math.round(img[i] / maxVal * 255);
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    if (invert) v = 255 - v;
    result[i] = v;
  }
  return result;
}

function reconstructImage(
  tiles: TileMap,
  width: number,
  height: number,
  metadata: CloMetadata
): Uint8Array {
  if (!tiles.has(tileKey(-1, 0, 0, 65536))) {
    throw new Error("Missing LL approximation block");
  }

  // Count actual detail groups from tile data (groups >= 0 are detail levels)
  const detailGroups = new Set<number>();
  for (const key of tiles.keys()) {
    const [g] = parseTileKey(key);
    if (g >= 0) detailGroups.add(g);
  }
  const numDetailGroups = detailGroups.size;

  const levels = computeWaveletLevels(width, height, numDetailGroups);
  if (levels.length === 0) {
    throw new Error("Image too small for wavelet decomposition");
  }

  const [ch, cw] = levels[0];

  // Assemble LL (coarsest approximation)
  let current = assembleSubbandU16(tiles, -1, 0, 65536, ch, cw);
  let curH = ch;
  let curW = cw;

  // Progressive inverse Haar
  for (let lvlIdx = 0; lvlIdx < levels.length; lvlIdx++) {
    const group = lvlIdx;
    let nextH: number, nextW: number;
    if (lvlIdx + 1 < levels.length) {
      [nextH, nextW] = levels[lvlIdx + 1];
    } else {
      nextH = height;
      nextW = width;
    }

    // Check if detail data exists
    let hasDetail = false;
    for (const key of tiles.keys()) {
      const [g, , , bn] = parseTileKey(key);
      if (g === group && bn === 1) {
        hasDetail = true;
        break;
      }
    }

    if (!hasDetail) {
      // No detail: just nearest-neighbor upscale (simple)
      const upscaled = new Uint16Array(nextH * nextW);
      for (let r = 0; r < nextH; r++) {
        const srcR = Math.min(Math.floor(r * curH / nextH), curH - 1);
        for (let c = 0; c < nextW; c++) {
          const srcC = Math.min(Math.floor(c * curW / nextW), curW - 1);
          upscaled[r * nextW + c] = current[srcR * curW + srcC];
        }
      }
      current = upscaled;
      curH = nextH;
      curW = nextW;
      continue;
    }

    current = inverseHaarLevel(current, curH, curW, tiles, group, nextH, nextW);
    curH = nextH;
    curW = nextW;
  }

  // Apply display pipeline
  const invert = metadata.photometric === "MONOCHROME1";
  const displayed = applyVoiLut(current, curH, curW, metadata);
  return to8bit(displayed, invert);
}

// ==================== Conversion ====================

export async function convertCloToJpg(
  pixelInput: string | Buffer,
  outputPath: string | null,
  wrapperInput?: string | Buffer,
  quality = 100
): Promise<string | Buffer> {
  const data = typeof pixelInput === 'string' ? readFileSync(pixelInput) : pixelInput;
  const header = parsePixelHeader(data);
  const { width, height } = header;

  // Parse wrapper for DICOM metadata
  let metadata: CloMetadata = { photometric: "MONOCHROME1" };
  if (wrapperInput) {
    const hasWrapper = typeof wrapperInput === 'string' ? existsSync(wrapperInput) : true;
    if (hasWrapper) {
      try {
        metadata = parseWrapper(wrapperInput);
        if (!metadata.photometric) {
          metadata.photometric = "MONOCHROME1";
        }
      } catch {
        // Use defaults
      }
    }
  }

  const tiles = extractTiles(data);
  if (tiles.size === 0) {
    throw new Error("No data blocks found in CLO file");
  }

  const pixels = reconstructImage(tiles, width, height, metadata);

  const img = sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 1 },
  });

  if (outputPath === null) {
    // Return JPEG buffer instead of writing to disk
    return await img.jpeg({ quality }).toBuffer();
  }

  const ext = extname(outputPath).toLowerCase();
  if (ext === ".png") {
    await img.png().toFile(outputPath);
  } else {
    await img.jpeg({ quality }).toFile(outputPath);
  }

  return outputPath;
}

function findCloPairs(directory: string): [string, string | undefined][] {
  const pairs: [string, string | undefined][] = [];
  const files = readdirSync(directory, { recursive: true }) as string[];

  const pixelFiles = files
    .filter((f) => f.endsWith("_pixel.clo"))
    .map((f) => join(directory, f))
    .sort();

  for (const pixelPath of pixelFiles) {
    const wrapperPath = pixelPath.replace("_pixel.clo", "_wrapper.clo");
    pairs.push([pixelPath, existsSync(wrapperPath) ? wrapperPath : undefined]);
  }

  // Standalone CLO files
  const standalone = files
    .filter((f) => f.endsWith(".clo") && !f.endsWith("_pixel.clo") && !f.endsWith("_wrapper.clo"))
    .map((f) => join(directory, f))
    .sort();

  for (const path of standalone) {
    try {
      const magic = readFileSync(path, { encoding: null }).subarray(0, 12);
      if (magic.compare(CLOCLHAAR_MAGIC) === 0) {
        pairs.push([path, undefined]);
      }
    } catch {
      // Skip
    }
  }

  return pairs;
}

// ==================== CLI ====================

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun clo_to_jpg.ts <input.clo|directory> [output.jpg|directory] [--quality N]");
    process.exit(1);
  }

  const input = args[0];
  const output = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
  const qualityIdx = args.indexOf("--quality");
  const quality = qualityIdx >= 0 && args[qualityIdx + 1] ? parseInt(args[qualityIdx + 1]) : 95;

  if (statSync(input).isDirectory()) {
    const pairs = findCloPairs(input);
    if (pairs.length === 0) {
      console.error(`No CLO pixel files found in ${input}`);
      process.exit(1);
    }

    const outputDir = output || input;
    mkdirSync(outputDir, { recursive: true });

    for (const [pixelPath, wrapperPath] of pairs) {
      const stem = basename(pixelPath).replace("_pixel.clo", "").replace(".clo", "");
      const outputPath = join(outputDir, `${stem}.jpg`);
      try {
        await convertCloToJpg(pixelPath, outputPath, wrapperPath, quality);
        console.log(`Converted: ${pixelPath} -> ${outputPath}`);
      } catch (e) {
        console.error(`Failed: ${pixelPath}: ${e}`);
      }
    }
  } else {
    if (!existsSync(input)) {
      console.error(`File not found: ${input}`);
      process.exit(1);
    }

    let wrapperPath: string | undefined;
    if (input.endsWith("_pixel.clo")) {
      const wp = input.replace("_pixel.clo", "_wrapper.clo");
      if (existsSync(wp)) wrapperPath = wp;
    }

    const outputPath = output || join(
      dirname(input),
      basename(input).replace("_pixel.clo", "").replace(".clo", "") + ".jpg"
    );

    try {
      const result = await convertCloToJpg(input, outputPath, wrapperPath, quality);
      console.log(`Saved: ${result}`);
    } catch (e) {
      console.error(`Error: ${e}`);
      process.exit(1);
    }
  }
}

// Only run CLI when executed directly
if (import.meta.main) {
  main();
}

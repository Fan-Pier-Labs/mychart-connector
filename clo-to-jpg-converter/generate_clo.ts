#!/usr/bin/env bun
/**
 * Generate synthetic CLO (ClientOutlook) image files for testing.
 *
 * Encodes grayscale 16-bit images into the CLOCLHAAR pixel format and
 * CLOHEADERZ01 wrapper format, reversing the decode pipeline in clo_to_jpg.ts.
 *
 * Usage:
 *   bun clo-to-jpg-converter/generate_clo.ts [--output-dir <dir>]
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { deflateSync } from "zlib";

const CLOCLHAAR_MAGIC = Buffer.from("CLOCLHAAR###");
const CLOHEADERZ01_MAGIC = Buffer.from("CLOHEADERZ01");
const MARKER = Buffer.from([0x35, 0xfa]);
const TILE_SIZE = 256;

// ==================== AMF3 Writer ====================

export class AMF3Writer {
  private parts: Buffer[] = [];

  getBuffer(): Buffer {
    return Buffer.concat(this.parts);
  }

  private writeU8(v: number) {
    const b = Buffer.alloc(1);
    b[0] = v & 0xff;
    this.parts.push(b);
  }

  private writeU29(v: number) {
    if (v < 0x80) {
      this.writeU8(v);
    } else if (v < 0x4000) {
      this.writeU8(((v >> 7) & 0x7f) | 0x80);
      this.writeU8(v & 0x7f);
    } else if (v < 0x200000) {
      this.writeU8(((v >> 14) & 0x7f) | 0x80);
      this.writeU8(((v >> 7) & 0x7f) | 0x80);
      this.writeU8(v & 0x7f);
    } else {
      this.writeU8(((v >> 22) & 0x7f) | 0x80);
      this.writeU8(((v >> 15) & 0x7f) | 0x80);
      this.writeU8(((v >> 8) & 0x7f) | 0x80);
      this.writeU8(v & 0xff);
    }
  }

  private writeString(s: string) {
    const encoded = Buffer.from(s, "utf-8");
    this.writeU29((encoded.length << 1) | 1);
    if (encoded.length > 0) {
      this.parts.push(encoded);
    }
  }

  private writeDouble(v: number) {
    const b = Buffer.alloc(8);
    b.writeDoubleBE(v, 0);
    this.parts.push(b);
  }

  writeValue(v: any) {
    if (v === null || v === undefined) {
      this.writeU8(0x01); // undefined
    } else if (typeof v === "boolean") {
      this.writeU8(v ? 0x03 : 0x02);
    } else if (typeof v === "number") {
      if (Number.isInteger(v) && v >= 0 && v < 0x20000000) {
        this.writeU8(0x04); // integer
        this.writeU29(v);
      } else {
        this.writeU8(0x05); // double
        this.writeDouble(v);
      }
    } else if (typeof v === "string") {
      this.writeU8(0x06); // string
      this.writeString(v);
    } else if (typeof v === "object" && !Array.isArray(v)) {
      this.writeObject(v);
    }
  }

  private writeObject(obj: Record<string, any>) {
    this.writeU8(0x0a); // object marker
    const keys = Object.keys(obj).filter((k) => k !== "_class");
    const className = obj._class || "";
    // Inline traits: (memberCount << 4) | dynamic(0) << 3 | externalizable(0) << 2 | 0b11
    const ref = (keys.length << 4) | 0b0011;
    this.writeU29(ref);
    this.writeString(className);
    for (const key of keys) {
      this.writeString(key);
    }
    for (const key of keys) {
      this.writeValue(obj[key]);
    }
  }
}

// ==================== Zigzag Encode ====================

export function zigzagEncode(signed: Int32Array): Int32Array {
  const result = new Int32Array(signed.length);
  for (let i = 0; i < signed.length; i++) {
    const n = signed[i];
    result[i] = n >= 0 ? n * 2 : (-n) * 2 - 1;
  }
  return result;
}

// ==================== Forward Haar Wavelet ====================

/**
 * Forward Haar wavelet transform (lifting scheme).
 * Exact inverse of inverseHaarLevel in clo_to_jpg.ts.
 *
 * Takes image pixels at full resolution and produces:
 * - LL (unsigned 16-bit approximation)
 * - LH, HL, HH (signed detail coefficients)
 */
export function forwardHaarLevel(
  image: Uint16Array,
  outH: number,
  outW: number,
  inH: number,
  inW: number
): {
  ll: Uint16Array;
  lh: Int32Array;
  hl: Int32Array;
  hh: Int32Array;
} {
  const n = inH * inW;

  // De-interleave image into quadrants
  const out00 = new Int32Array(n);
  const out01 = new Int32Array(n);
  const out10 = new Int32Array(n);
  const out11 = new Int32Array(n);

  const nEvenRows = Math.min(inH, (outH + 1) >> 1);
  const nOddRows = Math.min(inH, outH >> 1);
  const nEvenCols = Math.min(inW, (outW + 1) >> 1);
  const nOddCols = Math.min(inW, outW >> 1);

  for (let r = 0; r < nEvenRows; r++) {
    for (let c = 0; c < nEvenCols; c++) {
      out00[r * inW + c] = image[r * 2 * outW + c * 2];
    }
  }
  for (let r = 0; r < nEvenRows; r++) {
    for (let c = 0; c < nOddCols; c++) {
      out01[r * inW + c] = image[r * 2 * outW + c * 2 + 1];
    }
  }
  for (let r = 0; r < nOddRows; r++) {
    for (let c = 0; c < nEvenCols; c++) {
      out10[r * inW + c] = image[(r * 2 + 1) * outW + c * 2];
    }
  }
  for (let r = 0; r < nOddRows; r++) {
    for (let c = 0; c < nOddCols; c++) {
      out11[r * inW + c] = image[(r * 2 + 1) * outW + c * 2 + 1];
    }
  }

  // Forward lifting scheme (exact reverse of inverse in clo_to_jpg.ts)
  const ll = new Uint16Array(n);
  const lh = new Int32Array(n);
  const hl = new Int32Array(n);
  const hh = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const lInit = out01[i] - out00[i];
    const lUpd = out11[i] - out10[i];
    const c = lUpd - lInit; // HH
    const b = lInit + (c >> 1); // LH
    const z = out00[i] + (lInit >> 1);
    const a = out10[i] - z + (lUpd >> 1); // HL
    const s = z + (a >> 1); // LL

    ll[i] = s & 0xffff;
    lh[i] = b;
    hl[i] = a;
    hh[i] = c;
  }

  return { ll, lh, hl, hh };
}

// ==================== Subband Encoding ====================

interface EncodedSubband {
  lsbData: Uint8Array;
  msbData: Uint8Array;
}

function encodeSubbandU16(data: Uint16Array): EncodedSubband {
  const n = data.length;
  const lsb = new Uint8Array(n);
  const msb = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    lsb[i] = data[i] & 0xff;
    msb[i] = (data[i] >> 8) & 0xff;
  }
  return { lsbData: lsb, msbData: msb };
}

interface EncodedDetail {
  lhLsb: Uint8Array;
  lhMsb: Uint8Array;
  hlLsb: Uint8Array;
  hlMsb: Uint8Array;
  hhLsb: Uint8Array;
  hhMsb: Uint8Array;
  overflow: Uint8Array;
}

function encodeDetailSubbands(
  lh: Int32Array,
  hl: Int32Array,
  hh: Int32Array
): EncodedDetail {
  const n = lh.length;

  // Zigzag encode
  const lhZ = zigzagEncode(lh);
  const hlZ = zigzagEncode(hl);
  const hhZ = zigzagEncode(hh);

  const lhLsb = new Uint8Array(n);
  const lhMsb = new Uint8Array(n);
  const hlLsb = new Uint8Array(n);
  const hlMsb = new Uint8Array(n);
  const hhLsb = new Uint8Array(n);
  const hhMsb = new Uint8Array(n);
  const overflow = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    // Split into LSB/MSB and extract overflow bits
    lhLsb[i] = lhZ[i] & 0xff;
    lhMsb[i] = (lhZ[i] >> 8) & 0xff;
    hlLsb[i] = hlZ[i] & 0xff;
    hlMsb[i] = (hlZ[i] >> 8) & 0xff;
    hhLsb[i] = hhZ[i] & 0xff;
    hhMsb[i] = (hhZ[i] >> 8) & 0xff;

    // Overflow: LH bit 16 → bit 0, HL bit 16 → bit 1, HH bits 16-17 → bits 2-3
    let ov = 0;
    if (lhZ[i] & 0x10000) ov |= 1;
    if (hlZ[i] & 0x10000) ov |= 2;
    ov |= ((hhZ[i] >> 16) & 3) << 2;
    overflow[i] = ov;
  }

  return { lhLsb, lhMsb, hlLsb, hlMsb, hhLsb, hhMsb, overflow };
}

// ==================== Binary Format Writers ====================

function zstdCompress(data: Uint8Array): Buffer {
  return Buffer.from(Bun.zstdCompressSync(data));
}

function writeMarker(level: number, val1: number, val2: number): Buffer {
  const buf = Buffer.alloc(16);
  buf[0] = 0x35;
  buf[1] = 0xfa;
  buf.writeUInt16BE(level, 2);
  buf.writeUInt32LE(val1, 4);
  buf.writeUInt32LE(val2, 8);
  // bytes 12-15 are zero padding
  return buf;
}

function writeMarkerFull(
  level: number,
  val1: number,
  val2: number,
  val3: number
): Buffer {
  const buf = writeMarker(level, val1, val2);
  buf.writeUInt32LE(val3, 12);
  return buf;
}

function writeDataBlock(
  blockNum: number,
  data: Uint8Array
): Buffer {
  const compressed = zstdCompress(data);
  // Level 5 marker: val1 = compressed size, val2 = block number
  const marker = writeMarker(5, compressed.length, blockNum);
  return Buffer.concat([marker, compressed]);
}

// ==================== CLO Pixel File Encoder ====================

export function encodePixelFile(
  image: Uint16Array,
  width: number,
  height: number,
  numLevels?: number
): Buffer {
  // Compute wavelet levels
  const levels: [number, number][] = [];
  let cw = width;
  let ch = height;

  if (numLevels !== undefined) {
    for (let i = 0; i < numLevels; i++) {
      cw = (cw + 1) >> 1;
      ch = (ch + 1) >> 1;
      levels.push([ch, cw]);
    }
  } else {
    while (cw > TILE_SIZE || ch > TILE_SIZE) {
      cw = (cw + 1) >> 1;
      ch = (ch + 1) >> 1;
      levels.push([ch, cw]);
    }
  }
  levels.reverse(); // coarsest first

  // Forward wavelet transform
  let current = image;
  let curH = height;
  let curW = width;

  // Store detail subbands for each level (finest to coarsest)
  const detailLevels: {
    inH: number;
    inW: number;
    lh: Int32Array;
    hl: Int32Array;
    hh: Int32Array;
  }[] = [];

  // Process from finest to coarsest
  for (let lvlIdx = levels.length - 1; lvlIdx >= 0; lvlIdx--) {
    const [subH, subW] = levels[lvlIdx];
    const result = forwardHaarLevel(current, curH, curW, subH, subW);
    detailLevels.unshift({
      inH: subH,
      inW: subW,
      lh: result.lh,
      hl: result.hl,
      hh: result.hh,
    });
    // The LL becomes current for next (coarser) level
    current = result.ll;
    curH = subH;
    curW = subW;
  }

  // Now `current` is the coarsest LL approximation
  const llH = levels[0][0];
  const llW = levels[0][1];

  // Build the binary file
  const parts: Buffer[] = [];

  // Header (96 bytes = 6 x 16-byte records)
  // Record 0: magic + FFFFFFFF
  const magic = Buffer.alloc(16);
  CLOCLHAAR_MAGIC.copy(magic, 0);
  magic.writeUInt32LE(0xffffffff, 12);
  parts.push(magic);

  // Record 1: Level 1 marker with dimensions
  parts.push(writeMarkerFull(1, 0xffffffff, width, height));

  // Record 2: Level 65 marker (format info)
  const rec2 = writeMarker(0x41, 0, 1);
  rec2.writeUInt32LE(0x0002010a, 12); // constant observed in real files
  parts.push(rec2);

  // Record 3: Level 2 marker (LL group header)
  const llSubbandH = levels[0][0];
  const llSubbandW = levels[0][1];
  parts.push(
    writeMarkerFull(
      2,
      0xffffffff,
      (levels.length << 16) | llSubbandW,
      (llSubbandH << 8) | 1
    )
  );

  // Record 4: Level 3 marker (LL tile position)
  parts.push(writeMarker(3, 0, 0));

  // Record 5: Level 4 marker (LL tile info)
  parts.push(writeMarker(4, 0, 0));

  // LL data blocks (group -1)
  const llEncoded = encodeSubbandU16(current);
  parts.push(writeDataBlock(0, llEncoded.lsbData)); // block 0 = LSB
  parts.push(writeDataBlock(65536, llEncoded.msbData)); // block 65536 = MSB

  // Detail groups (group 0, 1, 2, ...)
  for (let g = 0; g < detailLevels.length; g++) {
    const detail = detailLevels[g];
    const { inH, inW, lh, hl, hh } = detail;
    const encoded = encodeDetailSubbands(lh, hl, hh);

    // Compute tile layout
    const nTileCols = Math.ceil(inW / TILE_SIZE);
    const nTileRows = Math.ceil(inH / TILE_SIZE);
    const needsTiling = nTileCols > 1 || nTileRows > 1;

    // Level 2 marker (group start)
    parts.push(writeMarker(2, 0xffffffff, 0));

    if (!needsTiling) {
      // Single tile: level 3 + all data blocks
      parts.push(writeMarker(3, 0, 0)); // tileRow=0, tileCol=0

      parts.push(writeDataBlock(1, encoded.lhLsb)); // LH LSB
      parts.push(writeDataBlock(65537, encoded.lhMsb)); // LH MSB
      parts.push(writeDataBlock(2, encoded.hlLsb)); // HL LSB
      parts.push(writeDataBlock(65538, encoded.hlMsb)); // HL MSB
      parts.push(writeDataBlock(3, encoded.hhLsb)); // HH LSB
      parts.push(writeDataBlock(65539, encoded.hhMsb)); // HH MSB
      parts.push(writeDataBlock(4, encoded.overflow)); // overflow
    } else {
      // Tiled: write each tile separately for each block type
      // The decoder assembles tiles per (group, blockNum), so we write
      // all tiles for block 1, then all tiles for block 65537, etc.
      const blockPairs: [number, Uint8Array][] = [
        [1, encoded.lhLsb],
        [65537, encoded.lhMsb],
        [2, encoded.hlLsb],
        [65538, encoded.hlMsb],
        [3, encoded.hhLsb],
        [65539, encoded.hhMsb],
        [4, encoded.overflow],
      ];

      for (const [blockNum, fullData] of blockPairs) {
        for (let tr = 0; tr < nTileRows; tr++) {
          for (let tc = 0; tc < nTileCols; tc++) {
            const tileRow = tr;
            const tileCol = tc;
            const tw =
              tc === nTileCols - 1 ? inW - tc * TILE_SIZE : TILE_SIZE;
            const th =
              tr === nTileRows - 1 ? inH - tr * TILE_SIZE : TILE_SIZE;

            // Extract tile data
            const tileData = new Uint8Array(th * tw);
            for (let r = 0; r < th; r++) {
              const srcRow = tr * TILE_SIZE + r;
              for (let c = 0; c < tw; c++) {
                const srcCol = tc * TILE_SIZE + c;
                tileData[r * tw + c] = fullData[srcRow * inW + srcCol];
              }
            }

            // Level 3 marker with tile position
            const tilePos = (tileRow << 16) | tileCol;
            parts.push(writeMarker(3, 0, tilePos));
            parts.push(writeDataBlock(blockNum, tileData));
          }
        }
      }
    }
  }

  return Buffer.concat(parts);
}

// ==================== CLO Wrapper File Encoder ====================

export interface WrapperMetadata {
  photometricInterpretation?: string;
  bitsStored?: number;
  windowCenter?: number;
  windowWidth?: number;
  isSigned?: number;
  rescaleSlope?: number;
  rescaleIntercept?: number;
}

export function encodeWrapperFile(metadata: WrapperMetadata): Buffer {
  // Build AMF3 object
  const obj: Record<string, any> = {
    _class: "ImageDescription",
  };
  if (metadata.photometricInterpretation) {
    obj.photometricInterpretation = metadata.photometricInterpretation;
  }
  if (metadata.bitsStored !== undefined) {
    obj.bitsStored = metadata.bitsStored;
  }
  if (metadata.windowCenter !== undefined) {
    obj.windowCenter = metadata.windowCenter;
  }
  if (metadata.windowWidth !== undefined) {
    obj.windowWidth = metadata.windowWidth;
  }
  if (metadata.isSigned !== undefined) {
    obj.isSigned = metadata.isSigned;
  }
  if (metadata.rescaleSlope !== undefined) {
    obj.rescaleSlope = metadata.rescaleSlope;
  }
  if (metadata.rescaleIntercept !== undefined) {
    obj.rescaleIntercept = metadata.rescaleIntercept;
  }

  const writer = new AMF3Writer();
  writer.writeValue(obj);
  const amf3Data = writer.getBuffer();

  // Zlib compress
  const compressed = deflateSync(amf3Data);

  // Build wrapper file
  const header = Buffer.alloc(16);
  CLOHEADERZ01_MAGIC.copy(header, 0);
  // bytes 12-15 are zero padding

  return Buffer.concat([header, compressed]);
}

// ==================== Synthetic Image Generation ====================

/** Generate a horizontal gradient (left=0, right=maxVal) */
export function generateGradientH(
  width: number,
  height: number,
  maxVal = 65535
): Uint16Array {
  const img = new Uint16Array(height * width);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      img[r * width + c] = Math.round((c / (width - 1)) * maxVal);
    }
  }
  return img;
}

/** Generate a vertical gradient (top=0, bottom=maxVal) */
export function generateGradientV(
  width: number,
  height: number,
  maxVal = 65535
): Uint16Array {
  const img = new Uint16Array(height * width);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      img[r * width + c] = Math.round((r / (height - 1)) * maxVal);
    }
  }
  return img;
}

/** Generate a checkerboard pattern */
export function generateCheckerboard(
  width: number,
  height: number,
  blockSize = 32,
  lowVal = 0,
  highVal = 65535
): Uint16Array {
  const img = new Uint16Array(height * width);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const blockR = Math.floor(r / blockSize);
      const blockC = Math.floor(c / blockSize);
      img[r * width + c] = (blockR + blockC) % 2 === 0 ? lowVal : highVal;
    }
  }
  return img;
}

/** Generate a circle pattern */
export function generateCircle(
  width: number,
  height: number,
  maxVal = 65535
): Uint16Array {
  const img = new Uint16Array(height * width);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(cx, cy) * 0.8;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2);
      if (dist < maxR) {
        img[r * width + c] = Math.round((1 - dist / maxR) * maxVal);
      }
    }
  }
  return img;
}

/** Generate a diagonal gradient */
export function generateDiagonal(
  width: number,
  height: number,
  maxVal = 65535
): Uint16Array {
  const img = new Uint16Array(height * width);
  const maxDist = width + height - 2;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      img[r * width + c] = Math.round(((r + c) / maxDist) * maxVal);
    }
  }
  return img;
}

// ==================== CLI: Generate Test Files ====================

interface TestImage {
  name: string;
  width: number;
  height: number;
  generate: () => Uint16Array;
  metadata: WrapperMetadata;
}

const TEST_IMAGES: TestImage[] = [
  {
    name: "gradient_h_512x512",
    width: 512,
    height: 512,
    generate: () => generateGradientH(512, 512),
    metadata: {
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    },
  },
  {
    name: "gradient_v_512x512",
    width: 512,
    height: 512,
    generate: () => generateGradientV(512, 512),
    metadata: {
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    },
  },
  {
    name: "checkerboard_512x512",
    width: 512,
    height: 512,
    generate: () => generateCheckerboard(512, 512),
    metadata: {
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    },
  },
  {
    name: "circle_512x512",
    width: 512,
    height: 512,
    generate: () => generateCircle(512, 512),
    metadata: {
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    },
  },
  {
    name: "diagonal_510x510",
    width: 510,
    height: 510,
    generate: () => generateDiagonal(510, 510),
    metadata: {
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    },
  },
];

export function generateTestFiles(outputDir: string) {
  mkdirSync(outputDir, { recursive: true });

  for (const testImage of TEST_IMAGES) {
    const img = testImage.generate();
    const pixelData = encodePixelFile(img, testImage.width, testImage.height);
    const wrapperData = encodeWrapperFile(testImage.metadata);

    const pixelPath = join(outputDir, `${testImage.name}_pixel.clo`);
    const wrapperPath = join(outputDir, `${testImage.name}_wrapper.clo`);

    writeFileSync(pixelPath, pixelData);
    writeFileSync(wrapperPath, wrapperData);

    console.log(
      `Generated: ${testImage.name} (${testImage.width}x${testImage.height}) → ${pixelPath}`
    );
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const outputDirIdx = args.indexOf("--output-dir");
  const outputDir =
    outputDirIdx >= 0 && args[outputDirIdx + 1]
      ? args[outputDirIdx + 1]
      : join(import.meta.dir, "synthetic_test_data");

  generateTestFiles(outputDir);
  console.log(`\nDone. Test files written to ${outputDir}`);
}

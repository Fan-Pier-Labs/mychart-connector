import { describe, it, expect } from "bun:test";
import { existsSync, unlinkSync } from "fs";
import sharp from "sharp";
import { inflateSync } from "zlib";

import {
  convertCloToBitmap,
  convertCloToBitmap16,
  to8bit,
  to16bit,
} from "./clo_to_bitmap";
import type { Bitmap16 } from "./clo_to_bitmap";
import { convertBitmap16ToJpg } from "./exporters/to_jpg";
import { convertBitmap16ToPng } from "./exporters/to_png";
import { convertBitmap16ToAvif } from "./exporters/to_avif";
import { convertBitmap16ToTiff } from "./exporters/to_tiff";
import { convertBitmap16ToWebp } from "./exporters/to_webp";
import { encode16bitPng } from "./exporters/png16";
import {
  encodePixelFile,
  encodeWrapperFile,
  generateGradientH,
  generateGradientV,
  generateCheckerboard,
  generateCircle,
  generateDiagonal,
} from "./generate_clo";

// ==================== Helpers ====================

function makeBitmap16(pixels: Uint16Array, width: number, height: number): Bitmap16 {
  return { pixels, width, height };
}

/** Build a Bitmap16 from a synthetic CLO round-trip (gradient pattern) */
function makeGradientBitmap16(w = 512, h = 512): Bitmap16 {
  const img = generateGradientH(w, h);
  const pixelData = encodePixelFile(img, w, h);
  const wrapperData = encodeWrapperFile({
    photometricInterpretation: "MONOCHROME2",
    bitsStored: 16,
    windowCenter: 32768,
    windowWidth: 65536,
  });
  return convertCloToBitmap16(Buffer.from(pixelData), Buffer.from(wrapperData));
}

/** Build a Bitmap16 from a synthetic CLO round-trip (checkerboard pattern) */
function makeCheckerboardBitmap16(w = 512, h = 512): Bitmap16 {
  const img = generateCheckerboard(w, h);
  const pixelData = encodePixelFile(img, w, h);
  const wrapperData = encodeWrapperFile({
    photometricInterpretation: "MONOCHROME2",
    bitsStored: 16,
    windowCenter: 32768,
    windowWidth: 65536,
  });
  return convertCloToBitmap16(Buffer.from(pixelData), Buffer.from(wrapperData));
}

/** Build a small inline Bitmap16 with known values */
function makeSmallBitmap16(): Bitmap16 {
  return makeBitmap16(
    new Uint16Array([0, 16384, 32768, 49152, 65535, 8192, 24576, 40960, 57344]),
    3,
    3,
  );
}

/** Read 16-bit pixel values directly from a PNG buffer (manual parser) */
function readPng16Pixels(pngBuf: Buffer): { pixels: number[]; bitDepth: number; width: number; height: number } {
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0;
  const idatChunks: Buffer[] = [];

  while (pos < pngBuf.length) {
    const len = pngBuf.readUInt32BE(pos);
    const type = pngBuf.subarray(pos + 4, pos + 8).toString("ascii");
    if (type === "IHDR") {
      width = pngBuf.readUInt32BE(pos + 8);
      height = pngBuf.readUInt32BE(pos + 12);
      bitDepth = pngBuf[pos + 8 + 8];
    }
    if (type === "IDAT") {
      idatChunks.push(pngBuf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 8 + len + 4;
  }

  const decompressed = inflateSync(Buffer.concat(idatChunks));
  const pixels: number[] = [];
  const bytesPerPixel = bitDepth === 16 ? 2 : 1;
  const rowSize = 1 + width * bytesPerPixel;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const offset = r * rowSize + 1 + c * bytesPerPixel;
      if (bitDepth === 16) {
        pixels.push(decompressed.readUInt16BE(offset));
      } else {
        pixels.push(decompressed[offset]);
      }
    }
  }

  return { pixels, bitDepth, width, height };
}

/** Read 16-bit pixel values from a TIFF via sharp */
async function readTiff16Pixels(tiffBuf: Buffer, w: number, h: number): Promise<Uint16Array> {
  const { data } = await sharp(tiffBuf)
    .pipelineColourspace("grey16")
    .toColourspace("grey16")
    .raw({ depth: "ushort" })
    .toBuffer({ resolveWithObject: true });
  const result = new Uint16Array(w * h);
  for (let i = 0; i < w * h; i++) {
    result[i] = data.readUInt16LE(i * 2);
  }
  return result;
}

/** Read 8-bit grayscale pixel values from any image via sharp */
async function readGrayscale8(buf: Buffer): Promise<{ data: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

// ==================== encode16bitPng ====================

describe("encode16bitPng", () => {
  it("produces valid 16-bit grayscale PNG", () => {
    const pixels = new Uint16Array([0, 32768, 65535, 16384]);
    const png = encode16bitPng(pixels, 4, 1);
    const result = readPng16Pixels(png);
    expect(result.bitDepth).toBe(16);
    expect(result.width).toBe(4);
    expect(result.height).toBe(1);
    expect(result.pixels).toEqual([0, 32768, 65535, 16384]);
  });

  it("round-trips through sharp correctly", async () => {
    const pixels = new Uint16Array([0, 21845, 43690, 65535]);
    const png = encode16bitPng(pixels, 4, 1);

    const { data, info } = await sharp(png)
      .pipelineColourspace("grey16")
      .toColourspace("grey16")
      .raw({ depth: "ushort" })
      .toBuffer({ resolveWithObject: true });

    expect(info.channels).toBe(1);
    expect(info.depth).toBe("ushort");
    for (let i = 0; i < 4; i++) {
      expect(data.readUInt16LE(i * 2)).toBe(pixels[i]);
    }
  });

  it("handles multi-row images", () => {
    const pixels = new Uint16Array([100, 200, 300, 400, 500, 600]);
    const png = encode16bitPng(pixels, 3, 2);
    const result = readPng16Pixels(png);
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(result.pixels).toEqual([100, 200, 300, 400, 500, 600]);
  });

  it("preserves boundary values (0 and 65535)", () => {
    const pixels = new Uint16Array([0, 65535]);
    const png = encode16bitPng(pixels, 2, 1);
    const result = readPng16Pixels(png);
    expect(result.pixels[0]).toBe(0);
    expect(result.pixels[1]).toBe(65535);
  });

  it("handles 1x1 image", () => {
    const pixels = new Uint16Array([42000]);
    const png = encode16bitPng(pixels, 1, 1);
    const result = readPng16Pixels(png);
    expect(result.pixels).toEqual([42000]);
  });

  it("sharp reports correct metadata for encoded PNG", async () => {
    const pixels = new Uint16Array(64 * 64).fill(30000);
    const png = encode16bitPng(pixels, 64, 64);
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
    expect(meta.space).toBe("grey16");
    expect(meta.depth).toBe("ushort");
    expect(meta.bitsPerSample).toBe(16);
    expect(meta.channels).toBe(1);
  });
});

// ==================== convertCloToBitmap16 ====================

describe("convertCloToBitmap16", () => {
  it("returns correct dimensions from synthetic CLO", () => {
    const bitmap16 = makeGradientBitmap16();
    expect(bitmap16.width).toBe(512);
    expect(bitmap16.height).toBe(512);
    expect(bitmap16.pixels).toBeInstanceOf(Uint16Array);
    expect(bitmap16.pixels.length).toBe(512 * 512);
  });

  it("pixel values are in 0-65535 range with full range utilization", () => {
    const bitmap16 = makeGradientBitmap16();
    let min = 65535, max = 0;
    for (let i = 0; i < bitmap16.pixels.length; i++) {
      if (bitmap16.pixels[i] < min) min = bitmap16.pixels[i];
      if (bitmap16.pixels[i] > max) max = bitmap16.pixels[i];
    }
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(65535);
    expect(max).toBe(65535);
  });

  it("16-bit downsampled to 8-bit matches native 8-bit bitmap", () => {
    const w = 512, h = 512;
    const img = generateGradientH(w, h);
    const pixelData = Buffer.from(encodePixelFile(img, w, h));
    const wrapperData = Buffer.from(encodeWrapperFile({
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    }));

    const bitmap8 = convertCloToBitmap(pixelData, wrapperData);
    const bitmap16 = convertCloToBitmap16(pixelData, wrapperData);

    const downsampled = to8bit(bitmap16.pixels, false);
    let maxDiff = 0;
    for (let i = 0; i < bitmap8.pixels.length; i++) {
      const diff = Math.abs(downsampled[i] - bitmap8.pixels[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    expect(maxDiff).toBeLessThanOrEqual(1);
  }, 30000);

  it("works with checkerboard pattern", () => {
    const bitmap16 = makeCheckerboardBitmap16();
    expect(bitmap16.width).toBe(512);
    expect(bitmap16.height).toBe(512);
    expect(bitmap16.pixels.length).toBe(512 * 512);
    // Checkerboard should have distinct values
    const unique = new Set(bitmap16.pixels);
    expect(unique.size).toBeGreaterThan(1);
  }, 30000);

  it("has more precision than 8-bit bitmap", () => {
    const w = 512, h = 512;
    const img = generateGradientH(w, h);
    const pixelData = Buffer.from(encodePixelFile(img, w, h));
    const wrapperData = Buffer.from(encodeWrapperFile({
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    }));

    const bitmap8 = convertCloToBitmap(pixelData, wrapperData);
    const bitmap16 = convertCloToBitmap16(pixelData, wrapperData);

    // 16-bit should have more unique values than 8-bit
    const unique8 = new Set(bitmap8.pixels);
    const unique16 = new Set(bitmap16.pixels);
    expect(unique16.size).toBeGreaterThan(unique8.size);
  }, 30000);
});

// ==================== to16bit ====================

describe("to16bit", () => {
  it("scales to 0-65535 range", () => {
    const input = new Uint16Array([0, 500, 1000]);
    const result = to16bit(input, false);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(32768);
    expect(result[2]).toBe(65535);
  });

  it("inverts when requested", () => {
    const input = new Uint16Array([0, 500, 1000]);
    const result = to16bit(input, true);
    expect(result[0]).toBe(65535);
    expect(result[2]).toBe(0);
  });

  it("handles all-zero input", () => {
    const input = new Uint16Array([0, 0, 0]);
    const result = to16bit(input, false);
    expect(Array.from(result)).toEqual([0, 0, 0]);
  });

  it("handles single-value input", () => {
    const input = new Uint16Array([42]);
    const result = to16bit(input, false);
    expect(result[0]).toBe(65535);
  });
});

// ==================== convertBitmap16ToJpg ====================

describe("convertBitmap16ToJpg", () => {
  it("produces valid JPEG buffer from gradient", async () => {
    const bitmap16 = makeGradientBitmap16();
    const jpgBuffer = await convertBitmap16ToJpg(bitmap16);
    expect(Buffer.isBuffer(jpgBuffer)).toBe(true);
    const meta = await sharp(jpgBuffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  }, 30000);

  it("produces valid JPEG from checkerboard", async () => {
    const bitmap16 = makeCheckerboardBitmap16();
    const jpgBuffer = await convertBitmap16ToJpg(bitmap16);
    const meta = await sharp(jpgBuffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  }, 30000);

  it("produces valid JPEG from small inline image", async () => {
    const bitmap16 = makeSmallBitmap16();
    const jpgBuffer = await convertBitmap16ToJpg(bitmap16);
    const meta = await sharp(jpgBuffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(3);
    expect(meta.height).toBe(3);
  });

  it("defaults to quality 100", async () => {
    const bitmap16 = makeGradientBitmap16();
    const defaultQ = await convertBitmap16ToJpg(bitmap16);
    const explicitQ100 = await convertBitmap16ToJpg(bitmap16, { quality: 100 });
    // Same quality should produce same output
    expect(defaultQ.length).toBe(explicitQ100.length);
  }, 30000);

  it("respects quality parameter", async () => {
    const bitmap16 = makeGradientBitmap16();
    const q100 = await convertBitmap16ToJpg(bitmap16, { quality: 100 });
    const q50 = await convertBitmap16ToJpg(bitmap16, { quality: 50 });
    const q10 = await convertBitmap16ToJpg(bitmap16, { quality: 10 });
    expect(q100.length).toBeGreaterThan(q50.length);
    expect(q50.length).toBeGreaterThan(q10.length);
  }, 30000);

  it("preserves image content at high quality", async () => {
    const bitmap16 = makeGradientBitmap16();
    const jpgBuffer = await convertBitmap16ToJpg(bitmap16, { quality: 100 });

    const { data } = await readGrayscale8(jpgBuffer);
    const expected8 = to8bit(bitmap16.pixels, false);

    // At quality 100, JPEG should be very close to source
    let maxDiff = 0;
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(data[i] - expected8[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    expect(maxDiff).toBeLessThanOrEqual(5);
  }, 30000);

  it("writes to disk when outputPath given", async () => {
    const out = "/tmp/test_bitmap16_to_jpg.jpg";
    const bitmap16 = makeGradientBitmap16();
    await convertBitmap16ToJpg(bitmap16, undefined, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
    unlinkSync(out);
  }, 30000);

  it("returns buffer even when writing to disk", async () => {
    const out = "/tmp/test_bitmap16_to_jpg_ret.jpg";
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToJpg(bitmap16, undefined, out);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    unlinkSync(out);
  });

  it("returns buffer when no outputPath", async () => {
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToJpg(bitmap16);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    // JPEG magic bytes: FF D8
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });
});

// ==================== convertBitmap16ToPng ====================

describe("convertBitmap16ToPng", () => {
  it("produces 16-bit PNG by default", async () => {
    const bitmap16 = makeBitmap16(new Uint16Array([0, 32768, 65535, 16384]), 4, 1);
    const pngBuffer = await convertBitmap16ToPng(bitmap16);
    const result = readPng16Pixels(pngBuffer);
    expect(result.bitDepth).toBe(16);
    expect(result.pixels).toEqual([0, 32768, 65535, 16384]);
  });

  it("16-bit PNG is truly lossless for gradient", async () => {
    const bitmap16 = makeGradientBitmap16();
    const pngBuffer = await convertBitmap16ToPng(bitmap16);

    const result = readPng16Pixels(pngBuffer);
    expect(result.width).toBe(bitmap16.width);
    expect(result.height).toBe(bitmap16.height);

    let mismatches = 0;
    for (let i = 0; i < bitmap16.pixels.length; i++) {
      if (result.pixels[i] !== bitmap16.pixels[i]) mismatches++;
    }
    expect(mismatches).toBe(0);
  }, 30000);

  it("16-bit PNG is truly lossless for checkerboard", async () => {
    const bitmap16 = makeCheckerboardBitmap16();
    const pngBuffer = await convertBitmap16ToPng(bitmap16);

    const result = readPng16Pixels(pngBuffer);
    let mismatches = 0;
    for (let i = 0; i < bitmap16.pixels.length; i++) {
      if (result.pixels[i] !== bitmap16.pixels[i]) mismatches++;
    }
    expect(mismatches).toBe(0);
  }, 30000);

  it("16-bit PNG is lossless for small image with known values", async () => {
    const bitmap16 = makeSmallBitmap16();
    const pngBuffer = await convertBitmap16ToPng(bitmap16);
    const result = readPng16Pixels(pngBuffer);
    expect(result.pixels).toEqual(Array.from(bitmap16.pixels));
  });

  it("sharp reports correct 16-bit metadata", async () => {
    const bitmap16 = makeGradientBitmap16();
    const pngBuffer = await convertBitmap16ToPng(bitmap16);
    const meta = await sharp(pngBuffer).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
    expect(meta.depth).toBe("ushort");
    expect(meta.bitsPerSample).toBe(16);
  }, 30000);

  it("produces 8-bit PNG when bitdepth is 8", async () => {
    const bitmap16 = makeGradientBitmap16();
    const pngBuffer = await convertBitmap16ToPng(bitmap16, { bitdepth: 8 });
    const meta = await sharp(pngBuffer).metadata();
    expect(meta.depth).toBe("uchar");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  }, 30000);

  it("8-bit PNG has correct pixel values", async () => {
    const bitmap16 = makeGradientBitmap16();
    const pngBuffer = await convertBitmap16ToPng(bitmap16, { bitdepth: 8 });

    const { data } = await readGrayscale8(pngBuffer);
    const expected8 = to8bit(bitmap16.pixels, false);

    let mismatches = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== expected8[i]) mismatches++;
    }
    expect(mismatches).toBe(0);
  }, 30000);

  it("respects compressionLevel for 16-bit", async () => {
    const bitmap16 = makeGradientBitmap16();
    const fast = await convertBitmap16ToPng(bitmap16, { compressionLevel: 0 });
    const slow = await convertBitmap16ToPng(bitmap16, { compressionLevel: 9 });
    // Higher compression should produce smaller file
    expect(slow.length).toBeLessThan(fast.length);
  }, 30000);

  it("respects compressionLevel for 8-bit", async () => {
    const bitmap16 = makeGradientBitmap16();
    const fast = await convertBitmap16ToPng(bitmap16, { bitdepth: 8, compressionLevel: 0 });
    const slow = await convertBitmap16ToPng(bitmap16, { bitdepth: 8, compressionLevel: 9 });
    expect(slow.length).toBeLessThan(fast.length);
  }, 30000);

  it("writes to disk when outputPath given", async () => {
    const out = "/tmp/test_bitmap16_to_png.png";
    const bitmap16 = makeSmallBitmap16();
    await convertBitmap16ToPng(bitmap16, undefined, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    unlinkSync(out);
  });

  it("returns buffer even when writing to disk", async () => {
    const out = "/tmp/test_bitmap16_to_png_ret.png";
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToPng(bitmap16, undefined, out);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    unlinkSync(out);
  });

  it("PNG magic bytes are correct", async () => {
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToPng(bitmap16);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // P
    expect(buffer[2]).toBe(0x4e); // N
    expect(buffer[3]).toBe(0x47); // G
  });
});

// ==================== convertBitmap16ToAvif ====================

describe("convertBitmap16ToAvif", () => {
  it("produces valid AVIF buffer from gradient", async () => {
    const bitmap16 = makeGradientBitmap16();
    const avifBuffer = await convertBitmap16ToAvif(bitmap16);
    expect(Buffer.isBuffer(avifBuffer)).toBe(true);
    const meta = await sharp(avifBuffer).metadata();
    expect(meta.format).toBe("heif");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  }, 30000);

  it("produces valid AVIF from checkerboard", async () => {
    const bitmap16 = makeCheckerboardBitmap16();
    const avifBuffer = await convertBitmap16ToAvif(bitmap16);
    const meta = await sharp(avifBuffer).metadata();
    expect(meta.format).toBe("heif");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  }, 30000);

  it("produces valid AVIF from small image", async () => {
    const bitmap16 = makeSmallBitmap16();
    const avifBuffer = await convertBitmap16ToAvif(bitmap16);
    const meta = await sharp(avifBuffer).metadata();
    expect(meta.format).toBe("heif");
    expect(meta.width).toBe(3);
    expect(meta.height).toBe(3);
  });

  it("defaults to quality 80", async () => {
    const bitmap16 = makeGradientBitmap16();
    const defaultQ = await convertBitmap16ToAvif(bitmap16);
    const explicitQ80 = await convertBitmap16ToAvif(bitmap16, { quality: 80 });
    expect(defaultQ.length).toBe(explicitQ80.length);
  }, 30000);

  it("respects quality parameter", async () => {
    const bitmap16 = makeGradientBitmap16();
    const high = await convertBitmap16ToAvif(bitmap16, { quality: 90 });
    const low = await convertBitmap16ToAvif(bitmap16, { quality: 30 });
    expect(high.length).toBeGreaterThan(low.length);
  }, 30000);

  it("lossless AVIF round-trips with acceptable precision", async () => {
    const bitmap16 = makeGradientBitmap16();
    const avifBuffer = await convertBitmap16ToAvif(bitmap16, { lossless: true });

    const { data } = await readGrayscale8(avifBuffer);
    const expected8 = to8bit(bitmap16.pixels, false);

    let maxDiff = 0;
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(data[i] - expected8[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    // Lossless AVIF at 8-bit should be very close
    expect(maxDiff).toBeLessThanOrEqual(2);
  }, 30000);

  it("lossy AVIF is reasonable quality", async () => {
    const bitmap16 = makeGradientBitmap16();
    const avifBuffer = await convertBitmap16ToAvif(bitmap16, { quality: 80 });

    const { data } = await readGrayscale8(avifBuffer);
    const expected8 = to8bit(bitmap16.pixels, false);

    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const diff = data[i] - expected8[i];
      sumSq += diff * diff;
    }
    const rmse = Math.sqrt(sumSq / data.length);
    // RMSE should be reasonable for q80
    expect(rmse).toBeLessThan(10);
  }, 30000);

  it("higher effort produces smaller file", async () => {
    const bitmap16 = makeGradientBitmap16();
    const fast = await convertBitmap16ToAvif(bitmap16, { quality: 50, effort: 0 });
    const slow = await convertBitmap16ToAvif(bitmap16, { quality: 50, effort: 9 });
    expect(slow.length).toBeLessThanOrEqual(fast.length);
  }, 60000);

  it("writes to disk when outputPath given", async () => {
    const out = "/tmp/test_bitmap16_to_avif.avif";
    const bitmap16 = makeGradientBitmap16();
    await convertBitmap16ToAvif(bitmap16, undefined, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("heif");
    unlinkSync(out);
  }, 30000);

  it("returns buffer even when writing to disk", async () => {
    const out = "/tmp/test_bitmap16_to_avif_ret.avif";
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToAvif(bitmap16, undefined, out);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    unlinkSync(out);
  });

  it("returns buffer when no outputPath", async () => {
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToAvif(bitmap16);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

// ==================== convertBitmap16ToTiff ====================

describe("convertBitmap16ToTiff", () => {
  it("produces valid 16-bit TIFF by default", async () => {
    const bitmap16 = makeGradientBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16);
    expect(Buffer.isBuffer(tiffBuffer)).toBe(true);
    const meta = await sharp(tiffBuffer).metadata();
    expect(meta.format).toBe("tiff");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
    expect(meta.depth).toBe("ushort");
    expect(meta.bitsPerSample).toBe(16);
  }, 30000);

  it("16-bit TIFF is lossless for gradient", async () => {
    const bitmap16 = makeGradientBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16);

    const readBack = await readTiff16Pixels(tiffBuffer, 512, 512);
    let mismatches = 0;
    for (let i = 0; i < bitmap16.pixels.length; i++) {
      if (readBack[i] !== bitmap16.pixels[i]) mismatches++;
    }
    expect(mismatches).toBe(0);
  }, 30000);

  it("16-bit TIFF is lossless for checkerboard", async () => {
    const bitmap16 = makeCheckerboardBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16);

    const readBack = await readTiff16Pixels(tiffBuffer, 512, 512);
    let mismatches = 0;
    for (let i = 0; i < bitmap16.pixels.length; i++) {
      if (readBack[i] !== bitmap16.pixels[i]) mismatches++;
    }
    expect(mismatches).toBe(0);
  }, 30000);

  it("16-bit TIFF is lossless for small image with known values", async () => {
    const bitmap16 = makeSmallBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16);

    const readBack = await readTiff16Pixels(tiffBuffer, 3, 3);
    expect(Array.from(readBack)).toEqual(Array.from(bitmap16.pixels));
  });

  it("produces 8-bit TIFF when bitdepth is 8", async () => {
    const bitmap16 = makeGradientBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16, { bitdepth: 8 });
    const meta = await sharp(tiffBuffer).metadata();
    expect(meta.format).toBe("tiff");
    expect(meta.depth).toBe("uchar");
  }, 30000);

  it("8-bit TIFF has correct pixel values", async () => {
    const bitmap16 = makeGradientBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16, { bitdepth: 8 });

    const { data } = await readGrayscale8(tiffBuffer);
    const expected8 = to8bit(bitmap16.pixels, false);

    let maxDiff = 0;
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(data[i] - expected8[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    expect(maxDiff).toBeLessThanOrEqual(1);
  }, 30000);

  it("defaults to LZW compression", async () => {
    const bitmap16 = makeGradientBitmap16();
    const defaultComp = await convertBitmap16ToTiff(bitmap16);
    const explicitLzw = await convertBitmap16ToTiff(bitmap16, { compression: "lzw" });
    expect(defaultComp.length).toBe(explicitLzw.length);
  }, 30000);

  it("supports deflate compression", async () => {
    const bitmap16 = makeGradientBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16, { compression: "deflate" });
    const meta = await sharp(tiffBuffer).metadata();
    expect(meta.format).toBe("tiff");
    expect(meta.depth).toBe("ushort");
  }, 30000);

  it("supports no compression", async () => {
    const bitmap16 = makeGradientBitmap16();
    const compressed = await convertBitmap16ToTiff(bitmap16, { compression: "lzw" });
    const uncompressed = await convertBitmap16ToTiff(bitmap16, { compression: "none" });
    // Uncompressed should be larger
    expect(uncompressed.length).toBeGreaterThan(compressed.length);
  }, 30000);

  it("uncompressed TIFF is lossless", async () => {
    const bitmap16 = makeSmallBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16, { compression: "none" });
    const readBack = await readTiff16Pixels(tiffBuffer, 3, 3);
    expect(Array.from(readBack)).toEqual(Array.from(bitmap16.pixels));
  });

  it("deflate TIFF is lossless", async () => {
    const bitmap16 = makeSmallBitmap16();
    const tiffBuffer = await convertBitmap16ToTiff(bitmap16, { compression: "deflate" });
    const readBack = await readTiff16Pixels(tiffBuffer, 3, 3);
    expect(Array.from(readBack)).toEqual(Array.from(bitmap16.pixels));
  });

  it("writes to disk when outputPath given", async () => {
    const out = "/tmp/test_bitmap16_to_tiff.tiff";
    const bitmap16 = makeGradientBitmap16();
    await convertBitmap16ToTiff(bitmap16, undefined, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("tiff");
    unlinkSync(out);
  }, 30000);

  it("returns buffer even when writing to disk", async () => {
    const out = "/tmp/test_bitmap16_to_tiff_ret.tiff";
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToTiff(bitmap16, undefined, out);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    unlinkSync(out);
  });
});

// ==================== convertBitmap16ToWebp ====================

describe("convertBitmap16ToWebp", () => {
  it("produces valid WebP buffer from gradient", async () => {
    const bitmap16 = makeGradientBitmap16();
    const webpBuffer = await convertBitmap16ToWebp(bitmap16);
    expect(Buffer.isBuffer(webpBuffer)).toBe(true);
    const meta = await sharp(webpBuffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  }, 30000);

  it("produces valid WebP from checkerboard", async () => {
    const bitmap16 = makeCheckerboardBitmap16();
    const webpBuffer = await convertBitmap16ToWebp(bitmap16);
    const meta = await sharp(webpBuffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
  }, 30000);

  it("produces valid WebP from small image", async () => {
    const bitmap16 = makeSmallBitmap16();
    const webpBuffer = await convertBitmap16ToWebp(bitmap16);
    const meta = await sharp(webpBuffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(3);
    expect(meta.height).toBe(3);
  });

  it("lossless WebP round-trips correctly at 8-bit", async () => {
    const bitmap16 = makeGradientBitmap16();
    const webpBuffer = await convertBitmap16ToWebp(bitmap16);

    const { data } = await readGrayscale8(webpBuffer);
    const expected8 = to8bit(bitmap16.pixels, false);

    let mismatches = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== expected8[i]) mismatches++;
    }
    // Lossless WebP should be pixel-perfect at 8-bit
    expect(mismatches).toBe(0);
  }, 30000);

  it("writes to disk when outputPath given", async () => {
    const out = "/tmp/test_bitmap16_to_webp.webp";
    const bitmap16 = makeGradientBitmap16();
    await convertBitmap16ToWebp(bitmap16, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    unlinkSync(out);
  }, 30000);

  it("returns buffer even when writing to disk", async () => {
    const out = "/tmp/test_bitmap16_to_webp_ret.webp";
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToWebp(bitmap16, out);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    unlinkSync(out);
  });

  it("returns buffer when no outputPath", async () => {
    const bitmap16 = makeSmallBitmap16();
    const buffer = await convertBitmap16ToWebp(bitmap16);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

// ==================== Cross-format consistency ====================

describe("cross-format consistency", () => {
  it("all formats produce same 8-bit pixels from same source", async () => {
    const bitmap16 = makeGradientBitmap16();
    const expected8 = to8bit(bitmap16.pixels, false);

    const [png8, tiff8, webp] = await Promise.all([
      convertBitmap16ToPng(bitmap16, { bitdepth: 8 }),
      convertBitmap16ToTiff(bitmap16, { bitdepth: 8 }),
      convertBitmap16ToWebp(bitmap16),
    ]);

    const pngData = await readGrayscale8(png8);
    const tiffData = await readGrayscale8(tiff8);
    const webpData = await readGrayscale8(webp);

    // All lossless 8-bit formats should match to8bit exactly
    for (let i = 0; i < expected8.length; i++) {
      expect(pngData.data[i]).toBe(expected8[i]);
      expect(tiffData.data[i]).toBe(expected8[i]);
      expect(webpData.data[i]).toBe(expected8[i]);
    }
  }, 30000);

  it("16-bit PNG and 16-bit TIFF produce identical pixels", async () => {
    const bitmap16 = makeGradientBitmap16();

    const [pngBuf, tiffBuf] = await Promise.all([
      convertBitmap16ToPng(bitmap16),
      convertBitmap16ToTiff(bitmap16),
    ]);

    const pngPixels = readPng16Pixels(pngBuf).pixels;
    const tiffPixels = await readTiff16Pixels(tiffBuf, bitmap16.width, bitmap16.height);

    for (let i = 0; i < bitmap16.pixels.length; i++) {
      expect(pngPixels[i]).toBe(tiffPixels[i]);
    }
  }, 30000);
});

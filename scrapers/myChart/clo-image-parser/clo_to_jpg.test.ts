import { describe, it, expect } from "bun:test";
import { existsSync, unlinkSync } from "fs";
import sharp from "sharp";
import {
  AMF3Reader,
  parsePixelHeader,
  parseWrapper,
  tileKey,
  parseTileKey,
  computeWaveletLevels,
  zigzagDecode,
  to8bit,
  applyVoiLut,
  convertCloToBitmap,
} from "./clo_to_bitmap";
import { convertBitmapToJpg, convertBitmapToWebp, convertCloToJpg } from "./clo_to_jpg";
import { encodePixelFile, encodeWrapperFile } from "./generate_clo";
import type { Bitmap } from "./clo_to_bitmap";

// ==================== AMF3Reader ====================

describe("AMF3Reader", () => {
  it("reads u8", () => {
    const reader = new AMF3Reader(Buffer.from([0x42]));
    expect(reader.readU8()).toBe(0x42);
  });

  it("reads u29 single byte", () => {
    const reader = new AMF3Reader(Buffer.from([0x05]));
    expect(reader.readU29()).toBe(5);
  });

  it("reads u29 two bytes", () => {
    const reader = new AMF3Reader(Buffer.from([0x81, 0x00]));
    expect(reader.readU29()).toBe(128);
  });

  it("reads u29 four bytes", () => {
    const reader = new AMF3Reader(Buffer.from([0x80, 0x80, 0x80, 0x01]));
    expect(reader.readU29()).toBe(1);
  });

  it("reads AMF3 integer value", () => {
    const reader = new AMF3Reader(Buffer.from([0x04, 0x2a]));
    expect(reader.readValue()).toBe(42);
  });

  it("reads AMF3 boolean values", () => {
    const reader = new AMF3Reader(Buffer.from([0x02, 0x03]));
    expect(reader.readValue()).toBe(false);
    expect(reader.readValue()).toBe(true);
  });

  it("reads AMF3 null/undefined", () => {
    const reader = new AMF3Reader(Buffer.from([0x00, 0x01]));
    expect(reader.readValue()).toBeNull();
    expect(reader.readValue()).toBeNull();
  });

  it("reads AMF3 double value", () => {
    const buf = Buffer.alloc(9);
    buf[0] = 0x05;
    buf.writeDoubleBE(3.14, 1);
    const reader = new AMF3Reader(buf);
    expect(reader.readValue()).toBeCloseTo(3.14);
  });

  it("reads AMF3 inline string", () => {
    const str = "hello";
    const buf = Buffer.alloc(1 + 1 + str.length);
    buf[0] = 0x06;
    buf[1] = (str.length << 1) | 1; // inline string
    buf.write(str, 2);
    const reader = new AMF3Reader(buf);
    expect(reader.readValue()).toBe("hello");
  });

  it("reads AMF3 string references", () => {
    const buf = Buffer.from([
      0x06, 0x05, 0x68, 0x69, // string "hi" (len=2, inline)
      0x06, 0x00,             // string ref index 0
    ]);
    const reader = new AMF3Reader(buf);
    expect(reader.readValue()).toBe("hi");
    expect(reader.readValue()).toBe("hi");
  });

  it("reads AMF3 empty string", () => {
    const reader = new AMF3Reader(Buffer.from([0x06, 0x01]));
    expect(reader.readValue()).toBe("");
  });

  it("reads AMF3 byte array", () => {
    const buf = Buffer.from([0x0c, 0x07, 0xaa, 0xbb, 0xcc]);
    const reader = new AMF3Reader(buf);
    const result = reader.readValue() as Buffer;
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0]).toBe(0xaa);
    expect(result[1]).toBe(0xbb);
    expect(result[2]).toBe(0xcc);
  });

  it("returns null for depth > 20", () => {
    const reader = new AMF3Reader(Buffer.from([0x04, 0x01]));
    expect(reader.readValue(21)).toBeNull();
  });
});

// ==================== parsePixelHeader ====================

describe("parsePixelHeader", () => {
  it("rejects non-CLOCLHAAR data", () => {
    expect(() => parsePixelHeader(Buffer.alloc(100))).toThrow("Not a CLOCLHAAR pixel file");
  });

  it("rejects missing 35fa marker", () => {
    const buf = Buffer.alloc(100);
    buf.write("CLOCLHAAR###", 0);
    buf[16] = 0x00;
    expect(() => parsePixelHeader(buf)).toThrow("Expected 35fa marker");
  });

  it("rejects zero dimensions", () => {
    const buf = Buffer.alloc(100);
    buf.write("CLOCLHAAR###", 0);
    buf[16] = 0x35;
    buf[17] = 0xfa;
    buf.writeUInt32LE(0, 24);
    buf.writeUInt32LE(100, 28);
    expect(() => parsePixelHeader(buf)).toThrow("Invalid dimensions");
  });

  it("rejects oversized dimensions", () => {
    const buf = Buffer.alloc(100);
    buf.write("CLOCLHAAR###", 0);
    buf[16] = 0x35;
    buf[17] = 0xfa;
    buf.writeUInt32LE(100000, 24);
    buf.writeUInt32LE(100, 28);
    expect(() => parsePixelHeader(buf)).toThrow("Invalid dimensions");
  });

  it("parses valid header", () => {
    const buf = Buffer.alloc(100);
    buf.write("CLOCLHAAR###", 0);
    buf[16] = 0x35;
    buf[17] = 0xfa;
    buf.writeUInt32LE(2337, 24);
    buf.writeUInt32LE(2259, 28);
    expect(parsePixelHeader(buf)).toEqual({ width: 2337, height: 2259 });
  });

});

// ==================== tileKey / parseTileKey ====================

describe("tileKey / parseTileKey", () => {
  it("round-trips through tileKey and parseTileKey", () => {
    expect(parseTileKey(tileKey(0, 1, 2, 3))).toEqual([0, 1, 2, 3]);
    expect(parseTileKey(tileKey(-1, 0, 0, 65536))).toEqual([-1, 0, 0, 65536]);
  });
});

// ==================== computeWaveletLevels ====================

describe("computeWaveletLevels", () => {
  it("returns correct levels for R_INT (2337x2259)", () => {
    const levels = computeWaveletLevels(2337, 2259);
    expect(levels.length).toBe(4);
    expect(levels[0]).toEqual([142, 147]);
    expect(levels[3]).toEqual([1130, 1169]);
  });

  it("returns correct levels for R_GRID (1803x1345)", () => {
    const levels = computeWaveletLevels(1803, 1345);
    expect(levels.length).toBe(3);
    expect(levels[0]).toEqual([169, 226]);
    expect(levels[2]).toEqual([673, 902]);
  });

  it("returns empty for small image", () => {
    const levels = computeWaveletLevels(100, 100);
    expect(levels.length).toBe(0);
  });

  it("handles one dimension large, one small", () => {
    const levels = computeWaveletLevels(512, 100);
    expect(levels.length).toBe(1);
    expect(levels[0]).toEqual([50, 256]);
  });

  it("uses numDetailGroups when provided", () => {
    const levels = computeWaveletLevels(1663, 1802, 4);
    expect(levels.length).toBe(4);
    expect(levels[0]).toEqual([113, 104]);
    expect(levels[3]).toEqual([901, 832]);
  });

  it("falls back to dimension-based when numDetailGroups not provided", () => {
    const levels = computeWaveletLevels(1663, 1802);
    expect(levels.length).toBe(3);
    expect(levels[0]).toEqual([226, 208]);
  });
});

// ==================== zigzagDecode ====================

describe("zigzagDecode", () => {
  it("decodes known values", () => {
    const input = new Int32Array([0, 1, 2, 3, 4, 5]);
    const result = zigzagDecode(input);
    expect(Array.from(result)).toEqual([0, -1, 1, -2, 2, -3]);
  });

  it("handles large values", () => {
    const input = new Int32Array([100, 101, 65534, 65535]);
    const result = zigzagDecode(input);
    expect(result[0]).toBe(50);
    expect(result[1]).toBe(-51);
    expect(result[2]).toBe(32767);
    expect(result[3]).toBe(-32768);
  });

  it("handles empty input", () => {
    expect(zigzagDecode(new Int32Array(0)).length).toBe(0);
  });
});

// ==================== to8bit ====================

describe("to8bit", () => {
  it("scales to 0-255 range", () => {
    const input = new Uint16Array([0, 500, 1000]);
    const result = to8bit(input, false);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(128);
    expect(result[2]).toBe(255);
  });

  it("inverts when MONOCHROME1", () => {
    const input = new Uint16Array([0, 500, 1000]);
    const result = to8bit(input, true);
    expect(result[0]).toBe(255);
    expect(result[1]).toBe(127);
    expect(result[2]).toBe(0);
  });

  it("handles all-zero input", () => {
    const input = new Uint16Array([0, 0, 0]);
    const result = to8bit(input, false);
    expect(Array.from(result)).toEqual([0, 0, 0]);
  });

  it("handles single-value input", () => {
    const input = new Uint16Array([42]);
    const result = to8bit(input, false);
    expect(result[0]).toBe(255);
  });
});

// ==================== applyVoiLut ====================

describe("applyVoiLut", () => {
  it("applies VOI LUT lookup", () => {
    const lut = new Uint16Array([100, 200, 300, 400, 500]);
    const metadata = { voi_lut: lut, voi_lut_start: 10 };
    const img = new Uint16Array([10, 11, 12, 13, 14]);
    const result = applyVoiLut(img, 1, 5, metadata);
    expect(Array.from(result)).toEqual([100, 200, 300, 400, 500]);
  });

  it("clamps VOI LUT indices", () => {
    const lut = new Uint16Array([100, 200, 300]);
    const metadata = { voi_lut: lut, voi_lut_start: 10 };
    const img = new Uint16Array([5, 10, 12, 50]);
    const result = applyVoiLut(img, 1, 4, metadata);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(100);
    expect(result[2]).toBe(300);
    expect(result[3]).toBe(300);
  });

  it("applies window center/width fallback", () => {
    const metadata = { window_center: 100, window_width: 200 };
    const img = new Uint16Array([0, 100, 200]);
    const result = applyVoiLut(img, 1, 3, metadata);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(32768);
    expect(result[2]).toBe(65535);
  });

  it("returns input unchanged when no LUT or window", () => {
    const img = new Uint16Array([10, 20, 30]);
    const result = applyVoiLut(img, 1, 3, {});
    expect(result).toBe(img);
  });
});

// ==================== parseWrapper ====================

describe("parseWrapper", () => {
  it("rejects non-CLOHEADERZ01 file", () => {
    const tmpPath = "/tmp/test_bad_wrapper.clo";
    require("fs").writeFileSync(tmpPath, Buffer.from("NOTCLOHEADER"));
    expect(() => parseWrapper(tmpPath)).toThrow("Not a CLOHEADERZ01");
    unlinkSync(tmpPath);
  });

});

// ==================== convertBitmapToJpg ====================

describe("convertBitmapToJpg", () => {
  it("produces valid JPEG buffer from synthetic bitmap", async () => {
    const bitmap: Bitmap = {
      pixels: new Uint8Array(100 * 100).fill(128),
      width: 100,
      height: 100,
    };
    const jpgBuffer = await convertBitmapToJpg(bitmap);
    expect(Buffer.isBuffer(jpgBuffer)).toBe(true);
    const meta = await sharp(jpgBuffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it("writes JPEG to disk when outputPath given", async () => {
    const out = "/tmp/test_bitmap_to_jpg.jpg";
    const bitmap: Bitmap = {
      pixels: new Uint8Array(50 * 50).fill(200),
      width: 50,
      height: 50,
    };
    const buffer = await convertBitmapToJpg(bitmap, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(50);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    unlinkSync(out);
  });
});

// ==================== convertBitmapToWebp ====================

describe("convertBitmapToWebp", () => {
  it("produces valid lossless WebP from synthetic bitmap", async () => {
    const bitmap: Bitmap = {
      pixels: new Uint8Array(64 * 64),
      width: 64,
      height: 64,
    };
    // Fill with a gradient
    for (let i = 0; i < 64 * 64; i++) {
      bitmap.pixels[i] = i % 256;
    }
    const webpBuffer = await convertBitmapToWebp(bitmap);
    expect(Buffer.isBuffer(webpBuffer)).toBe(true);
    const meta = await sharp(webpBuffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
  });

  it("is truly lossless (round-trips perfectly)", async () => {
    const bitmap: Bitmap = {
      pixels: new Uint8Array(32 * 32),
      width: 32,
      height: 32,
    };
    for (let i = 0; i < 32 * 32; i++) {
      bitmap.pixels[i] = (i * 7) % 256;
    }
    const webpBuffer = await convertBitmapToWebp(bitmap);
    const { data, info } = await sharp(webpBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = new Uint8Array(data);

    expect(info.width).toBe(bitmap.width);
    expect(info.height).toBe(bitmap.height);

    let mismatches = 0;
    for (let i = 0; i < bitmap.pixels.length; i++) {
      if (decoded[i] !== bitmap.pixels[i]) mismatches++;
    }
    expect(mismatches).toBe(0);
  });
});

// ==================== Synthetic CLO encode → decode round-trip ====================

describe("synthetic CLO round-trip", () => {
  function makeClo(img: Uint16Array, w: number, h: number) {
    const pixelData = encodePixelFile(img, w, h);
    const wrapperData = encodeWrapperFile({
      photometricInterpretation: "MONOCHROME2",
      bitsStored: 16,
      windowCenter: 32768,
      windowWidth: 65536,
    });
    return { pixelBuffer: Buffer.from(pixelData), wrapperBuffer: Buffer.from(wrapperData) };
  }

  it("encodes and decodes a 512x512 gradient image", () => {
    const w = 512, h = 512;
    const img = new Uint16Array(w * h);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        img[r * w + c] = ((r + c) * 50) & 0xffff;
      }
    }
    const { pixelBuffer, wrapperBuffer } = makeClo(img, w, h);
    const bitmap = convertCloToBitmap(pixelBuffer, wrapperBuffer);
    expect(bitmap.width).toBe(w);
    expect(bitmap.height).toBe(h);
    expect(bitmap.pixels.length).toBe(w * h);
    expect(bitmap.pixels).toBeInstanceOf(Uint8Array);
    // All pixels should be valid 0-255
    for (let i = 0; i < bitmap.pixels.length; i++) {
      expect(bitmap.pixels[i]).toBeGreaterThanOrEqual(0);
      expect(bitmap.pixels[i]).toBeLessThanOrEqual(255);
    }
  }, 30000);

  it("encodes and decodes to JPEG via convertCloToJpg", async () => {
    const w = 512, h = 512;
    const img = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) {
      img[i] = (i * 13) & 0xffff;
    }
    const { pixelBuffer, wrapperBuffer } = makeClo(img, w, h);
    const result = await convertCloToJpg({ pixelData: pixelBuffer, wrapperData: wrapperBuffer });
    expect(Buffer.isBuffer(result)).toBe(true);
    const meta = await sharp(result as Buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(w);
    expect(meta.height).toBe(h);
  }, 30000);

  it("accepts Buffer inputs without wrapper", () => {
    const w = 512, h = 512;
    const img = new Uint16Array(w * h).fill(1000);
    const { pixelBuffer } = makeClo(img, w, h);
    const bitmap = convertCloToBitmap(pixelBuffer);
    expect(bitmap.width).toBe(w);
    expect(bitmap.height).toBe(h);
  }, 30000);

  it("handles odd dimensions", () => {
    const w = 511, h = 513;
    const img = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) {
      img[i] = (i * 3) & 0xffff;
    }
    const { pixelBuffer, wrapperBuffer } = makeClo(img, w, h);
    const bitmap = convertCloToBitmap(pixelBuffer, wrapperBuffer);
    expect(bitmap.width).toBe(w);
    expect(bitmap.height).toBe(h);
  }, 30000);

  it("pixel values span full 0-255 range for high-contrast input", () => {
    const w = 512, h = 512;
    const img = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) {
      img[i] = i % 2 === 0 ? 0 : 65535;
    }
    const { pixelBuffer, wrapperBuffer } = makeClo(img, w, h);
    const bitmap = convertCloToBitmap(pixelBuffer, wrapperBuffer);
    let min = 255, max = 0;
    for (let i = 0; i < bitmap.pixels.length; i++) {
      if (bitmap.pixels[i] < min) min = bitmap.pixels[i];
      if (bitmap.pixels[i] > max) max = bitmap.pixels[i];
    }
    expect(min).toBe(0);
    expect(max).toBe(255);
  }, 30000);
});

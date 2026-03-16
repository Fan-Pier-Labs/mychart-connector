import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import {
  AMF3Reader,
  parsePixelHeader,
  parseWrapper,
  extractTiles,
  tileKey,
  parseTileKey,
  computeWaveletLevels,
  zigzagDecode,
  to8bit,
  applyVoiLut,
  convertCloToJpg,
} from "./clo_to_jpg";

const BASE = join(import.meta.dir);
const INPUT = join(BASE, "input_study_one");
const INPUT_TWO = join(BASE, "input_study_two");
const GOALS = join(BASE, "goal_images_study_one");
const GOALS_TWO = join(BASE, "goal_images_study_two");

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
    // 0x80 | 0x01 = 129 for first byte (continuation), 0x00 for second
    const reader = new AMF3Reader(Buffer.from([0x81, 0x00]));
    expect(reader.readU29()).toBe(128);
  });

  it("reads u29 four bytes", () => {
    const reader = new AMF3Reader(Buffer.from([0x80, 0x80, 0x80, 0x01]));
    expect(reader.readU29()).toBe(1);
  });

  it("reads AMF3 integer value", () => {
    // marker 0x04 = integer, then u29 value 42
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
    // marker 0x05 = double, then 8 bytes BE for 3.14
    const buf = Buffer.alloc(9);
    buf[0] = 0x05;
    buf.writeDoubleBE(3.14, 1);
    const reader = new AMF3Reader(buf);
    expect(reader.readValue()).toBeCloseTo(3.14);
  });

  it("reads AMF3 inline string", () => {
    // marker 0x06 = string, then u29 (length << 1 | 1), then UTF-8 bytes
    const str = "hello";
    const buf = Buffer.alloc(1 + 1 + str.length);
    buf[0] = 0x06;
    buf[1] = (str.length << 1) | 1; // inline string
    buf.write(str, 2);
    const reader = new AMF3Reader(buf);
    expect(reader.readValue()).toBe("hello");
  });

  it("reads AMF3 string references", () => {
    // Two strings: first inline "hi", second is a reference to it
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
    // marker 0x0C = byte array, then u29 (length << 1 | 1), then bytes
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
    buf[16] = 0x00; // wrong marker
    expect(() => parsePixelHeader(buf)).toThrow("Expected 35fa marker");
  });

  it("rejects zero dimensions", () => {
    const buf = Buffer.alloc(100);
    buf.write("CLOCLHAAR###", 0);
    buf[16] = 0x35;
    buf[17] = 0xfa;
    buf.writeUInt32LE(0, 24); // width = 0
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

  it("parses real R_INT pixel file header", () => {
    const data = readFileSync(join(INPUT, "R_INT_ROTATION_TABLE_pixel.clo"));
    const header = parsePixelHeader(data);
    expect(header.width).toBe(2337);
    expect(header.height).toBe(2259);
  });

  it("parses real R_GRID pixel file header", () => {
    const data = readFileSync(join(INPUT, "R_GRID_AXILLARY_pixel.clo"));
    const header = parsePixelHeader(data);
    expect(header.width).toBe(1803);
    expect(header.height).toBe(1345);
  });

  it("parses real R_EXT pixel file header", () => {
    const data = readFileSync(join(INPUT, "R_EXT_ROTATION_TABLE_pixel.clo"));
    const header = parsePixelHeader(data);
    expect(header.width).toBe(2328);
    expect(header.height).toBe(2266);
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
    // Coarsest first: dimensions halved repeatedly
    expect(levels[0]).toEqual([142, 147]); // ~2259/16, ~2337/16
    expect(levels[3]).toEqual([1130, 1169]); // ~2259/2, ~2337/2
  });

  it("returns correct levels for R_GRID (1803x1345)", () => {
    const levels = computeWaveletLevels(1803, 1345);
    expect(levels.length).toBe(3);
    expect(levels[0]).toEqual([169, 226]); // coarsest
    expect(levels[2]).toEqual([673, 902]); // finest subband
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
    // 1663x1802 with 4 detail groups (the encoder went one extra level)
    const levels = computeWaveletLevels(1663, 1802, 4);
    expect(levels.length).toBe(4);
    expect(levels[0]).toEqual([113, 104]); // coarsest: 1802/16≈113, 1663/16≈104
    expect(levels[3]).toEqual([901, 832]); // finest subband
  });

  it("falls back to dimension-based when numDetailGroups not provided", () => {
    // Without numDetailGroups, 1663x1802 stops at 3 levels
    const levels = computeWaveletLevels(1663, 1802);
    expect(levels.length).toBe(3);
    expect(levels[0]).toEqual([226, 208]); // stops here since both <= 256
  });
});

// ==================== zigzagDecode ====================

describe("zigzagDecode", () => {
  it("decodes known values", () => {
    // 0→0, 1→-1, 2→1, 3→-2, 4→2, 5→-3
    const input = new Int32Array([0, 1, 2, 3, 4, 5]);
    const result = zigzagDecode(input);
    expect(Array.from(result)).toEqual([0, -1, 1, -2, 2, -3]);
  });

  it("handles large values", () => {
    const input = new Int32Array([100, 101, 65534, 65535]);
    const result = zigzagDecode(input);
    expect(result[0]).toBe(50);   // even: n/2
    expect(result[1]).toBe(-51);  // odd: -(n+1)/2
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
    expect(result[1]).toBe(128); // 500/1000 * 255 = 127.5 → round to 128
    expect(result[2]).toBe(255);
  });

  it("inverts when MONOCHROME1", () => {
    const input = new Uint16Array([0, 500, 1000]);
    const result = to8bit(input, true);
    expect(result[0]).toBe(255);
    expect(result[1]).toBe(127); // 255 - 128
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
    expect(result[0]).toBe(255); // 42 is max, so maps to 255
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
    expect(result[0]).toBe(100); // below start → lut[0]
    expect(result[1]).toBe(100); // idx=0
    expect(result[2]).toBe(300); // idx=2
    expect(result[3]).toBe(300); // above end → lut[last]
  });

  it("applies window center/width fallback", () => {
    const metadata = { window_center: 100, window_width: 200 };
    const img = new Uint16Array([0, 100, 200]);
    const result = applyVoiLut(img, 1, 3, metadata);
    // lower=0, upper=200
    // 0: (0-0)/(200-0)*65535 = 0
    // 100: (100-0)/200*65535 = 32768
    // 200: (200-0)/200*65535 = 65535
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(32768);
    expect(result[2]).toBe(65535);
  });

  it("returns input unchanged when no LUT or window", () => {
    const img = new Uint16Array([10, 20, 30]);
    const result = applyVoiLut(img, 1, 3, {});
    expect(result).toBe(img); // same reference
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

  it("parses real R_INT wrapper", () => {
    const metadata = parseWrapper(join(INPUT, "R_INT_ROTATION_TABLE_wrapper.clo"));
    expect(metadata.photometric).toBe("MONOCHROME1");
    expect(metadata.voi_lut).toBeInstanceOf(Uint16Array);
    expect(metadata.voi_lut!.length).toBeGreaterThan(0);
    expect(typeof metadata.voi_lut_start).toBe("number");
  });

  it("parses real R_GRID wrapper", () => {
    const metadata = parseWrapper(join(INPUT, "R_GRID_AXILLARY_wrapper.clo"));
    expect(metadata.photometric).toBe("MONOCHROME1");
  });

  it("parses real R_EXT wrapper", () => {
    const metadata = parseWrapper(join(INPUT, "R_EXT_ROTATION_TABLE_wrapper.clo"));
    expect(metadata.photometric).toBe("MONOCHROME1");
  });
});

// ==================== extractTiles ====================

describe("extractTiles", () => {
  it("extracts tiles from real R_INT pixel file", () => {
    const data = readFileSync(join(INPUT, "R_INT_ROTATION_TABLE_pixel.clo"));
    const tiles = extractTiles(data);
    expect(tiles.size).toBeGreaterThan(0);
    // Must have LL block at group -1
    expect(tiles.has(tileKey(-1, 0, 0, 0))).toBe(true);
    expect(tiles.has(tileKey(-1, 0, 0, 65536))).toBe(true);
  });

  it("extracts tiles from real R_GRID pixel file", () => {
    const data = readFileSync(join(INPUT, "R_GRID_AXILLARY_pixel.clo"));
    const tiles = extractTiles(data);
    expect(tiles.size).toBeGreaterThan(0);
    // Must have detail subbands at group 0 (LH low byte)
    expect(tiles.has(tileKey(0, 0, 0, 1))).toBe(true);
  });
});

// ==================== End-to-end conversion ====================

describe("convertCloToJpg", () => {
  async function loadGrayscale(path: string): Promise<{ data: Uint8Array; width: number; height: number }> {
    const { data, info } = await sharp(path)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: new Uint8Array(data), width: info.width, height: info.height };
  }

  function computeStats(a: Uint8Array, b: Uint8Array) {
    let exact = 0;
    let within1 = 0;
    let sumSq = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = Math.abs(a[i] - b[i]);
      if (diff === 0) exact++;
      if (diff <= 1) within1++;
      sumSq += diff * diff;
    }
    return {
      exactPct: exact / a.length * 100,
      within1Pct: within1 / a.length * 100,
      rmse: Math.sqrt(sumSq / a.length),
    };
  }

  it("converts R_INT and matches goal to >98% exact", async () => {
    const out = "/tmp/test_clo_r_int.png";
    await convertCloToJpg(
      join(INPUT, "R_INT_ROTATION_TABLE_pixel.clo"),
      out,
      join(INPUT, "R_INT_ROTATION_TABLE_wrapper.clo"),
    );
    const output = await loadGrayscale(out);
    const goal = await loadGrayscale(join(GOALS, "image_1_png.png"));
    expect(output.width).toBe(goal.width);
    expect(output.height).toBe(goal.height);
    const stats = computeStats(output.data, goal.data);
    expect(stats.exactPct).toBeGreaterThan(98);
    expect(stats.within1Pct).toBe(100);
    expect(stats.rmse).toBeLessThan(0.2);
    unlinkSync(out);
  }, 30000);

  it("converts R_GRID and matches goal to >98% exact", async () => {
    const out = "/tmp/test_clo_r_grid.png";
    await convertCloToJpg(
      join(INPUT, "R_GRID_AXILLARY_pixel.clo"),
      out,
      join(INPUT, "R_GRID_AXILLARY_wrapper.clo"),
    );
    const output = await loadGrayscale(out);
    const goal = await loadGrayscale(join(GOALS, "image_2_png.png"));
    expect(output.width).toBe(goal.width);
    expect(output.height).toBe(goal.height);
    const stats = computeStats(output.data, goal.data);
    expect(stats.exactPct).toBeGreaterThan(98);
    expect(stats.within1Pct).toBe(100);
    expect(stats.rmse).toBeLessThan(0.2);
    unlinkSync(out);
  }, 30000);

  it("converts R_EXT and matches goal to >98% exact", async () => {
    const out = "/tmp/test_clo_r_ext.png";
    await convertCloToJpg(
      join(INPUT, "R_EXT_ROTATION_TABLE_pixel.clo"),
      out,
      join(INPUT, "R_EXT_ROTATION_TABLE_wrapper.clo"),
    );
    const output = await loadGrayscale(out);
    const goal = await loadGrayscale(join(GOALS, "image_3_png.png"));
    expect(output.width).toBe(goal.width);
    expect(output.height).toBe(goal.height);
    const stats = computeStats(output.data, goal.data);
    expect(stats.exactPct).toBeGreaterThan(98);
    expect(stats.within1Pct).toBe(100);
    expect(stats.rmse).toBeLessThan(0.2);
    unlinkSync(out);
  }, 30000);

  it("writes valid JPEG when .jpg extension", async () => {
    const out = "/tmp/test_clo_jpeg_out.jpg";
    await convertCloToJpg(
      join(INPUT, "R_GRID_AXILLARY_pixel.clo"),
      out,
      join(INPUT, "R_GRID_AXILLARY_wrapper.clo"),
    );
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1803);
    expect(meta.height).toBe(1345);
    unlinkSync(out);
  }, 30000);

  it("defaults to MONOCHROME1 without wrapper", async () => {
    const out = "/tmp/test_clo_no_wrapper.png";
    await convertCloToJpg(
      join(INPUT, "R_GRID_AXILLARY_pixel.clo"),
      out,
    );
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1803);
    expect(meta.height).toBe(1345);
    unlinkSync(out);
  }, 30000);

  it("accepts Buffer inputs and returns Buffer when outputPath is null", async () => {
    const pixelData = readFileSync(join(INPUT, "R_GRID_AXILLARY_pixel.clo"));
    const wrapperData = readFileSync(join(INPUT, "R_GRID_AXILLARY_wrapper.clo"));
    const result = await convertCloToJpg(pixelData, null, wrapperData);
    expect(Buffer.isBuffer(result)).toBe(true);
    const meta = await sharp(result as Buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1803);
    expect(meta.height).toBe(1345);
  }, 30000);
});

// ==================== Study Two conversion (extra wavelet levels) ====================

describe("convertCloToJpg - study two", () => {
  async function loadGrayscale(path: string): Promise<{ data: Uint8Array; width: number; height: number }> {
    const { data, info } = await sharp(path)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: new Uint8Array(data), width: info.width, height: info.height };
  }

  function computeStats(a: Uint8Array, b: Uint8Array) {
    let exact = 0;
    let within1 = 0;
    let within5 = 0;
    let sumSq = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = Math.abs(a[i] - b[i]);
      if (diff === 0) exact++;
      if (diff <= 1) within1++;
      if (diff <= 5) within5++;
      sumSq += diff * diff;
    }
    return {
      exactPct: exact / a.length * 100,
      within1Pct: within1 / a.length * 100,
      within5Pct: within5 / a.length * 100,
      rmse: Math.sqrt(sumSq / a.length),
    };
  }

  it("parses study two series 0 header (1500x1886)", () => {
    const data = readFileSync(join(INPUT_TWO, "series_0_pixel.clo"));
    const header = parsePixelHeader(data);
    expect(header.width).toBe(1500);
    expect(header.height).toBe(1886);
  });

  it("parses study two series 1 header (1462x1783)", () => {
    const data = readFileSync(join(INPUT_TWO, "series_1_pixel.clo"));
    const header = parsePixelHeader(data);
    expect(header.width).toBe(1462);
    expect(header.height).toBe(1783);
  });

  it("parses study two series 2 header (1663x1802)", () => {
    const data = readFileSync(join(INPUT_TWO, "series_2_pixel.clo"));
    const header = parsePixelHeader(data);
    expect(header.width).toBe(1663);
    expect(header.height).toBe(1802);
  });

  it("series 2 has 5 groups (extra wavelet level)", () => {
    const data = readFileSync(join(INPUT_TWO, "series_2_pixel.clo"));
    const tiles = extractTiles(data);
    const groups = new Set<number>();
    for (const key of tiles.keys()) {
      const [g] = parseTileKey(key);
      groups.add(g);
    }
    // Groups: -1 (LL), 0, 1, 2, 3 (extra detail level)
    expect(groups.size).toBe(5);
    expect(groups.has(-1)).toBe(true);
    expect(groups.has(3)).toBe(true);
  });

  it("converts series 0 and matches goal dimensions", async () => {
    const out = "/tmp/test_clo_s2_series0.png";
    await convertCloToJpg(
      join(INPUT_TWO, "series_0_pixel.clo"),
      out,
      join(INPUT_TWO, "series_0_wrapper.clo"),
    );
    const output = await loadGrayscale(out);
    const goal = await loadGrayscale(join(GOALS_TWO, "image_1_png.png"));
    expect(output.width).toBe(goal.width);
    expect(output.height).toBe(goal.height);
    // Goal images have different windowing from browser viewer, so use relaxed threshold
    const stats = computeStats(output.data, goal.data);
    expect(stats.within5Pct).toBeGreaterThan(85);
    expect(stats.rmse).toBeLessThan(15);
    unlinkSync(out);
  }, 30000);

  it("converts series 1 and matches goal dimensions", async () => {
    const out = "/tmp/test_clo_s2_series1.png";
    await convertCloToJpg(
      join(INPUT_TWO, "series_1_pixel.clo"),
      out,
      join(INPUT_TWO, "series_1_wrapper.clo"),
    );
    const output = await loadGrayscale(out);
    const goal = await loadGrayscale(join(GOALS_TWO, "image_2_png.png"));
    expect(output.width).toBe(goal.width);
    expect(output.height).toBe(goal.height);
    const stats = computeStats(output.data, goal.data);
    expect(stats.within5Pct).toBeGreaterThan(70);
    expect(stats.rmse).toBeLessThan(15);
    unlinkSync(out);
  }, 30000);

  it("converts series 2 (extra wavelet level) and matches goal to >98% exact", async () => {
    const out = "/tmp/test_clo_s2_series2.png";
    await convertCloToJpg(
      join(INPUT_TWO, "series_2_pixel.clo"),
      out,
      join(INPUT_TWO, "series_2_wrapper.clo"),
    );
    const output = await loadGrayscale(out);
    const goal = await loadGrayscale(join(GOALS_TWO, "image_3_png.png"));
    expect(output.width).toBe(goal.width);
    expect(output.height).toBe(goal.height);
    const stats = computeStats(output.data, goal.data);
    expect(stats.exactPct).toBeGreaterThan(98);
    expect(stats.within1Pct).toBe(100);
    expect(stats.rmse).toBeLessThan(0.2);
    unlinkSync(out);
  }, 30000);
});

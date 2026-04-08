/**
 * Convert 16-bit grayscale bitmaps to PNG.
 *
 * Supports both 8-bit and 16-bit output. For 16-bit, uses a manual PNG
 * encoder to guarantee correct values without colorspace conversion.
 * For 8-bit, uses sharp's optimized pipeline.
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap16 } from "../clo_to_bitmap";
import { to8bit } from "../clo_to_bitmap";
import { encode16bitPng } from "./png16";

export interface PngOptions {
  /** Output bit depth: 8 or 16. Default: 16 */
  bitdepth?: 8 | 16;
  /** Compression level 0-9. Default: 6 */
  compressionLevel?: number;
}

export async function convertBitmap16ToPng(
  bitmap: Bitmap16,
  options?: PngOptions,
  outputPath?: string | null,
): Promise<Buffer> {
  const bitdepth = options?.bitdepth ?? 16;
  const compressionLevel = options?.compressionLevel ?? 6;

  let buffer: Buffer;
  if (bitdepth === 16) {
    // Manual 16-bit PNG encoder (sharp raw input doesn't support 16-bit)
    buffer = encode16bitPng(bitmap.pixels, bitmap.width, bitmap.height);
    if (compressionLevel !== 6) {
      // Re-encode with requested compression level via sharp
      buffer = await sharp(buffer).png({ compressionLevel }).toBuffer();
    }
  } else {
    const pixels8 = to8bit(bitmap.pixels, false);
    buffer = await sharp(Buffer.from(pixels8.buffer, pixels8.byteOffset, pixels8.byteLength), {
      raw: { width: bitmap.width, height: bitmap.height, channels: 1 },
    }).png({ compressionLevel }).toBuffer();
  }

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

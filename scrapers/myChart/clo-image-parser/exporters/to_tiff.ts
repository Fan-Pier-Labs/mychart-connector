/**
 * Convert 16-bit grayscale bitmaps to TIFF using sharp.
 *
 * Supports both 8-bit and 16-bit output. For 16-bit, uses grey16 colorspace
 * to preserve full precision. TIFF is the standard archival format for
 * medical imaging.
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap16 } from "../clo_to_bitmap";
import { to8bit } from "../clo_to_bitmap";
import { encode16bitPng } from "./png16";

export interface TiffOptions {
  /** Output bit depth: 8 or 16. Default: 16 */
  bitdepth?: 8 | 16;
  /** Compression: 'none', 'lzw', or 'deflate'. Default: 'lzw' */
  compression?: 'none' | 'lzw' | 'deflate';
}

export async function convertBitmap16ToTiff(
  bitmap: Bitmap16,
  options?: TiffOptions,
  outputPath?: string | null,
): Promise<Buffer> {
  const bitdepth = options?.bitdepth ?? 16;
  const compression = options?.compression ?? 'lzw';

  let buffer: Buffer;
  if (bitdepth === 16) {
    const png = encode16bitPng(bitmap.pixels, bitmap.width, bitmap.height);
    buffer = await sharp(png)
      .toColourspace('grey16')
      .tiff({ compression })
      .toBuffer();
  } else {
    const pixels8 = to8bit(bitmap.pixels, false);
    buffer = await sharp(Buffer.from(pixels8.buffer, pixels8.byteOffset, pixels8.byteLength), {
      raw: { width: bitmap.width, height: bitmap.height, channels: 1 },
    }).tiff({ compression }).toBuffer();
  }

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

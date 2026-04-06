/**
 * Convert 16-bit grayscale bitmaps to JPEG using sharp.
 *
 * JPEG is inherently 8-bit, so 16-bit input is downsampled internally.
 * Uses quality 100 (maximum JPEG quality) by default.
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap16 } from "../clo_to_bitmap";
import { encode16bitPng } from "./png16";

export interface JpgOptions {
  /** JPEG quality 1-100. Default: 100 */
  quality?: number;
}

export async function convertBitmap16ToJpg(
  bitmap: Bitmap16,
  options?: JpgOptions,
  outputPath?: string | null,
): Promise<Buffer> {
  const quality = options?.quality ?? 100;

  const png = encode16bitPng(bitmap.pixels, bitmap.width, bitmap.height);
  const buffer = await sharp(png).jpeg({ quality }).toBuffer();

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

/**
 * Convert 16-bit grayscale bitmaps to lossless WebP using sharp.
 *
 * WebP is limited to 8-bit per channel. For higher bit depths, use AVIF
 * or PNG instead.
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap16 } from "../clo_to_bitmap";
import { encode16bitPng } from "./png16";

export async function convertBitmap16ToWebp(
  bitmap: Bitmap16,
  outputPath?: string | null,
): Promise<Buffer> {
  const png = encode16bitPng(bitmap.pixels, bitmap.width, bitmap.height);
  const buffer = await sharp(png).webp({ lossless: true }).toBuffer();

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

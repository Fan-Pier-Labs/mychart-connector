/**
 * Convert raw grayscale bitmaps to lossless WebP using sharp.
 *
 * WebP lossless produces smaller files than PNG while being truly lossless.
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap } from "./clo_to_bitmap";

export async function convertBitmapToWebp(
  bitmap: Bitmap,
  outputPath?: string | null,
): Promise<Buffer> {
  const img = sharp(Buffer.from(bitmap.pixels.buffer), {
    raw: { width: bitmap.width, height: bitmap.height, channels: 1 },
  });

  const buffer = await img.webp({ lossless: true }).toBuffer();

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

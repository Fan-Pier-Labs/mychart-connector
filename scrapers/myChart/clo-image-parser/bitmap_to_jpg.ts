/**
 * Convert raw grayscale bitmaps to JPEG using sharp.
 *
 * Uses quality 100 (maximum JPEG quality) by default.
 * Note: JPEG is inherently lossy even at q100 due to DCT rounding,
 * but the loss is negligible (sub-pixel differences).
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap } from "./clo_to_bitmap";

export async function convertBitmapToJpg(
  bitmap: Bitmap,
  outputPath?: string | null,
): Promise<Buffer> {
  const img = sharp(Buffer.from(bitmap.pixels.buffer), {
    raw: { width: bitmap.width, height: bitmap.height, channels: 1 },
  });

  const buffer = await img.jpeg({ quality: 100 }).toBuffer();

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

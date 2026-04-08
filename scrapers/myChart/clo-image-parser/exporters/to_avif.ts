/**
 * Convert 16-bit grayscale bitmaps to AVIF using sharp.
 *
 * AVIF the format supports 8, 10, and 12-bit output. However, sharp's
 * prebuilt binaries (@img/sharp-*) restrict AVIF to 8-bit only. The check
 * is in sharp/lib/output.js:
 *
 *   if (options.bitdepth !== 8 && this.constructor.versions.heif)
 *     throw invalidParameterError('bitdepth when using prebuilt binaries', 8, ...)
 *
 * `versions.heif` is defined only when using prebuilt binaries. To unlock
 * 10/12-bit AVIF, you would need to either:
 *   1. Set SHARP_FORCE_GLOBAL_LIBVIPS=1 with a system libvips compiled
 *      with high-bitdepth libheif/aom support, or
 *   2. Build sharp from source (npm install sharp --build-from-source)
 *
 * For now we default to 8-bit. For true diagnostic quality, use the 16-bit
 * PNG or TIFF exporters which preserve full precision losslessly.
 *
 * AVIF has excellent compression and is supported by all modern browsers
 * (Chrome, Firefox, Safari 16+, Edge).
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import type { Bitmap16 } from "../clo_to_bitmap";
import { encode16bitPng } from "./png16";

export interface AvifOptions {
  /** Quality 1-100. Default: 80. Ignored if lossless is true. */
  quality?: number;
  /** Lossless encoding. Default: false */
  lossless?: boolean;
  /** Compression effort 0-9. Default: 4 */
  effort?: number;
}

export async function convertBitmap16ToAvif(
  bitmap: Bitmap16,
  options?: AvifOptions,
  outputPath?: string | null,
): Promise<Buffer> {
  const quality = options?.quality ?? 80;
  const lossless = options?.lossless ?? false;
  const effort = options?.effort ?? 4;

  const png = encode16bitPng(bitmap.pixels, bitmap.width, bitmap.height);
  const buffer = await sharp(png)
    .avif({ quality, lossless, effort })
    .toBuffer();

  if (outputPath) {
    writeFileSync(outputPath, buffer);
  }

  return buffer;
}

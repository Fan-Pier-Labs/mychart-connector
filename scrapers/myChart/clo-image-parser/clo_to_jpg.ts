#!/usr/bin/env bun
/**
 * Convert eUnity CLO (ClientOutlook) image files to JPEG.
 *
 * Thin wrapper that composes clo_to_bitmap + bitmap_to_jpg.
 * Kept for backward compatibility and CLI usage.
 *
 * Usage:
 *   bun scripts/clo_to_jpg/clo_to_jpg.ts <input.clo> [output.jpg]
 *   bun scripts/clo_to_jpg/clo_to_jpg.ts <directory_with_clo_files> [output_directory]
 */

import { readFileSync, existsSync, mkdirSync, statSync, readdirSync } from "fs";
import { join, basename, extname, dirname } from "path";

import { convertCloToBitmap } from "./clo_to_bitmap";
import { convertBitmapToJpg } from "./bitmap_to_jpg";
import { convertBitmapToWebp } from "./bitmap_to_webp";

// Re-export everything from clo_to_bitmap for backward compatibility
export {
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
  convertCloToBitmap,
} from "./clo_to_bitmap";
export type { Bitmap, CloMetadata, TileKey, TileMap } from "./clo_to_bitmap";
export { convertBitmapToJpg } from "./bitmap_to_jpg";
export { convertBitmapToWebp } from "./bitmap_to_webp";

const CLOCLHAAR_MAGIC = Buffer.from("CLOCLHAAR###");

// ==================== Convenience wrapper ====================

export async function convertCloToJpg(opts: {
  pixelData: string | Buffer;
  wrapperData?: string | Buffer;
  outputPath?: string | null;
}): Promise<Buffer | string> {
  const bitmap = convertCloToBitmap(opts.pixelData, opts.wrapperData);

  const outputPath = opts.outputPath ?? null;
  if (outputPath === null) {
    return await convertBitmapToJpg(bitmap);
  }

  const ext = extname(outputPath).toLowerCase();
  if (ext === ".webp") {
    await convertBitmapToWebp(bitmap, outputPath);
  } else {
    await convertBitmapToJpg(bitmap, outputPath);
  }

  return outputPath;
}

// ==================== CLI helpers ====================

function findCloPairs(directory: string): [string, string | undefined][] {
  const pairs: [string, string | undefined][] = [];
  const files = readdirSync(directory, { recursive: true }) as string[];

  const pixelFiles = files
    .filter((f) => f.endsWith("_pixel.clo"))
    .map((f) => join(directory, f))
    .sort();

  for (const pixelPath of pixelFiles) {
    const wrapperPath = pixelPath.replace("_pixel.clo", "_wrapper.clo");
    pairs.push([pixelPath, existsSync(wrapperPath) ? wrapperPath : undefined]);
  }

  const standalone = files
    .filter((f) => f.endsWith(".clo") && !f.endsWith("_pixel.clo") && !f.endsWith("_wrapper.clo"))
    .map((f) => join(directory, f))
    .sort();

  for (const path of standalone) {
    try {
      const magic = readFileSync(path, { encoding: null }).subarray(0, 12);
      if (magic.compare(CLOCLHAAR_MAGIC) === 0) {
        pairs.push([path, undefined]);
      }
    } catch (err) {
      console.warn(`[clo_to_jpg] Failed to read ${path}:`, (err as Error).message);
    }
  }

  return pairs;
}

// ==================== CLI ====================

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun clo_to_jpg.ts <input.clo|directory> [output.jpg|directory]");
    process.exit(1);
  }

  const input = args[0];
  const output = args[1] && !args[1].startsWith("--") ? args[1] : undefined;

  if (statSync(input).isDirectory()) {
    const pairs = findCloPairs(input);
    if (pairs.length === 0) {
      console.error(`No CLO pixel files found in ${input}`);
      process.exit(1);
    }

    const outputDir = output || input;
    mkdirSync(outputDir, { recursive: true });

    for (const [pixelPath, wrapperPath] of pairs) {
      const stem = basename(pixelPath).replace("_pixel.clo", "").replace(".clo", "");
      const outputPath = join(outputDir, `${stem}.jpg`);
      try {
        await convertCloToJpg({ pixelData: pixelPath, outputPath, wrapperData: wrapperPath });
        console.log(`Converted: ${pixelPath} -> ${outputPath}`);
      } catch (e) {
        console.error(`Failed: ${pixelPath}: ${e}`);
      }
    }
  } else {
    if (!existsSync(input)) {
      console.error(`File not found: ${input}`);
      process.exit(1);
    }

    let wrapperPath: string | undefined;
    if (input.endsWith("_pixel.clo")) {
      const wp = input.replace("_pixel.clo", "_wrapper.clo");
      if (existsSync(wp)) wrapperPath = wp;
    }

    const outputPath = output || join(
      dirname(input),
      basename(input).replace("_pixel.clo", "").replace(".clo", "") + ".jpg"
    );

    try {
      const result = await convertCloToJpg({ pixelData: input, outputPath, wrapperData: wrapperPath });
      console.log(`Saved: ${result}`);
    } catch (e) {
      console.error(`Error: ${e}`);
      process.exit(1);
    }
  }
}

if (import.meta.main) {
  main();
}

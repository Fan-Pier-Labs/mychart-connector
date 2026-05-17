/**
 * Pure-JS JPEG encoder used by the MCPB so we don't have to bundle `sharp`.
 * Backed by `jpeg-js` (pure-JS JPEG codec, ~50 KB minified).
 */

import jpegJs from 'jpeg-js';
import { to8bit, grayscaleToRgba } from './voi-lut';

export interface EncodedJpeg {
  buffer: Uint8Array;
  width: number;
  height: number;
  bytes: number;
}

export interface CloBitmapInput {
  pixels: Uint16Array | Uint8Array;
  width: number;
  height: number;
}

/**
 * Encode a CLO-parsed bitmap as a single-channel JPEG. Accepts 8-bit or
 * 16-bit input; 16-bit is auto-windowed via min/max to 8-bit grayscale.
 */
export function encodeCloAsJpeg(bitmap: CloBitmapInput, quality = 85): EncodedJpeg {
  const gray8 = bitmap.pixels instanceof Uint16Array ? to8bit(bitmap.pixels) : bitmap.pixels;
  const rgba = grayscaleToRgba(gray8);
  const encoded = jpegJs.encode(
    { data: Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), width: bitmap.width, height: bitmap.height },
    quality,
  );
  return {
    buffer: encoded.data,
    width: bitmap.width,
    height: bitmap.height,
    bytes: encoded.data.length,
  };
}

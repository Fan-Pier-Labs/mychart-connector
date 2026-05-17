import * as jpeg from 'jpeg-js';

export interface JpgOptions {
  /** JPEG quality 1-100. Default: 85 */
  quality?: number;
}

/**
 * Pure-JS 8-bit grayscale to JPEG encoder.
 */
export function encodeGrayscaleToJpg(
  pixels: Uint8Array,
  width: number,
  height: number,
  options?: JpgOptions
): Buffer {
  const quality = options?.quality ?? 85;

  // jpeg-js expects RGBA (4 channels)
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = pixels[i];
    rgba[i * 4] = v;     // R
    rgba[i * 4 + 1] = v; // G
    rgba[i * 4 + 2] = v; // B
    rgba[i * 4 + 3] = 255; // A
  }

  const rawImageData = {
    data: rgba,
    width,
    height,
  };

  const jpegData = jpeg.encode(rawImageData, quality);
  return Buffer.from(jpegData.data);
}

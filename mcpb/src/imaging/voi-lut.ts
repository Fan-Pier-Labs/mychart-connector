import { CloMetadata } from '../../../scrapers/myChart/clo-image-parser/clo_to_bitmap';

/**
 * Pure-JS windowing/LUT application.
 * Extracted/Reused from scrapers/myChart/clo-image-parser/clo_to_bitmap.ts
 */
export function applyVoiLut(img16: Uint16Array, h: number, w: number, metadata: CloMetadata): Uint16Array {
  if (metadata.voi_lut) {
    const start = metadata.voi_lut_start || 0;
    const elements = metadata.voi_lut.length;
    const result = new Uint16Array(h * w);
    for (let i = 0; i < h * w; i++) {
      let idx = img16[i] - start;
      if (idx < 0) idx = 0;
      if (idx >= elements) idx = elements - 1;
      result[i] = metadata.voi_lut[idx];
    }
    return result;
  }

  if (metadata.window_center && metadata.window_width && metadata.window_center > 0 && metadata.window_width > 0) {
    const lower = metadata.window_center - metadata.window_width / 2;
    const upper = metadata.window_center + metadata.window_width / 2;
    const bits = metadata.voi_lut_bits || 16;
    const maxOut = (1 << bits) - 1;
    const result = new Uint16Array(h * w);
    for (let i = 0; i < h * w; i++) {
      const v = (img16[i] - lower) / (upper - lower) * maxOut;
      result[i] = Math.max(0, Math.min(maxOut, Math.round(v)));
    }
    return result;
  }

  return img16;
}

export function to8bit(img: Uint16Array, invert: boolean): Uint8Array {
  let maxVal = 1;
  for (let i = 0; i < img.length; i++) {
    if (img[i] > maxVal) maxVal = img[i];
  }
  const result = new Uint8Array(img.length);
  for (let i = 0; i < img.length; i++) {
    let v = Math.round(img[i] / maxVal * 255);
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    if (invert) v = 255 - v;
    result[i] = v;
  }
  return result;
}

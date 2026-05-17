/**
 * 16-bit → 8-bit windowing for medical images.
 *
 * Ported from the pure-JS bits of
 * scrapers/myChart/clo-image-parser/clo_to_bitmap.ts (applyVoiLut + to8bit).
 * Standalone here so we don't pull in `sharp` (which the canonical exporter
 * wraps).
 */

/**
 * Convert a 16-bit single-channel image to 8-bit grayscale by min/max
 * windowing. Suitable for a sensible default rendering when DICOM VOI LUT
 * is unavailable.
 */
export function to8bit(pixels16: Uint16Array): Uint8Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pixels16.length; i++) {
    const v = pixels16[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const out = new Uint8Array(pixels16.length);
  for (let i = 0; i < pixels16.length; i++) {
    out[i] = Math.round(((pixels16[i] - min) / range) * 255);
  }
  return out;
}

/** Grayscale → RGBA (alpha = 255). jpeg-js encode wants RGBA. */
export function grayscaleToRgba(gray: Uint8Array): Uint8Array {
  const out = new Uint8Array(gray.length * 4);
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i];
    const o = i * 4;
    out[o] = v;
    out[o + 1] = v;
    out[o + 2] = v;
    out[o + 3] = 255;
  }
  return out;
}

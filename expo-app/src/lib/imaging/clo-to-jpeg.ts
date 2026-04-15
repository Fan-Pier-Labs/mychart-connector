/**
 * Decode an eUnity CLO image to a JPEG, entirely on-device.
 *
 * Uses the pure-TS `convertCloToBitmap` from the shared parser (no sharp,
 * no native deps) and encodes the resulting 8-bit grayscale bitmap to a
 * JPEG with jpeg-js (also pure JS).
 */
import jpeg from "jpeg-js";
import { convertCloToBitmap } from "../../../../scrapers/myChart/clo-image-parser/clo_to_bitmap";

export type CloJpegResult = {
  base64: string;
  width: number;
  height: number;
};

export function cloToJpegBase64(
  pixelData: Buffer,
  wrapperData?: Buffer,
  quality = 85,
): CloJpegResult {
  const { pixels, width, height } = convertCloToBitmap(pixelData, wrapperData);

  // convertCloToBitmap returns 8-bit grayscale pixels. jpeg-js wants RGBA.
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i];
    const j = i * 4;
    rgba[j] = v;
    rgba[j + 1] = v;
    rgba[j + 2] = v;
    rgba[j + 3] = 255;
  }

  const encoded = jpeg.encode({ data: rgba, width, height }, quality);
  const base64 = Buffer.from(encoded.data).toString("base64");
  return { base64, width, height };
}

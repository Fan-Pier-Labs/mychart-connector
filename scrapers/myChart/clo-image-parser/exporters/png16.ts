/**
 * Minimal 16-bit grayscale PNG encoder.
 *
 * Sharp's `raw` input option accepts a `depth: 'ushort'` parameter, but
 * with prebuilt binaries it's silently ignored — the buffer is always
 * treated as 8-bit regardless. This means you can't pass a Uint16Array
 * directly to sharp and get correct 16-bit output.
 *
 * However, sharp CAN correctly read 16-bit PNGs (metadata shows
 * depth: 'ushort', bitsPerSample: 16). So we encode a valid 16-bit
 * grayscale PNG manually and feed it to sharp for further conversions
 * (TIFF, AVIF, JPEG, etc.). This is the bridge between our Uint16Array
 * pixel data and sharp's format conversion pipeline.
 */

import { deflateSync } from "zlib";

export function encode16bitPng(pixels: Uint16Array, width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4) + height(4) + bitdepth(1)=16 + colortype(1)=0(grayscale) + rest(3)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 16; // bit depth
  ihdr[9] = 0;  // grayscale
  ihdr[10] = 0; // compression method (deflate)
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  // Row data: 1 filter byte + width * 2 bytes (big-endian 16-bit) per row
  const rowSize = 1 + width * 2;
  const raw = Buffer.alloc(rowSize * height);
  for (let r = 0; r < height; r++) {
    raw[r * rowSize] = 0; // filter type: None
    for (let c = 0; c < width; c++) {
      raw.writeUInt16BE(pixels[r * width + c], r * rowSize + 1 + c * 2);
    }
  }
  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const chunk = Buffer.alloc(4 + 4 + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  // CRC32 over type + data
  const crcData = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  chunk.writeInt32BE(~crc, 8 + data.length);
  return chunk;
}

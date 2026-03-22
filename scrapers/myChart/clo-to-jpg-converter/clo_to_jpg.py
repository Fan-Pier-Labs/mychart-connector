#!/usr/bin/env python3
"""
Convert eUnity CLO (ClientOutlook) image files to JPEG.

CLO files use a proprietary Haar wavelet format from the eUnity/ClientOutlook
DICOM viewer. This script decodes CLOCLHAAR pixel files and CLOHEADERZ01
wrapper files to produce standard JPEG images.

Usage:
    python3 scripts/clo_to_jpg.py <input.clo> [output.jpg]
    python3 scripts/clo_to_jpg.py <directory_with_clo_files> [output_directory]

If output path is omitted, writes to the same directory with a .jpg extension.
When given a directory, converts all *_pixel.clo and *_wrapper.clo pairs found.

The CLO format stores a 4-level Haar wavelet decomposition with 256x256 tiled
storage at higher resolutions. Each level has LL (approximation), LH (horizontal
detail), HL (vertical detail), and HH (diagonal detail) subbands stored as
16-bit values (MSB + LSB byte planes) with EVEN_ODD zigzag encoding.

The reconstruction uses a lifting-scheme inverse Haar wavelet transform
(verified byte-for-byte against the eUnity WASM module), followed by VOI LUT
application from the wrapper metadata for proper DICOM windowing.

Requirements:
    pip3 install zstandard Pillow numpy
"""

import sys
import struct
import zlib
import os
import glob
import argparse
from pathlib import Path
from typing import Optional

try:
    import zstandard
except ImportError:
    print("Error: zstandard not installed. Run: pip3 install zstandard", file=sys.stderr)
    sys.exit(1)

try:
    import numpy as np
except ImportError:
    print("Error: numpy not installed. Run: pip3 install numpy", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed. Run: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)


CLOCLHAAR_MAGIC = b"CLOCLHAAR###"
CLOHEADERZ01_MAGIC = b"CLOHEADERZ01"
MARKER = b"\x35\xfa"
ZSTD_MAGIC = bytes([0x28, 0xB5, 0x2F, 0xFD])
TILE_SIZE = 256


# ==================== AMF3 Parser ====================


class AMF3Reader:
    """Minimal AMF3 parser for extracting CLO wrapper metadata."""

    def __init__(self, data: bytes):
        self.data = data
        self.pos = 0
        self.string_refs = []
        self.object_refs = []
        self.traits_refs = []

    def read_u8(self) -> int:
        v = self.data[self.pos]
        self.pos += 1
        return v

    def read_u29(self) -> int:
        n = 0
        for _ in range(3):
            b = self.read_u8()
            n = (n << 7) | (b & 0x7F)
            if not (b & 0x80):
                return n
        return (n << 8) | self.read_u8()

    def read_string(self) -> str:
        ref = self.read_u29()
        if ref & 1:
            length = ref >> 1
            if length == 0:
                return ""
            s = self.data[self.pos : self.pos + length].decode("utf-8")
            self.pos += length
            self.string_refs.append(s)
            return s
        return self.string_refs[ref >> 1]

    def read_double(self) -> float:
        v = struct.unpack(">d", self.data[self.pos : self.pos + 8])[0]
        self.pos += 8
        return v

    def read_value(self, depth: int = 0):
        if depth > 20:
            return None
        marker = self.read_u8()
        if marker in (0x00, 0x01):
            return None
        if marker == 0x02:
            return False
        if marker == 0x03:
            return True
        if marker == 0x04:
            return self.read_u29()
        if marker == 0x05:
            return self.read_double()
        if marker == 0x06:
            return self.read_string()
        if marker == 0x08:
            self.read_u29()
            return self.read_double()
        if marker == 0x09:
            return self._read_array(depth)
        if marker == 0x0A:
            return self._read_object(depth)
        if marker == 0x0C:
            ref = self.read_u29()
            if ref & 1:
                length = ref >> 1
                data = bytes(self.data[self.pos : self.pos + length])
                self.pos += length
                self.object_refs.append(data)
                return data
            return self.object_refs[ref >> 1]
        return None

    def _read_array(self, depth: int):
        ref = self.read_u29()
        if not (ref & 1):
            return self.object_refs[ref >> 1]
        count = ref >> 1
        while self.read_string():
            self.read_value(depth + 1)
        dense = [self.read_value(depth + 1) for _ in range(count)]
        self.object_refs.append(dense)
        return dense

    def _read_object(self, depth: int):
        ref = self.read_u29()
        if not (ref & 1):
            return self.object_refs[ref >> 1]
        if ref & 2:
            traits = {
                "class": self.read_string(),
                "externalizable": bool(ref & 4),
                "dynamic": bool(ref & 8),
                "members": [self.read_string() for _ in range(ref >> 4)],
            }
            self.traits_refs.append(traits)
        else:
            traits = self.traits_refs[ref >> 2]
        obj = {"_class": traits["class"]}
        self.object_refs.append(obj)
        if traits["externalizable"]:
            obj["_data"] = self.read_value(depth + 1)
            return obj
        for name in traits["members"]:
            try:
                obj[name] = self.read_value(depth + 1)
            except Exception:
                break
        if traits["dynamic"]:
            while True:
                try:
                    key = self.read_string()
                    if key == "":
                        break
                    obj[key] = self.read_value(depth + 1)
                except Exception:
                    break
        return obj


# ==================== Wrapper Parser ====================


def parse_wrapper(filepath: str) -> dict:
    """Parse a CLOHEADERZ01 wrapper file and extract DICOM metadata via AMF3."""
    with open(filepath, "rb") as f:
        data = f.read()

    if not data.startswith(CLOHEADERZ01_MAGIC):
        raise ValueError(f"Not a CLOHEADERZ01 file: {filepath}")

    try:
        decompressed = zlib.decompress(data[16:])
    except zlib.error as e:
        raise ValueError(f"Failed to decompress wrapper: {e}")

    metadata = {}

    # Try AMF3 parsing first for structured metadata
    try:
        reader = AMF3Reader(decompressed)
        result = reader.read_value()
        if isinstance(result, dict):
            # Extract key DICOM fields
            photometric = result.get("photometricInterpretation")
            if isinstance(photometric, str):
                metadata["photometric"] = photometric

            bits_stored = result.get("bitsStored")
            if isinstance(bits_stored, (int, float)) and bits_stored > 0:
                metadata["bits_stored"] = int(bits_stored)

            high_pv = result.get("highPixelValue")
            if isinstance(high_pv, (int, float)) and high_pv > 0:
                metadata["high_pixel_value"] = int(high_pv)

            is_signed = result.get("isSigned")
            if isinstance(is_signed, (int, float)):
                metadata["is_signed"] = int(is_signed)

            wc = result.get("windowCenter")
            if isinstance(wc, (int, float)) and wc > 0:
                metadata["window_center"] = float(wc)

            ww = result.get("windowWidth")
            if isinstance(ww, (int, float)) and ww > 0:
                metadata["window_width"] = float(ww)

            pls = result.get("presentationLutShape")
            if isinstance(pls, str):
                metadata["presentation_lut_shape"] = pls

            rs = result.get("rescaleSlope")
            if isinstance(rs, (int, float)):
                metadata["rescale_slope"] = float(rs)

            ri = result.get("rescaleIntercept")
            if isinstance(ri, (int, float)):
                metadata["rescale_intercept"] = float(ri)

            # Extract VOI LUT if present
            voi = result.get("voiLut")
            if isinstance(voi, dict) and isinstance(voi.get("lut"), bytes):
                lut_data = voi["lut"]
                elements = voi.get("elements", 0)
                start = voi.get("start", 0)
                bits = voi.get("bits", 16)
                is_le = voi.get("lutIsLittleEndian", 1)

                if elements > 0 and len(lut_data) >= elements * 2:
                    dtype = "<u2" if is_le else ">u2"
                    lut_array = np.frombuffer(lut_data, dtype=dtype)[:elements]
                    metadata["voi_lut"] = lut_array
                    metadata["voi_lut_start"] = int(start)
                    metadata["voi_lut_bits"] = int(bits)
    except Exception:
        pass

    # Fallback: text-based detection
    if "photometric" not in metadata:
        text = decompressed.decode("latin-1", errors="replace")
        if "MONOCHROME1" in text:
            metadata["photometric"] = "MONOCHROME1"
        elif "MONOCHROME2" in text:
            metadata["photometric"] = "MONOCHROME2"

    return metadata


# ==================== Pixel File Parser ====================


def parse_pixel_header(data: bytes) -> dict:
    """Parse the CLOCLHAAR pixel file header to extract image dimensions."""
    if not data.startswith(CLOCLHAAR_MAGIC):
        raise ValueError("Not a CLOCLHAAR pixel file")

    if data[16:18] != MARKER:
        raise ValueError("Expected 35fa marker at offset 16")

    width = struct.unpack("<I", data[24:28])[0]
    height = struct.unpack("<I", data[28:32])[0]

    if width == 0 or height == 0 or width > 65535 or height > 65535:
        raise ValueError(f"Invalid dimensions: {width}x{height}")

    return {"width": width, "height": height}


def extract_tiles(data: bytes) -> dict:
    """
    Extract and decompress all tiled data blocks from a CLOCLHAAR pixel file.

    Returns a dict keyed by (group_index, tile_row, tile_col, block_num)
    -> decompressed bytes.
    """
    dctx = zstandard.ZstdDecompressor()
    pos = 96
    tiles = {}
    group_idx = -1
    tile_row, tile_col = 0, 0

    while pos < len(data) - 4:
        if data[pos : pos + 2] == MARKER:
            rec = data[pos : pos + 16]
            level = struct.unpack(">H", rec[2:4])[0]
            val1 = struct.unpack("<I", rec[4:8])[0]
            val2 = struct.unpack("<I", rec[8:12])[0]

            if level == 2:
                group_idx += 1
                tile_row, tile_col = 0, 0
            elif level == 3:
                tile_row = (val2 >> 16) & 0xFFFF
                tile_col = val2 & 0xFFFF
            elif level == 5:
                compressed_size = val1
                block_num = val2
                data_pos = pos + 16

                if (
                    data_pos < len(data) - 4
                    and data[data_pos : data_pos + 4] == ZSTD_MAGIC
                ):
                    try:
                        decompressed = dctx.decompress(
                            data[data_pos : data_pos + compressed_size],
                            max_output_size=50 * 1024 * 1024,
                        )
                        tiles[(group_idx, tile_row, tile_col, block_num)] = decompressed
                    except Exception:
                        try:
                            decompressed = dctx.decompress(
                                data[data_pos:], max_output_size=50 * 1024 * 1024
                            )
                            tiles[
                                (group_idx, tile_row, tile_col, block_num)
                            ] = decompressed
                        except Exception:
                            pass
                    pos = data_pos + compressed_size
                    continue
            pos += 16
        else:
            pos += 1

    return tiles


# ==================== Wavelet Reconstruction ====================


def _compute_wavelet_levels(width: int, height: int) -> list:
    """Compute subband dimensions for each wavelet level, coarsest first.

    Returns list of (height, width) tuples.
    """
    levels = []
    cw, ch = width, height
    while cw > TILE_SIZE or ch > TILE_SIZE:
        cw = (cw + 1) // 2
        ch = (ch + 1) // 2
        levels.append((ch, cw))
    levels.reverse()
    return levels


def _assemble_subband_u16(
    tiles: dict, group: int, lsb_block: int, msb_block: int, h: int, w: int
) -> np.ndarray:
    """Assemble a 16-bit subband from tiled MSB + LSB byte planes."""
    total = h * w

    # Check if stored as a single untiled block
    lk0 = (group, 0, 0, lsb_block)
    mk0 = (group, 0, 0, msb_block)
    if lk0 in tiles and mk0 in tiles:
        lsb_data = np.frombuffer(tiles[lk0], dtype=np.uint8)
        msb_data = np.frombuffer(tiles[mk0], dtype=np.uint8)
        if len(lsb_data) >= total and len(msb_data) >= total:
            u16 = msb_data[:total].astype(np.uint16) * 256 + lsb_data[:total].astype(
                np.uint16
            )
            return u16.reshape(h, w)

    # Tiled assembly — derive actual tile height from data
    result = np.zeros((h, w), dtype=np.uint16)

    tile_keys = [
        (tr, tc)
        for (g, tr, tc, bn) in tiles
        if g == group and bn == lsb_block
    ]
    if not tile_keys:
        return result

    n_tile_rows = max(tr for tr, tc in tile_keys) + 1
    n_tile_cols = max(tc for tr, tc in tile_keys) + 1

    first_tw = min(TILE_SIZE, w)
    first_data = tiles.get(lk0, b"")
    std_tile_h = len(first_data) // first_tw if first_tw > 0 else TILE_SIZE
    std_tile_h = max(std_tile_h, 1)

    for tr in range(n_tile_rows):
        for tc in range(n_tile_cols):
            lk = (group, tr, tc, lsb_block)
            mk = (group, tr, tc, msb_block)
            if lk not in tiles or mk not in tiles:
                continue

            tw = min(TILE_SIZE, w - tc * TILE_SIZE)
            lsb_data = np.frombuffer(tiles[lk], dtype=np.uint8)
            msb_data = np.frombuffer(tiles[mk], dtype=np.uint8)
            th = len(lsb_data) // tw if tw > 0 else 0
            th = min(th, h - tr * std_tile_h)

            expected = th * tw
            lsb = lsb_data[:expected]
            msb = msb_data[:expected]
            if len(lsb) >= expected and len(msb) >= expected:
                r0 = tr * std_tile_h
                c0 = tc * TILE_SIZE
                tile_u16 = msb.astype(np.uint16) * 256 + lsb.astype(np.uint16)
                result[r0 : r0 + th, c0 : c0 + tw] = tile_u16.reshape(th, tw)

    return result


def _get_subband_bytes(
    tiles: dict, group: int, block_num: int, h: int, w: int
) -> np.ndarray:
    """Get raw byte array for a single block, assembled from tiles."""
    total = h * w

    # Check if stored as a single untiled block
    key0 = (group, 0, 0, block_num)
    if key0 in tiles:
        data = np.frombuffer(tiles[key0], dtype=np.uint8)
        if len(data) >= total:
            return data[:total].copy()

    # Tiled assembly — derive actual tile height from data (tiles may be
    # full-height column strips rather than 256x256 squares)
    result = np.zeros(total, dtype=np.uint8)

    # Determine tile grid from actual tile keys
    tile_keys = [
        (tr, tc)
        for (g, tr, tc, bn) in tiles
        if g == group and bn == block_num
    ]
    if not tile_keys:
        return result

    n_tile_rows = max(tr for tr, tc in tile_keys) + 1
    n_tile_cols = max(tc for tr, tc in tile_keys) + 1

    # Derive standard tile height from first tile's data size
    first_data = tiles.get(key0, b"")
    first_tw = min(TILE_SIZE, w)
    std_tile_h = len(first_data) // first_tw if first_tw > 0 else TILE_SIZE
    std_tile_h = max(std_tile_h, 1)

    for tr in range(n_tile_rows):
        for tc in range(n_tile_cols):
            key = (group, tr, tc, block_num)
            if key not in tiles:
                continue

            data = np.frombuffer(tiles[key], dtype=np.uint8)
            tw = min(TILE_SIZE, w - tc * TILE_SIZE)
            th = len(data) // tw if tw > 0 else 0
            th = min(th, h - tr * std_tile_h)

            for r in range(th):
                src_start = r * tw
                dst_row = tr * std_tile_h + r
                if dst_row >= h:
                    break
                dst_idx = dst_row * w + tc * TILE_SIZE
                result[dst_idx : dst_idx + tw] = data[
                    src_start : src_start + tw
                ]

    return result


def _zigzag_decode(unsigned: np.ndarray) -> np.ndarray:
    """Decode EVEN_ODD zigzag-encoded unsigned values into signed 32-bit values.

    Zigzag mapping: 0→0, 1→-1, 2→1, 3→-2, 4→2, ...
    Formula: even→n/2, odd→-(n+1)/2
    """
    signed = np.where(unsigned & 1, -((unsigned + 1) >> 1), unsigned >> 1)
    return signed


def _inverse_haar_level(
    ll: np.ndarray, tiles: dict, group: int, out_h: int, out_w: int
) -> np.ndarray:
    """Run one level of inverse Haar wavelet transform using the lifting scheme.

    This implements the exact algorithm from the eUnity WASM module (f_ue),
    verified by calling the WASM directly.

    The detail subbands (LH, HL, HH) are stored as 16-bit values split into
    low/high byte planes, with an overflow block providing extra precision bits:
      - LH: bit 0 of overflow → 17th bit (17-bit zigzag decode)
      - HL: bit 1 of overflow → 17th bit (17-bit zigzag decode)
      - HH: bits 2-3 of overflow → 17th-18th bits (18-bit zigzag decode)

    Lifting scheme (for each 2x2 output block):
        A = HL (vertical detail, zigzag-decoded with overflow)
        B = LH (horizontal detail, zigzag-decoded with overflow)
        C = HH (diagonal detail, zigzag-decoded with overflow)
        S = LL (approximation, unsigned 16-bit)

        z = S - A // 2
        l = B - C // 2
        aa = z - l // 2
        output[0,0] = aa
        output[0,1] = l + aa
        l_upd = l + C
        n = A + z - l_upd // 2
        output[1,0] = n
        output[1,1] = l_upd + n
    """
    in_h, in_w = ll.shape

    # Get detail subband raw bytes (low and high byte planes)
    lh_low = _get_subband_bytes(tiles, group, 1, in_h, in_w)
    lh_high = _get_subband_bytes(tiles, group, 65537, in_h, in_w)
    hl_low = _get_subband_bytes(tiles, group, 2, in_h, in_w)
    hl_high = _get_subband_bytes(tiles, group, 65538, in_h, in_w)
    hh_low = _get_subband_bytes(tiles, group, 3, in_h, in_w)
    hh_high = _get_subband_bytes(tiles, group, 65539, in_h, in_w)

    # Get overflow block (provides extra precision bits for detail subbands)
    overflow = _get_subband_bytes(tiles, group, 4, in_h, in_w)
    overflow_i32 = overflow.astype(np.int32)

    # Combine byte planes into 16-bit unsigned values
    lh_u16 = lh_high.astype(np.int32) * 256 + lh_low.astype(np.int32)
    hl_u16 = hl_high.astype(np.int32) * 256 + hl_low.astype(np.int32)
    hh_u16 = hh_high.astype(np.int32) * 256 + hh_low.astype(np.int32)

    # Apply overflow bits to extend precision:
    # LH: overflow bit 0 → bit 16 of unsigned value (17-bit)
    lh_u17 = lh_u16 | ((overflow_i32 & 1) << 16)
    # HL: overflow bit 1 → bit 16 of unsigned value (17-bit)
    hl_u17 = hl_u16 | (((overflow_i32 >> 1) & 1) << 16)
    # HH: overflow bits 2-3 → bits 16-17 of unsigned value (18-bit)
    hh_u18 = hh_u16 | (((overflow_i32 >> 2) & 3) << 16)

    # Zigzag decode with extended precision
    lh = _zigzag_decode(lh_u17).reshape(in_h, in_w)
    hl = _zigzag_decode(hl_u17).reshape(in_h, in_w)
    hh = _zigzag_decode(hh_u18).reshape(in_h, in_w)

    # LL as int32 for arithmetic
    s = ll.astype(np.int32)

    # Lifting scheme inverse Haar
    # Use numpy arithmetic shift (Python int // is floor division, matching WASM's >> 1)
    a = hl  # vertical detail
    b = lh  # horizontal detail
    c = hh  # diagonal detail

    z = s - (a >> 1)
    l_init = b - (c >> 1)
    aa = z - (l_init >> 1)
    out00 = aa
    out01 = l_init + aa
    l_upd = l_init + c
    n_val = a + z - (l_upd >> 1)
    out10 = n_val
    out11 = l_upd + n_val

    # Interleave into output (2x upscale)
    output = np.zeros((out_h, out_w), dtype=np.int32)
    actual_h = min(in_h * 2, out_h)
    actual_w = min(in_w * 2, out_w)

    # Even/odd positions have different counts when actual dimensions are odd
    n_even_rows = (actual_h + 1) // 2  # ceil - rows 0, 2, 4, ...
    n_odd_rows = actual_h // 2          # floor - rows 1, 3, 5, ...
    n_even_cols = (actual_w + 1) // 2
    n_odd_cols = actual_w // 2

    output[0:actual_h:2, 0:actual_w:2] = out00[:n_even_rows, :n_even_cols]
    output[0:actual_h:2, 1:actual_w:2] = out01[:n_even_rows, :n_odd_cols]
    output[1:actual_h:2, 0:actual_w:2] = out10[:n_odd_rows, :n_even_cols]
    output[1:actual_h:2, 1:actual_w:2] = out11[:n_odd_rows, :n_odd_cols]

    # Handle odd output dimensions (copy last row/col)
    if out_h > actual_h and actual_h > 0:
        output[actual_h, :] = output[actual_h - 1, :]
    if out_w > actual_w and actual_w > 0:
        output[:, actual_w] = output[:, actual_w - 1]

    return output.astype(np.uint16)


def _apply_voi_lut(img16: np.ndarray, metadata: dict) -> np.ndarray:
    """Apply VOI LUT from metadata to convert 16-bit to display values."""
    voi_lut = metadata.get("voi_lut")
    if voi_lut is not None:
        start = metadata.get("voi_lut_start", 0)
        elements = len(voi_lut)
        # Vectorized LUT lookup
        indices = img16.astype(np.int32) - start
        indices = np.clip(indices, 0, elements - 1)
        return voi_lut[indices.ravel()].reshape(img16.shape)

    # Fallback: use window center/width if available
    wc = metadata.get("window_center")
    ww = metadata.get("window_width")
    if wc and ww and wc > 0 and ww > 0:
        lower = wc - ww / 2
        upper = wc + ww / 2
        bits = metadata.get("voi_lut_bits", 16)
        max_out = (1 << bits) - 1
        return np.clip(
            (img16.astype(np.float64) - lower) / (upper - lower) * max_out,
            0,
            max_out,
        ).astype(np.uint16)

    # No LUT or window: return as-is
    return img16


def _to_8bit(img: np.ndarray, invert: bool, bits_stored: int = 15) -> np.ndarray:
    """Convert to 8-bit with optional MONOCHROME1 inversion."""
    max_val = float(max(img.max(), 1))
    result = np.clip(
        np.round(img.astype(np.float64) / max_val * 255), 0, 255
    ).astype(np.uint8)
    if invert:
        result = 255 - result
    return result


def reconstruct_image(
    tiles: dict,
    width: int,
    height: int,
    metadata: dict,
) -> np.ndarray:
    """
    Reconstruct an image from decoded CLO wavelet tiles using lifting-scheme
    inverse Haar wavelet transform, verified against the eUnity WASM module.
    """
    if (-1, 0, 0, 65536) not in tiles:
        raise ValueError("Missing LL approximation block")

    levels = _compute_wavelet_levels(width, height)
    if not levels:
        raise ValueError("Image too small for wavelet decomposition")

    ch, cw = levels[0]

    # Assemble LL (coarsest approximation)
    current = _assemble_subband_u16(tiles, -1, 0, 65536, ch, cw)

    # Progressive inverse Haar through all wavelet levels
    for lvl_idx in range(len(levels)):
        group = lvl_idx
        if lvl_idx + 1 < len(levels):
            next_h, next_w = levels[lvl_idx + 1]
        else:
            next_h, next_w = height, width

        # Check if detail data exists for this level
        has_detail = any(k[0] == group and k[3] == 1 for k in tiles)
        if not has_detail:
            # No detail: just upscale
            img = Image.fromarray(current)
            current = np.array(
                img.resize((next_w, next_h), Image.Resampling.LANCZOS)
            )
            continue

        current = _inverse_haar_level(current, tiles, group, next_h, next_w)

    # Apply display pipeline
    invert = metadata.get("photometric") == "MONOCHROME1"
    pls = metadata.get("presentation_lut_shape", "")

    # Apply VOI LUT
    displayed = _apply_voi_lut(current, metadata)

    # Convert to 8-bit
    bits = metadata.get("bits_stored", 15)
    result = _to_8bit(displayed, invert, bits)

    return result


# ==================== Conversion ====================


def convert_clo_to_jpg(
    pixel_path: str,
    output_path: str,
    wrapper_path: Optional[str] = None,
    quality: int = 95,
) -> str:
    """
    Convert a CLO pixel file to JPEG.

    Args:
        pixel_path: Path to the CLOCLHAAR pixel file
        output_path: Path for the output JPEG
        wrapper_path: Optional path to the CLOHEADERZ01 wrapper file (for metadata)
        quality: JPEG quality (1-100)

    Returns:
        Path to the saved JPEG file
    """
    with open(pixel_path, "rb") as f:
        data = f.read()

    header = parse_pixel_header(data)
    width, height = header["width"], header["height"]

    # Parse wrapper for DICOM metadata
    metadata = {"photometric": "MONOCHROME1"}  # Default for X-ray
    if wrapper_path and os.path.exists(wrapper_path):
        try:
            metadata = parse_wrapper(wrapper_path)
            if "photometric" not in metadata:
                metadata["photometric"] = "MONOCHROME1"
        except Exception:
            pass

    tiles = extract_tiles(data)
    if not tiles:
        raise ValueError("No data blocks found in CLO file")

    pixels = reconstruct_image(tiles, width, height, metadata)

    img = Image.fromarray(pixels)
    ext = Path(output_path).suffix.lower()
    if ext == ".png":
        img.save(output_path, "PNG")
    else:
        img.save(output_path, "JPEG", quality=quality)

    return output_path


def find_clo_pairs(directory: str) -> list:
    """Find pixel/wrapper CLO file pairs in a directory."""
    pixel_files = glob.glob(os.path.join(directory, "*_pixel.clo"))
    pixel_files += glob.glob(os.path.join(directory, "**/*_pixel.clo"), recursive=True)
    pixel_files = sorted(set(pixel_files))

    pairs = []
    for pixel_path in pixel_files:
        wrapper_path = pixel_path.replace("_pixel.clo", "_wrapper.clo")
        if not os.path.exists(wrapper_path):
            wrapper_path = None
        pairs.append((pixel_path, wrapper_path))

    # Also handle standalone CLO files (not _pixel/_wrapper naming)
    standalone = glob.glob(os.path.join(directory, "*.clo"))
    standalone += glob.glob(os.path.join(directory, "**/*.clo"), recursive=True)
    standalone = sorted(set(standalone))

    for path in standalone:
        if path.endswith("_pixel.clo") or path.endswith("_wrapper.clo"):
            continue
        try:
            with open(path, "rb") as f:
                magic = f.read(12)
            if magic == CLOCLHAAR_MAGIC:
                pairs.append((path, None))
        except Exception:
            pass

    return pairs


def main():
    parser = argparse.ArgumentParser(
        description="Convert eUnity CLO image files to JPEG"
    )
    parser.add_argument(
        "input", help="CLO pixel file or directory containing CLO files"
    )
    parser.add_argument(
        "output",
        nargs="?",
        help="Output JPEG path or directory (default: same location with .jpg extension)",
    )
    parser.add_argument(
        "--quality", type=int, default=95, help="JPEG quality 1-100 (default: 95)"
    )
    parser.add_argument(
        "--no-invert",
        action="store_true",
        help="Don't invert pixel values (skip MONOCHROME1 inversion)",
    )

    args = parser.parse_args()

    if os.path.isdir(args.input):
        pairs = find_clo_pairs(args.input)
        if not pairs:
            print(f"No CLO pixel files found in {args.input}", file=sys.stderr)
            sys.exit(1)

        output_dir = args.output or args.input
        os.makedirs(output_dir, exist_ok=True)

        for pixel_path, wrapper_path in pairs:
            basename = Path(pixel_path).stem.replace("_pixel", "")
            output_path = os.path.join(output_dir, f"{basename}.jpg")

            try:
                convert_clo_to_jpg(
                    pixel_path,
                    output_path,
                    wrapper_path,
                    quality=args.quality,
                )
                print(f"Converted: {pixel_path} -> {output_path}")
            except Exception as e:
                print(f"Failed: {pixel_path}: {e}", file=sys.stderr)

    else:
        if not os.path.exists(args.input):
            print(f"File not found: {args.input}", file=sys.stderr)
            sys.exit(1)

        wrapper_path = None
        if args.input.endswith("_pixel.clo"):
            wrapper_path = args.input.replace("_pixel.clo", "_wrapper.clo")
            if not os.path.exists(wrapper_path):
                wrapper_path = None

        if args.output:
            output_path = args.output
        else:
            stem = Path(args.input).stem.replace("_pixel", "")
            output_path = os.path.join(Path(args.input).parent, f"{stem}.jpg")

        try:
            result = convert_clo_to_jpg(
                args.input,
                output_path,
                wrapper_path,
                quality=args.quality,
            )
            print(f"Saved: {result}")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()

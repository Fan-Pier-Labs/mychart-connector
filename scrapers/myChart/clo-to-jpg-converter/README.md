# CLO to JPG Converter

Converts eUnity CLO (ClientOutlook) medical image files to standard JPEG format.

## Background

CLO is a proprietary image format used by Mach7 Technologies' eUnity DICOM viewer (formerly Client Outlook). It uses a 4-level Haar wavelet decomposition with zstd compression for progressive image streaming. The format consists of two files per image:

- `*_pixel.clo` — CLOCLHAAR format containing the actual pixel data (Haar wavelet coefficients)
- `*_wrapper.clo` — CLOHEADERZ01 format containing AMF3-encoded metadata (modality, photometric interpretation, annotations, etc.)

No public documentation or open-source decoder exists for this format. This script was built entirely through reverse engineering.

## Usage

```bash
# Convert a single CLO file
python3 clo_to_jpg.py input/R_INT_ROTATION_TABLE_pixel.clo output.jpg

# Convert all CLO files in a directory
python3 clo_to_jpg.py input/ output/

# Options
python3 clo_to_jpg.py input/ output/ --quality 95 --no-sharpen --no-invert
```

## Requirements

```bash
pip3 install zstandard Pillow numpy
```

## How It Works

### File Structure

The pixel file (`CLOCLHAAR`) contains:
1. A 96-byte header with image dimensions
2. `35fa` marker records (16 bytes each) organizing the data:
   - Level 2: starts a new wavelet resolution group
   - Level 3: defines tile position (row/col in upper/lower 16 bits)
   - Level 5: points to zstd-compressed data blocks
3. Zstd-compressed byte planes for each subband tile

### Wavelet Decomposition

The image is decomposed into 4 Haar wavelet levels:
- **Group -1**: LL approximation (coarsest, ~1/16th resolution)
- **Group 0**: Coarsest detail subbands (LH, HL, HH)
- **Group 1-3**: Progressively finer detail subbands (tiled at 256x256 for higher levels)

Each subband is stored as two byte planes: LSB (block N) and MSB (block 65536+N), combining to 16-bit values. Subbands are numbered: 0=LL, 1=LH (horizontal detail), 2=HL (vertical detail), 3=HH (diagonal detail).

### Reconstruction

The detail coefficients are stored as **unsigned magnitudes** without sign information (the sign encoding is proprietary and implemented in eUnity's client-side WASM/JS code). Without signs, direct Haar inverse wavelet reconstruction produces grid artifacts.

Instead, this script:
1. Extracts and assembles the LL approximation subband (16-bit)
2. Applies DICOM-style full-range windowing (15-bit) with MONOCHROME1 inversion
3. Lanczos-upscales to native resolution
4. Builds a multi-scale edge map from ALL detail level magnitudes
5. Applies aggressive 2-pass edge-adaptive sharpening guided by the edge map
6. Applies contrast enhancement to match the eUnity viewer's output dynamic range

### Known Limitations

- Fine detail is softer than the eUnity viewer's native output because proper Haar reconstruction requires the proprietary sign encoding
- Text annotations ("R", "DML", etc.) from the wrapper file are not rendered
- Window center/width from the wrapper's AMF3 metadata is not fully parsed; the script uses default 15-bit full-range windowing

## Directory Structure

```
scripts/clo_to_jpg/
├── clo_to_jpg.py          # The converter script
├── README.md              # This file
├── input/                 # Sample CLO input files
│   ├── R_INT_ROTATION_TABLE_pixel.clo
│   ├── R_INT_ROTATION_TABLE_wrapper.clo
│   ├── R_EXT_ROTATION_TABLE_pixel.clo
│   ├── R_EXT_ROTATION_TABLE_wrapper.clo
│   ├── R_GRID_AXILLARY_pixel.clo
│   ├── R_GRID_AXILLARY_wrapper.clo
│   └── amf_metadata.bin
├── goal_output/           # Reference images exported from eUnity viewer
│   ├── image_1*.jpg/png   # R_GRID_AXILLARY
│   ├── image_2*.jpg/png   # R_EXT_ROTATION_TABLE
│   └── image_3*.jpg/png   # R_INT_ROTATION_TABLE
└── wasm/                  # eUnity viewer JS/WASM (for reverse engineering)
    ├── eunityviewer.dart.js         # Main viewer (Dart compiled to JS, 5.9MB)
    ├── eunity_viewer_worker_wasm.dart.js  # Worker thread
    ├── LookupWrapperJSW512MB.wasm   # WASM lookup module
    ├── LookupWrapperWorkerJSW.wasm  # WASM lookup worker module
    └── *.js                         # Supporting JS files
```

## Reverse Engineering Notes

The sign encoding is the main unsolved piece. Analysis shows:
- All MSB values of detail coefficients are < 128 (no sign bit)
- Block 4 (potential sign storage) is all zeros
- Gradient-based sign prediction from LL achieves only ~40-50% accuracy (near random)
- The eUnity viewer's `eunityviewer.dart.js` (5.9MB Dart-compiled JS) likely contains the sign reconstruction algorithm
- The WASM modules (`LookupWrapper*.wasm`) appear to be lookup table helpers, not the core wavelet decoder

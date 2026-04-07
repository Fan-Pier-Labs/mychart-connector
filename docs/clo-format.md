# CLO Image Format (eUnity/ClientOutlook)

CLO is a proprietary image format used by Mach7 Technologies' eUnity DICOM viewer (formerly Client Outlook). It repackages DICOM medical images for progressive web streaming using Haar wavelet compression. No public documentation or open-source decoder exists — this was built entirely through reverse engineering.

## File Structure

Each image consists of two files:

- **`*_pixel.clo`** (magic: `CLOCLHAAR###`) — Haar wavelet-compressed pixel data
- **`*_wrapper.clo`** (magic: `CLOHEADERZ01`) — AMF3-encoded DICOM metadata (zlib-compressed)

These are **not** DICOM files. eUnity takes original DICOM images server-side, extracts metadata into AMF3 objects, re-encodes pixel data as Haar wavelets with zstd compression, and streams CLO files to the browser. All original DICOM information is preserved — just repackaged.

## Pixel File (`CLOCLHAAR`)

### Header (96 bytes)

- Bytes 0–11: Magic `CLOCLHAAR###`
- Bytes 16–17: `0x35 0xFA` marker
- Bytes 24–27: Width (uint32 LE)
- Bytes 28–31: Height (uint32 LE)

### Data Records (`35FA` markers, 16 bytes each)

| Level | Purpose |
|-------|---------|
| 2 | Start of a new wavelet resolution group |
| 3 | Tile position (row in upper 16 bits, col in lower 16 bits of val2) |
| 5 | Pointer to zstd-compressed data block (size in val1, block number in val2) |

### Wavelet Decomposition

4-level Haar wavelet decomposition:

- **Group -1**: LL approximation (coarsest, ~1/16th resolution)
- **Group 0**: Coarsest detail subbands (LH, HL, HH)
- **Groups 1–3**: Progressively finer detail subbands (tiled at 256×256)

Each subband stored as two byte planes:
- **LSB** (block N) and **MSB** (block 65536+N) → combined into 16-bit values
- Block 4 stores overflow bits for detail coefficients

Subband numbering:
- 0 = LL (approximation)
- 1 = LH (horizontal detail)
- 2 = HL (vertical detail)
- 3 = HH (diagonal detail)
- 4 = overflow bits

### Reconstruction Pipeline

1. Parse pixel header → width, height
2. Parse wrapper → DICOM metadata
3. Extract all tiles (scan for `35FA` markers, decompress zstd blocks)
4. Assemble LL coarsest approximation from MSB+LSB byte planes
5. Progressive inverse Haar wavelet (lifting scheme) through each detail level
6. Apply DICOM display pipeline (VOI LUT or window center/width)
7. Normalize to 8-bit with optional MONOCHROME1 inversion

### Sign Encoding

Detail coefficients (LH, HL, HH) use **zigzag encoding** for sign representation. Two's complement was investigated based on eUnity's GPU shader code but produced worse results (visible checkerboard artifacts) — the shader's two's complement is for final pixel display, not wavelet coefficient decoding.

### Compression Variants

Determined by `transformType` and `bitEncoding`:

| Transform Type | Compression | Bit Encoding | Notes |
|---------------|-------------|-------------|-------|
| 10 | ZSTD | EVEN_ODD (1) | Common/modern format |
| 0 | ZLIB | HIGH_BIT (0) | Legacy format |

## Wrapper File (`CLOHEADERZ01`)

### Structure

- Bytes 0–11: Magic `CLOHEADERZ01`
- Bytes 12–15: Reserved
- Bytes 16+: zlib-compressed AMF3 object

Decompress with `zlib.inflateSync()`, then parse with an AMF3 reader.

### AMF3 Object: `com.clientoutlook.data.ImageDescription`

The root object contains the complete DICOM metadata for the image. Fields documented below with their AMF3 types.

#### Image Properties

| Field | Type | Description |
|-------|------|-------------|
| `modality` | string | DICOM modality: "MR", "CT", "CR", "OT", etc. |
| `photometricInterpretation` | string | "MONOCHROME1", "MONOCHROME2", "RGB" |
| `bitsAllocated` | number | Bits per pixel allocated (8 or 16) |
| `bitsStored` | number | Bits per pixel actually used |
| `potentialDataBitsStored` | number | Maximum bits the data could use |
| `isSigned` | number | 0 = unsigned, 1 = signed pixel values |
| `lowPixelValue` | number | Minimum pixel value in the image |
| `highPixelValue` | number | Maximum pixel value in the image |
| `numberOfFrames` | number | Number of frames (0 for single-frame) |
| `seriesDescription` | string | Series description text |
| `imageLaterality` | string | "L", "R", or empty |
| `accessionNumber` | string | Study accession number |
| `lossyCompression` | object/null | Lossy compression info if applicable |

#### Display Pipeline

| Field | Type | Description |
|-------|------|-------------|
| `windowCenter` | number | DICOM window center for contrast |
| `windowWidth` | number | DICOM window width for contrast |
| `voiLut` | object/null | Value of Interest lookup table |
| `voiLutFunction` | string | VOI LUT function type |
| `rescaleSlope` | number | Modality LUT slope (default 1) |
| `rescaleIntercept` | number | Modality LUT intercept (default 0) |
| `rescaleType` | string | Rescale type identifier |
| `modalityLut` | object/null | Full modality LUT |
| `presentationLut` | object/null | Presentation LUT |
| `presentationLutShape` | string | Presentation LUT shape |
| `displayShutter` | object/null | Collimation/shutter masking |
| `zoomData` | object/null | Zoom/pan state |

##### VOI LUT Object

When present, `voiLut` contains:

| Field | Type | Description |
|-------|------|-------------|
| `lut` | Buffer | Raw LUT data (16-bit values) |
| `elements` | number | Number of LUT entries |
| `start` | number | First input value mapped |
| `bits` | number | Output bit depth (typically 16) |
| `lutIsLittleEndian` | number | 1 = little-endian, 0 = big-endian |

#### Spatial Calibration (`calibration`)

Class: `com.clientoutlook.data.ImageCalibration`

| Field | Type | Description |
|-------|------|-------------|
| `width` | number | Image width in pixels |
| `height` | number | Image height in pixels |
| `pixelSpacingX` | number | Horizontal pixel size in mm |
| `pixelSpacingY` | number | Vertical pixel size in mm |
| `hasPixelSpacing` | boolean | Whether pixel spacing is defined |
| `imagerPixelSpacingX` | number | Detector pixel spacing X |
| `imagerPixelSpacingY` | number | Detector pixel spacing Y |
| `hasImagerPixelSpacing` | boolean | Whether imager spacing is defined |
| `aspectRatioYspacingOverX` | number | Pixel aspect ratio |
| `calibrationType` | number | Calibration method (0 = none, 1 = geometry) |
| `calibrationDescription` | string/null | Calibration description |
| `ermf` | number | Estimated Radiographic Magnification Factor |
| `allowManualClientCalibration` | boolean | Whether user can calibrate manually |
| `fromPresentationState` | boolean | Whether calibration comes from PR state |

##### Orientation (`calibration.orientation`)

Class: `com.clientoutlook.data.OrientationPatient`

Null for secondary captures (dose reports, etc.). Present for cross-sectional imaging (MRI, CT).

| Field | Type | Description |
|-------|------|-------------|
| `positionPatient` | object | Image Position Patient (see below) |
| `orientationPatient` | object | Image Orientation Patient (see below) |
| `frameOfReferenceUID` | string | Frame of Reference UID — ties slices together |
| `isProjectionScout` | boolean | Whether this is a scout/localizer image |

###### Position Patient (`calibration.orientation.positionPatient`)

Class: `com.clientoutlook.data.ImagePositionPatient`

The x/y/z coordinates of the top-left pixel of the image in the **DICOM Patient Coordinate System**:

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `position_x` | number | mm | Left (+) to Right (−) |
| `position_y` | number | mm | Anterior (+) to Posterior (−) |
| `position_z` | number | mm | Inferior (−) to Superior (+) |

Used for sorting multi-slice series into anatomical order. For a series, sort by the axis with the most variation across slices.

###### Orientation Patient (`calibration.orientation.orientationPatient`)

Class: `com.clientoutlook.data.ImageOrientationPatient`

Direction cosines defining the row and column directions of the image:

| Field | Type | Description |
|-------|------|-------------|
| `orientX_x` | number | Row direction cosine X |
| `orientX_y` | number | Row direction cosine Y |
| `orientX_z` | number | Row direction cosine Z |
| `orientY_x` | number | Column direction cosine X |
| `orientY_y` | number | Column direction cosine Y |
| `orientY_z` | number | Column direction cosine Z |

#### Phase/Stack Info (`imagePhaseInfo`)

Class: `com.clientoutlook.data.ImagePhaseInfo`

| Field | Type | Description |
|-------|------|-------------|
| `inStackPositionNumber` | number | Slice index within a stack (536870911 = undefined) |
| `stackID` | string | Stack identifier ("-1" = no stack) |
| `temporalPositionIdentifier` | number | Position in time series (536870911 = undefined) |
| `numberOfTemporalPositions` | number | Total temporal positions (536870911 = undefined) |

#### Patient Orientation (`patientOrientation`)

Class: `com.clientoutlook.data.PatientOrientationData`

| Field | Type | Description |
|-------|------|-------------|
| `patientOrientationX` | string | Row direction label (e.g., "L", "R", "A", "P") |
| `patientOrientationY` | string | Column direction label |

#### Extra DICOM Tags (`extraImageMetadata`)

Additional DICOM metadata not covered by the structured fields above:

| Field | Type | Description |
|-------|------|-------------|
| `Modality` | string | DICOM modality code |
| `Manufacturer` | string | Scanner manufacturer |
| `InstitutionName` | string | e.g., "MGH" |
| `SeriesNumber` | string | Series number within the study |
| `SeriesDescription` | string | Series description |
| `ImageType` | string | e.g., "\\ORIGINAL\\PRIMARY\\" |
| `SOPClassUID` | string | DICOM SOP Class UID |
| `KVP` | string | X-ray tube voltage (kVp) |
| `Exposure` | string | X-ray exposure (mAs) |
| `FilterMaterial` | string | X-ray filter material |
| `ImageOrientation` | string | Image orientation string |
| `WindowCenterFirst` | number | First window center (-99999999999 = undefined) |
| `WindowWidthFirst` | number | First window width (-99999999999 = undefined) |
| `CompressionForce` | string | Mammography compression force |
| `MammoMarker` | string | Mammography marker type |
| `ImplantDisplacedSeries` | boolean | Mammography implant displacement |

#### Annotation Overlays

Seven annotation overlay types, each class `com.clientoutlook.data.Annotation`:

| Field | Description |
|-------|-------------|
| `annotationOverlay` | Standard 2D image overlay |
| `annotationOverlayMPR` | Multiplanar reconstruction overlay |
| `annotationOverlay3D` | 3D rendering overlay |
| `annotationOverlayMIP3D` | Maximum Intensity Projection overlay |
| `annotationOverlayFusion` | PET/CT fusion overlay |
| `annotationOverlayCurvedMPR` | Curved MPR overlay |
| `annotationOverlayPreSaveViewportCapture` | Pre-save viewport capture overlay |

Each overlay has text arrays for 8 positions:
- `topLeft`, `topRight`, `bottomLeft`, `bottomRight`
- `topLeftAlwaysVisible`, `topRightAlwaysVisible`, `bottomLeftAlwaysVisible`, `bottomRightAlwaysVisible`

Text arrays contain template strings with placeholders like `%PATIENT_NAME%`, `%WINDOW_LEVEL%`, `%ZOOM_FACTOR%`, etc.

#### Nuclear Medicine (`suvParameters`)

Class: `com.clientoutlook.data.SUVParameters`

For PET/nuclear medicine SUV (Standardized Uptake Value) calculation:

| Field | Type | Description |
|-------|------|-------------|
| `patientWeightInKilogram` | number | Patient weight |
| `patientHeightInMeter` | number | Patient height |
| `patientSex` | string | "M" or "F" |
| `radionuclideTotalDoseInBq` | number | Injected dose in Becquerels |
| `radionuclideHalfLifeInSecond` | number | Radionuclide half-life |
| `radiopharmaceuticalStartTime` | string/null | Injection time |
| `radiopharmaceuticalStartDateTime` | string/null | Injection datetime |
| `decayCorrectionEvent` | string | "NONE", "START", "ADMIN" |
| `correctedImageTags` | array | Applied corrections |
| `pixelValueUnits` | string/null | "BQML", "CNTS", etc. |
| `frameDurationInMillisecond` | number | Frame duration |
| `frameReferenceTimeInMillisecond` | number | Frame reference time |
| `frameAcquisitionDate` | string/null | Frame acquisition date |
| `frameAcquisitionTime` | string/null | Frame acquisition time |
| `seriesDate` | string/null | Series date |
| `seriesTime` | string/null | Series time |
| `timeZoneOffsetFromUTC` | string/null | Timezone offset |
| `philipsSUVBodyWeightScaleFactorInGramPerBq` | number | Philips-specific scale factor |

## eUnity Download Protocol

### Endpoints

All endpoints are on the eUnity server (e.g., `eunitypg.partners.org`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/e/AmfServicesServlet` | POST | AMF3 binary protocol for study metadata |
| `/e/CustomImageServlet` | POST | Image data download (`CLOWRAPPER` or `CLOPIXEL`) |

### Authentication

1. SAML chain from MyChart → eUnity yields a `JSESSIONID` cookie
2. `CLOAccessKeyID` tokens are single-use and expire in ~1–2 minutes
3. `node-fetch` fails at SAML selfauth (TLS fingerprinting) — must use `globalThis.fetch`

### AMF Protocol

Request/response use AMF3 binary serialization with typed objects:

- `com.clientoutlook.web.metaservices.AmfServicesMessage` — outer wrapper (sealed: `messageID`, `messageType`, `body`)
- `com.clientoutlook.web.metaservices.AmfServicesRequest` — request body (sealed: `service`, `method`, `parameters`)
- `com.clientoutlook.web.metaservices.AmfServicesResponse` — response body (sealed: `code`, `response`)

### Download Flow

1. SAML chain → `JSESSIONID`
2. AMF `getStudyListMeta` → study metadata with all series/instance UIDs
3. For each (seriesUID, instanceUID) pair:
   - `CustomImageServlet` with `CLOWRAPPER` → wrapper CLO file
   - `CustomImageServlet` with `CLOPIXEL` → pixel CLO file

### Key Protocol Details

- `patientId` format: `<MRN>$$$<SITE>` (triple dollar signs)
- Each image has its own seriesUID — requesting the same seriesUID with different objectUIDs returns errors
- `level` parameter varies per series (0, 3, 4)
- AMF3Writer needs string reference table for correct encoding

## Implementation Files

| File | Purpose |
|------|---------|
| `scrapers/myChart/clo-image-parser/clo_to_bitmap.ts` | Core CLO decoder + AMF3Reader |
| `scrapers/myChart/clo-image-parser/clo_to_jpg.ts` | Convenience wrapper (CLO → JPEG/PNG/WebP) |
| `scrapers/myChart/clo-image-parser/generate_clo.ts` | CLO encoder for testing |
| `scrapers/myChart/clo-image-parser/exporters/` | Format-specific exporters (JPEG, PNG, AVIF, TIFF, WebP) |
| `scrapers/myChart/eunity/imagingDirectDownload.ts` | Direct HTTP download pipeline |
| `scrapers/myChart/clo-image-parser/wasm/` | eUnity's original WASM/Dart viewer code (reference) |

## Potential: DICOM Reconstruction

Since the wrapper contains complete DICOM metadata and the pixel file contains the original pixel data (losslessly compressed via Haar wavelets), it should be possible to reconstruct proper DICOM files from CLO pairs. This would preserve the full 16-bit dynamic range and all metadata, which is more useful for medical purposes than 8-bit JPEG exports.

# Files excluded from git (contain real patient data)

The following files are important for reverse engineering the eUnity imaging viewer but contain real patient identifiers (MRN, DOB, physician name) and are excluded from git via `.gitignore`:

- `wasm/viewer.html` — eUnity WASM viewer HTML with embedded patient metadata
- `input_study_one/amf_metadata.bin` — AMF binary metadata containing patient identifiers

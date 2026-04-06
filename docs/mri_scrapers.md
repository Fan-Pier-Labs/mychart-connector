# Imaging Download Skill — Auto-Updated Progress

## Goal
Build TypeScript scripts to download ALL X-ray and MRI images from Example Health System (mychart.example.org) via the eUnity DICOM viewer at `eunity.example.org`. Quality: max (100). Use Playwright MCP ONLY for reverse engineering. Final product: pure TS scripts (using Playwright library for browser automation, NOT MCP). However, because we found that the JPG generation is entirely client side, we can start with a playwright scraper and then circle back later. 

## Instructions
- Use Playwright MCP only for inspecting eUnity site, NOT for writing Playwright TS scripts
- Final product = runnable TypeScript scripts that download all imaging
- Always use max quality (100) for JPEG exports
- Auto-update this file with progress as work continues

## Reverse Engineering Findings

### Export Mechanism (KEY DISCOVERY)
- Export is **entirely client-side** — NO server-side JPEG endpoint
- WASM viewer renders to `<canvas id="mdiStage">` (2400x1644 in 2x2 mode)
- `canvas.toDataURL('image/jpeg', 1.0)` works directly! (~1MB for 2x2 grid, ~719KB/slice in 1x1)
- The `/e/audit` POST is just logging, not serving images

### Image Loading Protocol
- `POST /e/AmfServicesServlet` — AMF binary for metadata
- `POST /e/CustomImageServlet` — compressed pixel data (proprietary binary)
- WASM decoder decompresses pixels client-side
- No standard DICOMweb/WADO endpoints available

### Viewer API (`window.VIEWER`)
- `getViewerState()` — full study/series/instance metadata
- `getViewerState().seriesData` — array of series objects (property names TBD — need debug dump)
- `getViewerState().selectedImage.seriesDescription` — current series name
- `getViewerState().selectedImage.imageCursor` — current slice position (0-based)
- `getViewerState().screenLayout.layoutName` — current layout (e.g. `1upStudyBox`, `1upStudyBox2x2upSeriesBox`)
- `openImage({studyUID, seriesUID, instanceNumber, frameNumber})` — does NOT work for series switching
- `executeCommandByName(cmd)` — toolbar commands
- Layout: MRI opens in 2x2 grid, X-ray in 1x1

### Auth Chain
1. MyChart `LoadReportContent` → extract `data-fdi-context` (fdi + ord)
2. `GET /Home/CSRFToken` → fresh CSRF token
3. `POST /Extensibility/Redirection/FdiData?fdi=...&ord=...` → `{url: "https://sts.example.org/..."}`
4. Follow SAML chain: STS → redirect.example.org → selfauth → eunity.example.org
5. Result: `CLOAccessKeyID` in URL + `JSESSIONID` cookie (single-use!)

### Critical: Dart/WASM UI Event Handling
- eUnity is built with **Dart compiled to JS/WASM**
- Native browser mouse events required — `element.click()` via JS does NOT trigger Dart event handlers
- Must use `page.mouse.click(x, y)` at coordinates found via `page.evaluate()`
- `page.evaluate(() => el.click())` = BROKEN for Dart UI
- `page.mouse.click(x, y)` = WORKS for Dart UI

## Current State (2026-03-03)

### Working
- [x] FDI context extraction from MyChart report HTML
- [x] SAML URL generation via FdiData API
- [x] SAML chain following (Playwright handles redirects automatically)
- [x] Canvas JPEG capture via `toDataURL('image/jpeg', 1.0)` — max quality
- [x] FL SHOULDER ARTHROGRAM: 10/10 images (8 fluoroscopy + 2 radiation dose) — PERFECT
- [x] Layout detection (1x1 vs 2x2)
- [x] Slice advancement via mouse wheel scroll with cursor tracking

### Partially Working
- [~] X-ray: 2/3 series downloaded in first run (series 3 "R GRID AXILLARY" missed — tray label not visible)
- [~] Series tray opening (works for some studies, not all)

### Not Working / In Progress
- [ ] **VIEWER seriesData property names unknown** — `seriesDescription`, `instanceCount` etc. fallback to `Series_N` and count=1. Need debug dump to find correct keys.
- [ ] **Series switching for MRI** — MRI download hung after "eUnity loaded: 10 series" in first run. Second run (with JS click instead of Playwright click) downloaded 3 X-ray images but they were ALL identical (series never switched). Root cause: `element.click()` doesn't fire Dart events.
- [ ] **Layout switching for MRI** — code tries to click "2x2 Series" button then "1 Series" option. Untested with latest coordinate-click approach.

### Latest Fix (v3 rewrite)
Rewrote `imagingDownloader.ts` with hybrid approach:
1. Find element coordinates via `page.evaluate()` (no Playwright locator timeouts)
2. Click via `page.mouse.click(x, y)` (native events for Dart compatibility)
3. Added debug dump of `VIEWER.getViewerState().seriesData[0]` keys/values
4. Added detailed logging at every step
5. Series tray: scroll elements into view before getting bounding box
6. Fixed label regex to handle "StudyN-N:" prefix format

## Key Bugs to Fix
1. **seriesData property names**: Need to run with debug logging to discover correct property names for series description and instance count
2. **Series switching**: The coordinate-click approach needs real-world testing. Previous approaches failed because: (a) Playwright locators hung on invisible elements, (b) JS `element.click()` didn't fire Dart events
3. **X-ray tray scroll**: Series labels like "1-3: R GRID AXILLARY" are off-screen in the tray and need scrollIntoView

## Key Files
- `src/main/scrapers/myChart/labs_and_procedure_results/imagingDownloader.ts` — Playwright-based downloader (v3)
- `src/main/scrapers/myChart/labs_and_procedure_results/imagingViewer.ts` — FDI/SAML chain
- `src/cli.ts` — CLI integration (`--action get-imaging`)
- `imaging-downloads/DICOM_DOWNLOAD_NOTES.md` — detailed reverse engineering notes

## Test Results History
| Run | Study | Series | Images | Notes |
|-----|-------|--------|--------|-------|
| v1 | XR Shoulder | 3 | 2/3 | Series 3 missed (tray label not visible, "1-2:" format) |
| v1 | FL Shoulder | 2 | 10/10 | PERFECT (8 fluoro + 2 radiation dose) |
| v1 | MRI Shoulder | 10 | 0 | HUNG after "eUnity loaded: 10 series" |
| v2 | XR Shoulder | 3 | 3/3 | All 3 identical images (JS click didn't switch series) |
| v2 | FL Shoulder | 2 | 1/? | Stopped early (task killed) |
| v3 | — | — | — | Pending test (coordinate-click approach) |
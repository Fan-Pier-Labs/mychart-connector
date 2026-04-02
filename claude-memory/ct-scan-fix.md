# CT Scan eUnity Fix - Reverse Engineering Findings

## Problem
CT scan images return 403 from CustomImageServlet while X-rays work fine.

## Root Cause
The eUnity viewer uses a **two-phase AMF initialization** for studies that have a different `serviceInstance` than the one in the viewer URL:

1. **Phase 1**: AMF call with `serviceInstance` from viewer HTML (e.g., `MyChart`)
   - Server responds with study metadata including the **real** `serviceInstance` (e.g., `UCSFVNAEDGEBundle`)
2. **Phase 2**: AMF call with the real `serviceInstance`
   - This actually initializes the image download session

Our scraper only does Phase 1 and uses the initial `serviceInstance` for image downloads → 403.

## Fix Required
1. Parse `serviceInstance` from the first AMF response (look for it as a string in the binary)
2. If different from the initial one, make a second AMF call with the real value
3. Use the real `serviceInstance` for all CustomImageServlet calls
4. Add `image/CLJPEG` to contentType for CLOWRAPPER requests (browser includes it)

## Key Values Observed (UCSF)
- Initial serviceInstance from viewer HTML: `MyChart`
- Real serviceInstance from AMF response: `UCSFVNAEDGEBundle`
- contentType browser sends: `image/CLWAVE;image/CLHAAR;image/CLJPEG`
- Our scraper sends: `image/CLWAVE;image/CLHAAR` (missing CLJPEG)

## Files to Modify
- `scrapers/myChart/eunity/imagingDirectDownload.ts`:
  - `initializeAmfSession()` — parse real serviceInstance from response
  - `downloadImagingStudyDirect()` — make second AMF call if serviceInstance differs
  - `downloadImage()` — add `image/CLJPEG` to contentType

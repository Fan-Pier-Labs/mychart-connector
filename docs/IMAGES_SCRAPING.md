IMAGES_SCRAPING.md

⏺ The MRI is still processing (10 series with lots of slices takes time). To answer your question:

  It uses Playwright as a library. Here's why this is necessary:

  The eUnity DICOM viewer has no server-side JPEG API. The image export is entirely client-side:
  1. Compressed pixel data arrives via POST /e/CustomImageServlet (proprietary binary format)
  2. A WASM decoder decompresses it in the browser
  3. The rendered image lives only on an HTML <canvas> element
  4. JPEG export = canvas.toDataURL('image/jpeg', 1.0) — this only works in a browser context

  There's no HTTP endpoint I can call to get a JPEG. The raw pixel data from CustomImageServlet uses a proprietary binary format decoded by their WASM code, and the standard DICOMweb/WADO endpoints return 404.

  So the architecture is:
  - Pure TypeScript for: MyChart login, FDI context extraction, SAML URL generation, report scraping
  - Playwright (the npm library) for: loading the eUnity viewer in a headless browser, switching layouts/series, and capturing canvas data as JPEGs

  The Playwright MCP tool is only used here for reverse engineering — not in the final scripts. The actual downloader (imagingDownloader.ts) imports playwright as a regular npm dependency.

  Let me check on the MRI download progress.



this is a good start. 


  TODO: download the raw data from the endpoints, and download and isolate the wasm code. we want to reverse engineer this client side so we can use pure ts. 
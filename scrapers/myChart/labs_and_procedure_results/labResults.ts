import { HistoricalResultsResponse, ImagingResult, LabTestResult, LabTestResultWithHistory, ReportContent, ReportDetails } from "./labtestresulttype";
import { LabResultsList } from "./labtypes";
import { login_TEST } from "../login";
import { MyChartRequest } from "../myChartRequest";
import { getRequestVerificationTokenFromBody } from "../util";
import { extractFdiContext, getImageViewerSamlUrl, followSamlChain } from "../eunity/imagingViewer";


async function getReportContent(mychartRequest: MyChartRequest, reportDetails: ReportDetails, requestVerificationToken: string): Promise<ReportContent> {
  const res = await mychartRequest.makeRequest({
    path: `/api/report-content/LoadReportContent`,
    "headers": {
      "Content-Type": "application/json; charset=utf-8",
      __requestverificationtoken: requestVerificationToken
    },
    "body": JSON.stringify({
      "reportID": reportDetails.reportID,
      "assumedVariables": {
        "ordId": reportDetails.reportVars.ordId,
        "ordDat": reportDetails.reportVars.ordDat
      },
      "isFullReportPage": false,
      "uniqueClass": "EID-4",
      "nonce": ""
    }),
    "method": "POST",
  });

  return await res.json();
}

async function getRequestVerificationToken(mychartRequest: MyChartRequest) {

  // Go to the communication center
  const communicationCenterRes = await mychartRequest.makeRequest({ path: '/app/test-results' })
  return getRequestVerificationTokenFromBody(await communicationCenterRes.text())
}


async function getLabResult(mychartRequest: MyChartRequest, key: string, requestVerificationToken: string): Promise<LabTestResult> {
  const res = await mychartRequest.makeRequest({
    path: `/api/test-results/GetDetails`,
    "headers": {
      "Content-Type": "application/json; charset=utf-8",
      __requestverificationtoken: requestVerificationToken
    },
    "body": JSON.stringify({ "orderKey": key, "organizationID": "", "PageNonce": "" }),
    "method": "POST",
  });

  const out = await res.json() as LabTestResult;

  for (const result of out.results ?? []) {
    if (result?.reportDetails?.reportID) {

      const reportdata = await getReportContent(mychartRequest, result.reportDetails, requestVerificationToken)

      result.reportDetails.reportContent = reportdata;
    }
  }

  return out
}


async function getHistoricalResults(
  mychartRequest: MyChartRequest,
  orderKey: string,
  requestVerificationToken: string
): Promise<HistoricalResultsResponse | null> {
  try {
    const res = await mychartRequest.makeRequest({
      path: '/api/past-results/GetMultipleHistoricalResultComponents',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        __requestverificationtoken: requestVerificationToken,
      },
      body: JSON.stringify({
        orderID: orderKey,
        selectedComponentIDs: [],
        isInitialLoad: true,
        startTime: '',
        endTime: '',
        organizationID: '',
        isCustomFilterEnabled: false,
        PageNonce: '',
      }),
      method: 'POST',
    });

    if (!res.ok) return null;
    return await res.json() as HistoricalResultsResponse;
  } catch {
    return null;
  }
}

export async function listLabResults(mychartRequest: MyChartRequest): Promise<LabTestResultWithHistory[]> {

  const requestVerificationToken = await getRequestVerificationToken(mychartRequest)

  if (!requestVerificationToken) {
    console.log('could not find request verification token')
    return []
  }

  const allresults: LabTestResultWithHistory[] = []
  const seenKeys = new Set<string>();

  // Fetch all group types (0-3) to capture all test results including blood panels
  for (const groupType of [0, 1, 2, 3]) {
    try {
      const messages = await mychartRequest.makeRequest({
        path: '/api/test-results/GetList',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          '__RequestVerificationToken': requestVerificationToken,
        },
        body: JSON.stringify({ groupType, searchString: '', maxResults: 50, isCurAdmFilterEnabled: false }),
        method: 'POST',
      });

      if (!messages.ok) continue;

      const out = await messages.json() as LabResultsList;

      for (const newResultGroup of out.newResultGroups || []) {
        if (seenKeys.has(newResultGroup.key)) continue;
        seenKeys.add(newResultGroup.key);

        const labResult: LabTestResultWithHistory = await getLabResult(mychartRequest, newResultGroup.key, requestVerificationToken);
        console.log('got detail back:', labResult.orderName)

        // Fetch historical trend data for this order
        const history = await getHistoricalResults(mychartRequest, newResultGroup.key, requestVerificationToken);
        if (history) {
          labResult.historicalResults = history;
        }

        allresults.push(labResult)
      }
    } catch {
      // Some group types may not be supported by this MyChart instance
    }
  }

  return allresults;
}


export async function getImagingResults(mychartRequest: MyChartRequest, options?: { followSaml?: boolean }): Promise<ImagingResult[]> {
  const requestVerificationToken = await getRequestVerificationToken(mychartRequest);

  if (!requestVerificationToken) {
    console.log('could not find request verification token for imaging');
    return [];
  }

  // Try multiple group types - imaging may be in a different group
  const allResults: ImagingResult[] = [];
  const seenKeys = new Set<string>();

  for (const groupType of [0, 1, 2, 3]) {
    try {
      const resp = await mychartRequest.makeRequest({
        path: '/api/test-results/GetList',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          '__RequestVerificationToken': requestVerificationToken,
        },
        body: JSON.stringify({ groupType, searchString: '', maxResults: 50, isCurAdmFilterEnabled: false }),
        method: 'POST',
      });

      if (!resp.ok) continue;

      const out = await resp.json() as LabResultsList;

      for (const resultGroup of out.newResultGroups || []) {
        if (seenKeys.has(resultGroup.key)) continue;
        seenKeys.add(resultGroup.key);

        const labResult = await getLabResult(mychartRequest, resultGroup.key, requestVerificationToken);

        // Check if this result has imaging content (structured data or keyword match)
        const nameLower = labResult.orderName?.toLowerCase() ?? '';
        const isImagingByName =
          nameLower.includes('x-ray') || nameLower.includes('xray') || nameLower.includes('xr ') ||
          nameLower.includes('mri') || nameLower.includes('ct ') || nameLower.includes('ct,') ||
          nameLower.includes('imaging') || nameLower.includes('radiology') ||
          nameLower.includes('ultrasound') || nameLower.includes('fluoroscop') ||
          nameLower.includes('arthrogram') || nameLower.includes('mammogram') ||
          nameLower.includes('oct,') || nameLower.includes('oct ') ||
          nameLower.includes('pathology') || nameLower.includes('excision');
        const hasImagingData = labResult.results?.some(r =>
          (r.imageStudies && r.imageStudies.length > 0) ||
          (r.scans && r.scans.length > 0) ||
          r.studyResult?.narrative?.hasContent ||
          r.studyResult?.impression?.hasContent ||
          r.reportDetails?.reportID
        );
        const hasImaging = isImagingByName || hasImagingData;

        if (hasImaging) {
          const imagingResult: ImagingResult = { ...labResult };

          // Extract report text from narrative + impression
          const reportParts: string[] = [];
          for (const r of labResult.results ?? []) {
            if (r.studyResult?.narrative?.hasContent) {
              reportParts.push(r.studyResult.narrative.contentAsString);
            }
            if (r.studyResult?.impression?.hasContent) {
              reportParts.push('IMPRESSION: ' + r.studyResult.impression.contentAsString);
            }
          }
          if (reportParts.length > 0) {
            imagingResult.reportText = reportParts.join('\n\n');
          }

          // Extract FDI context from report content HTML (for image viewer access)
          for (const r of labResult.results ?? []) {
            if (r.reportDetails?.reportContent?.reportContent) {
              const fdi = extractFdiContext(r.reportDetails.reportContent.reportContent);
              if (fdi) {
                imagingResult.fdiContext = fdi;

                // Get the SAML URL for the image viewer
                try {
                  const session = await getImageViewerSamlUrl(mychartRequest, fdi);
                  if (session) {
                    imagingResult.samlUrl = session.samlUrl;

                    // Optionally follow the SAML chain to get the eUnity viewer URL
                    if (options?.followSaml) {
                      const viewerSession = await followSamlChain(mychartRequest, session.samlUrl);
                      if (viewerSession) {
                        imagingResult.viewerUrl = viewerSession.viewerUrl;
                      }
                    }
                  }
                } catch (err) {
                  console.log('Error getting viewer URL:', (err as Error).message);
                }

                break; // Only need FDI from one result
              }
            }
          }

          allResults.push(imagingResult);
        }
      }
    } catch {
      // Some group types may not be supported by this MyChart instance
    }
  }

  return allResults;
}


async function test() {
  const mychartRequest = await login_TEST('mychart.example.org')

  const labresults = await listLabResults(mychartRequest)

  // const verificationtoken = await getRequestVerificationToken(mychartRequest)

  // // const labresults = await getLabResult(mychartRequest, 'WP-249LQ11wkP8SwrVbZakPwK2g-3D-3D-24qwHst6DyZlk7obuDd6Gho16-2F3S-2BypDIGyTtp1dJYThc-3D', verificationtoken)
  // const labresults = await getLabResult(mychartRequest, 'WP-24QvFqBxM5P2VEehMHXypjtA-3D-3D-24yYqau894Z-2F-2FzME-2F3wrC8wxS3mgP9ZzzELfC-2B2XJkcrg-3D', verificationtoken)

  console.log(JSON.stringify(labresults, null, 2))


}

if (require.main === module) {

  test()

}
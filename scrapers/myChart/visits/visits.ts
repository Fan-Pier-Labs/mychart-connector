import { login_TEST } from "../login";
import { MyChartRequest } from "../myChartRequest";
import { getRequestVerificationTokenFromBody } from "../util";
import { PastVisitsContainer, VisitListContainer } from "./types";


export async function upcomingVisits(myChartRequest: MyChartRequest) {

  const res = await myChartRequest.makeRequest({ path: '/Visits/VisitsList?noCache=' + Math.random() })

  const requestVerificationToken = getRequestVerificationTokenFromBody(await res.text())

  if (!requestVerificationToken) {
    console.log('could not find request verification token', res)
    return { visits: [], error: 'Authentication error: could not get CSRF token for visits' }
  }


  const result = await myChartRequest.makeRequest({
    path: '/Visits/VisitsList/LoadUpcoming?timeZone=America%2FNew_York&ComponentNumber=5&noCache=' + Math.random(),
    "headers": {
      __requestverificationtoken: requestVerificationToken
    },
    "method": "POST",
  })

  const json = await result.json() as VisitListContainer

  return json
}



export async function pastVisits(myChartRequest: MyChartRequest, oldestRenderedDate: Date) {

  const res = await myChartRequest.makeRequest({ path: '/Visits/VisitsList?noCache=' + Math.random() })

  const requestVerificationToken = getRequestVerificationTokenFromBody(await res.text())

  if (!requestVerificationToken) {
    console.log('could not find request verification token', res)
    return { visits: [], error: 'Authentication error: could not get CSRF token for visits' }
  }


  // Match LoadUpcoming's request shape: no body, no Content-Type header.
  // The original implementation used application/x-www-form-urlencoded + body
  // 'serializedIndex=', which trips F5 Volterra WAF rules on some MyChart
  // deployments. The WAF returns 200 OK with a text/html "Request Rejected"
  // page (served by 'volt-adc'), which makes the JSON parse throw
  // 'Unexpected token <' rather than surface as an auth failure.
  //
  // Important: omit body entirely (not `body: ''`). On Node's undici fetch,
  // an empty-string body still triggers an auto-added
  // 'Content-Type: text/plain;charset=UTF-8'. Omitting body sends no
  // Content-Type at all on both Bun and Node, which is the shape the WAF
  // accepts and matches what upcomingVisits has always done.
  const result = await myChartRequest.makeRequest({
    path: '/Visits/VisitsList/LoadPast?loadpast=1&searchString=&oldestRenderedDate=' + oldestRenderedDate.toISOString() + '&ComponentNumber=7&noCache=' + Math.random(),
    "headers": {
      __requestverificationtoken: requestVerificationToken,
    },
    "method": "POST",
  })

  const json = await result.json() as PastVisitsContainer

  return json
}



if (import.meta.main) {
  (async () => {
    const mychartRequest = await login_TEST('mychart.example.org')
    await pastVisits(mychartRequest, new Date('2025-01-01T00:30:50.183Z'))
  })()
}
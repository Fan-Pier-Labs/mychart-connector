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
    "body": '',
    "method": "POST",
  })

  const json = await result.json() as VisitListContainer

  console.log(json)

  return json
}



export async function pastVisits(myChartRequest: MyChartRequest, oldestRenderedDate: Date) {

  const res = await myChartRequest.makeRequest({ path: '/Visits/VisitsList?noCache=' + Math.random() })

  const requestVerificationToken = getRequestVerificationTokenFromBody(await res.text())

  if (!requestVerificationToken) {
    console.log('could not find request verification token', res)
    return { visits: [], error: 'Authentication error: could not get CSRF token for visits' }
  }


  const result = await myChartRequest.makeRequest({
    path: '/Visits/VisitsList/LoadPast?loadpast=1&searchString=&oldestRenderedDate=' + oldestRenderedDate.toISOString() + '&ComponentNumber=7&noCache=' + Math.random(),
    "headers": {
      __requestverificationtoken: requestVerificationToken,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    "body": 'serializedIndex=',
    "method": "POST",
  })

  const json = await result.json() as PastVisitsContainer

  console.log(json)

  return json
}



if (require.main === module) {
  (async () => {
    const mychartRequest = await login_TEST('mychart.example.org')
    await pastVisits(mychartRequest, new Date('2025-01-01T00:30:50.183Z'))
  })()
}
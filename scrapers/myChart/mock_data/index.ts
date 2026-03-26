import { RequestConfig } from '../types';
import { billing_page_section, bills_details_html_page, bills_visit_list, get_pdf, payment_list, statement_list } from './bills';
import { firstPathPart } from './firstPathPart'
import { getTestDetails, getTestResultsList, test_results_html_page } from './labs';
import { doLogin, home, insideASP, login, secondaryValidation, secondaryValidationSMSConsent, smsVerification, validate2faCode } from './login'
import { loadUpcomingVisits } from './visits';

export async function mockRequest(inputUrl: string, config: RequestConfig): Promise<Response> {

  const parsedUrl = new URL(inputUrl);
  let pathname = parsedUrl.pathname;

  if (pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }

  const data = [
    firstPathPart,
    login,
    doLogin,
    secondaryValidation,
    smsVerification,
    home,
    secondaryValidationSMSConsent,
    validate2faCode,
    loadUpcomingVisits,
    insideASP,
    test_results_html_page,
    getTestResultsList,
    getTestDetails,
    billing_page_section,
    bills_details_html_page,
    bills_visit_list,
    statement_list,
    payment_list,
    get_pdf
  ]

  for (const mockDataGroup of data) {
    for (const path of mockDataGroup.path) {

      if (pathname === path) {
        if (mockDataGroup.handle) {
          return mockDataGroup.handle(inputUrl, config);
        }
        else {
          return mockDataGroup.response!.clone();
        }
      }
    }
  }

  console.log('no mock data found for', pathname)
  process.exit(1)
}



async function test() {

  const response = await mockRequest('https://mychart.example.org/Authentication/Login', {})

  console.log(response)

}

if (require.main === module) {
  test()
}
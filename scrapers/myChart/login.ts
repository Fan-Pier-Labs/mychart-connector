import { MyChartRequest } from "./myChartRequest";
import * as cheerio from 'cheerio';

import fs from 'fs';
import { getRequestVerificationTokenFromBody } from "./util";
import { changeDirToPackageRoot } from "../../shared/util";
import { sendTelemetryEvent } from "../../shared/telemetry";
import { acceptTermsAndConditions } from "./termsAndConditions";


// Just for testing / local development
// reads local creds from disk
function readTestCredentials_TEST_ONLY() {
  return JSON.parse(fs.readFileSync('creds.json', 'utf-8'))
}


export function parseFirstPathPartFromHtml(html: string): string | null {
  const $ = cheerio.load(html);
  const refreshTag = $('meta[http-equiv="REFRESH"]');
  const possibleFirstPathPart = refreshTag?.attr('content')?.split(';')?.[1]?.trim()?.split('=')?.[1]?.replaceAll?.('/', '');
  return possibleFirstPathPart || null;
}

export function parseFirstPathPartFromLocation(locationHeader: string, hostname: string, protocol = 'https'): string | null {
  const url = new URL(locationHeader, protocol + '://' + hostname);
  const part = url.pathname.split('/')[1];
  return part || null;
}

async function determineFirstPathPart(mychartRequest: MyChartRequest): Promise<MyChartRequest | null> {

  if (mychartRequest.firstPathPart) {
    console.log('first path part already determined', mychartRequest.firstPathPart)
    return mychartRequest;
  }

  const pathResponse = await mychartRequest.makeRequest({followRedirects: false, url: mychartRequest.protocol + '://' + mychartRequest.hostname })

  const locationResponseHeader = pathResponse.headers.get('Location')
  console.log('location response header', locationResponseHeader)

  let firstPathPart;

  if (locationResponseHeader) {
    firstPathPart = parseFirstPathPartFromLocation(locationResponseHeader, mychartRequest.hostname, mychartRequest.protocol);
    console.log('first path part', firstPathPart)
  }
  else {
    console.log('Looking for first path part: no location response header')
  }

  if (!firstPathPart) {
    const body = await pathResponse.text()
    firstPathPart = parseFirstPathPartFromHtml(body);
    if (firstPathPart) {
      console.log('extracted first url path part from the body')
    }
    else {
      console.log('could not extract second part', body)
    }
  }

  if (!firstPathPart) {
    console.log('Could not find first path part');
    console.log('TODO: handle this error better')
    return mychartRequest;
  }

  mychartRequest.setFirstPathPart(firstPathPart);

  return mychartRequest;

}

export type TwoFaDeliveryInfo = {
  method: 'email' | 'sms';
  contact?: string; // masked contact, e.g. "***-***-7204" or "ry***@gmail.com"
}

export type LoginResult = {
  state: 'logged_in' | 'need_2fa' | 'invalid_login' | 'error'
  error?: string
  mychartRequest: MyChartRequest;

  // only set if need2fa is true
  twoFaSentTime?: number;
  twoFaDelivery?: TwoFaDeliveryInfo;

}

/**
 * Parse the secondary validation (2FA) page to detect which delivery methods are available.
 * Real MyChart pages show buttons like "Email to me" or "Text to my phone".
 * Returns which methods are available and any masked contact info found near the buttons.
 */
export function parse2faDeliveryMethods(html: string): {
  hasEmail: boolean;
  hasSms: boolean;
  emailContact?: string;
  smsContact?: string;
} {
  const $ = cheerio.load(html);
  let hasEmail = false;
  let hasSms = false;
  let emailContact: string | undefined;
  let smsContact: string | undefined;

  // Look at all buttons and links on the page for delivery method indicators
  $('button, a, [role="button"]').each((_, el) => {
    const text = $(el).text().toLowerCase().trim();
    if (text.includes('email')) {
      hasEmail = true;
      // Try to extract masked email from button text or nearby elements
      const fullText = $(el).text().trim();
      const emailMatch = fullText.match(/[\w*]+\*+[\w*]*@[\w.]+/);
      if (emailMatch) emailContact = emailMatch[0];
    }
    if (text.includes('text') || text.includes('phone') || text.includes('sms')) {
      hasSms = true;
      // Try to extract masked phone from button text or nearby elements
      const fullText = $(el).text().trim();
      const phoneMatch = fullText.match(/[\d*][\d*-]+[\d*]/);
      if (phoneMatch) smsContact = phoneMatch[0];
    }
  });

  // Also look in paragraph/span text near the buttons for masked contact info
  $('p, span, div').each((_, el) => {
    const text = $(el).text();
    if (!emailContact) {
      const emailMatch = text.match(/[\w*]+\*+[\w*]*@[\w.]+/);
      if (emailMatch) emailContact = emailMatch[0];
    }
    if (!smsContact) {
      const phoneMatch = text.match(/\*{2,}[\d*-]*\d{4}/);
      if (phoneMatch) smsContact = phoneMatch[0];
    }
  });

  return { hasEmail, hasSms, emailContact, smsContact };
}

// takes in the user + pass
// and returns 1 of two things:
// 1. login success and were golden
// 2. we need 2fa code to complete login process
// Note that this flow will trigger the 2fa code to be sent to the user's email
// if were going the 2fa flow
export async function myChartUserPassLogin ({hostname, user, pass, skipSendCode, protocol}: {hostname: string, user: string, pass: string, skipSendCode?: boolean, protocol?: string}): Promise<LoginResult> {
  // Fire-and-forget telemetry — never blocks or breaks the scraper
  sendTelemetryEvent('scraper_login_started', { hostname });

  if (!hostname || !user || !pass) {
    console.log('missing hostname, user, or pass', {hostname, user, pass})
    throw new Error('Missing hostname, user, or pass')
  }


  const effectiveProtocol = protocol ?? (hostname.startsWith('localhost') ? 'http' : 'https');
  const mychartRequest = new MyChartRequest(hostname, effectiveProtocol);

  const foundMyChartFirstPathPart = await determineFirstPathPart(mychartRequest)

  if (!foundMyChartFirstPathPart) {
    console.log('could not determine first path part')
    return {state: 'error', error: 'could not determine first path part', mychartRequest}
  }


  // await mychartRequest.loadCookies('cookies.json');

  // The homepage has a __RequestVerificationToken that we need to extract.
  // Also get the cookies in the jar as well
  const firstRequst = await mychartRequest.makeRequest({path: '/Authentication/Login'})

  const loginPageHtml = await firstRequst.text()
  const $ = cheerio.load(loginPageHtml);

  let requestVerificationToken = getRequestVerificationTokenFromBody(loginPageHtml)

  console.log('request verification token:', requestVerificationToken)

  // Extract additional hidden fields that MyChart expects
  const navRequestMetrics = $('input[name="__NavigationRequestMetrics"]').attr('value') || '';
  const navRedirectMetrics = $('input[name="__NavigationRedirectMetrics"]').attr('value') || '[]';
  const redirectChainIncludesLogin = $('input[name="__RedirectChainIncludesLogin"]').attr('value') || '0';
  const currentPageLoadDescriptor = $('input[name="__CurrentPageLoadDescriptor"]').attr('value') || '';
  const rttCaptureEnabled = $('input[name="__RttCaptureEnabled"]').attr('value') || '1';

  // Detect whether this MyChart instance uses "LoginIdentifier" or "Username"
  // by checking the login controller JS referenced on the page.
  let usernameField = 'LoginIdentifier'; // newer default
  const loginControllerSrc = $('script[src*="loginpagecontroller"]').attr('src');
  if (loginControllerSrc) {
    try {
      const jsUrl = loginControllerSrc.startsWith('http')
        ? loginControllerSrc
        : mychartRequest.protocol + '://' + hostname + loginControllerSrc;
      const jsResp = await mychartRequest.makeRequest({ url: jsUrl });
      const jsText = await jsResp.text();
      const credMatch = jsText.match(/Credentials:\s*\{([^}]{0,300})\}/);
      if (credMatch && credMatch[1].includes('Username') && !credMatch[1].includes('LoginIdentifier')) {
        usernameField = 'Username';
      }
      console.log('Detected credential field:', usernameField);
    } catch (e) {
      console.log('Could not detect credential field, defaulting to', usernameField, e);
    }
  }

  // b64EncodeUnicode handles unicode chars properly (matching WP.Utils.b64EncodeUnicode from MyChart JS)
  const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));

  const LoginInfo = encodeURIComponent(JSON.stringify({
    "Type": "StandardLogin",
    "Credentials": {
      [usernameField]: b64EncodeUnicode(user),
      "Password": b64EncodeUnicode(pass)
    }}
  ))

  const loginBody = "__RequestVerificationToken=" + requestVerificationToken
    + "&DeviceId=&postLoginUrl=&LoginInfo=" + LoginInfo
    + "&__NavigationRequestMetrics=" + encodeURIComponent(navRequestMetrics)
    + "&__NavigationRedirectMetrics=" + encodeURIComponent(navRedirectMetrics)
    + "&__RedirectChainIncludesLogin=" + redirectChainIncludesLogin
    + "&__CurrentPageLoadDescriptor=" + encodeURIComponent(currentPageLoadDescriptor)
    + "&__RttCaptureEnabled=" + rttCaptureEnabled;

  const res = await mychartRequest.makeRequest({
    path: "/Authentication/Login/DoLogin",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    "body": loginBody,
    "method": "POST",
  });

  const secondaryAuthPage = await res.text()
  const responseUrl = res.url || '';

  // If the user is required to set up 2fa but hasn't set up 2fa yet, there may be a message stating that they have to set up 2fa.

  // Check for login failure first (can appear in URL or body)
  const bodyLower = secondaryAuthPage.toLocaleLowerCase();
  const urlLower = responseUrl.toLocaleLowerCase();
  if (bodyLower.includes('login failed') || bodyLower.includes('login unsuccessful') || urlLower.includes('loginfailed')) {
    console.log('Login failed with username ', user, hostname)
    return {
      state: 'invalid_login',
      error: 'Username or password is incorrect',
      mychartRequest
    }
  }

  // If we need to do 2fa (check both body content and response URL):
  if (secondaryAuthPage.includes('secondaryvalidationcontroller') || urlLower.includes('secondaryvalidation')) {

    requestVerificationToken = getRequestVerificationTokenFromBody(secondaryAuthPage)
    console.log('new request verification token:', requestVerificationToken)

    if (!requestVerificationToken) {
      console.log('could not find request verification token', secondaryAuthPage)
      return {state: 'error', error: 'could not find request verification token', mychartRequest}
    }

    const codeSendTimeBefore = Date.now()

    // Detect which 2FA delivery methods are available on the page
    const deliveryMethods = parse2faDeliveryMethods(secondaryAuthPage);
    console.log('2FA delivery methods:', JSON.stringify(deliveryMethods));

    let twoFaDelivery: TwoFaDeliveryInfo | undefined;

    // When using TOTP, we skip SendCode — the code is generated locally.
    if (!skipSendCode) {
      // I don't think we need to do this, but just in case
      await mychartRequest.makeRequest({path: '/Authentication/SecondaryValidation/GetSMSConsentStrings?noCache=' + Math.random()})

      // Prefer email; fall back to SMS/phone if email isn't available
      const useEmail = deliveryMethods.hasEmail || (!deliveryMethods.hasEmail && !deliveryMethods.hasSms);

      const sendCodeResp = await mychartRequest.makeRequest({
        path: "/Authentication/SecondaryValidation/SendCode?noCache=" + Math.random(),
        "headers": {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          '__RequestVerificationToken': requestVerificationToken,
        },
        "body": `deliveryMethodEmail=${useEmail}&resendCode=false&workflow=1`,
        "method": "POST",
      });

      // Try to extract masked contact info from the SendCode response
      const sendCodeBody = await sendCodeResp.text();
      let contact: string | undefined;
      if (useEmail) {
        contact = deliveryMethods.emailContact;
        // Also try parsing contact from the SendCode response
        if (!contact) {
          const emailMatch = sendCodeBody.match(/[\w*]+\*+[\w*]*@[\w.]+/);
          if (emailMatch) contact = emailMatch[0];
        }
        twoFaDelivery = { method: 'email', contact };
        console.log(`Asked for a 2FA code to be sent to email${contact ? ` (${contact})` : ''}, waiting for email to arrive`);
      } else {
        contact = deliveryMethods.smsContact;
        if (!contact) {
          const phoneMatch = sendCodeBody.match(/\*{2,}[\d*-]*\d{4}/);
          if (phoneMatch) contact = phoneMatch[0];
        }
        twoFaDelivery = { method: 'sms', contact };
        console.log(`Asked for a 2FA code to be sent via SMS${contact ? ` (${contact})` : ''}`);
      }
    } else {
      console.log("Skipping SendCode (using TOTP)")
    }

    return {
      state: 'need_2fa',
      twoFaSentTime: codeSendTimeBefore,
      twoFaDelivery,
      mychartRequest
    }

  }

  // We are logged in!
  if (bodyLower.includes('md_home_index')) {
    return {
      state: 'logged_in',
      mychartRequest
    }
  }

  // Check if we landed on Terms & Conditions page — auto-accept silently
  if (bodyLower.includes('termsconditions') || bodyLower.includes('terms and conditions')) {
    console.log('Landed on Terms & Conditions page after login, auto-accepting');
    const accepted = await acceptTermsAndConditions(mychartRequest);
    if (accepted) {
      return {
        state: 'logged_in',
        mychartRequest
      }
    }
    console.log('Failed to auto-accept Terms & Conditions');
    return {
      state: 'error',
      error: 'Failed to accept MyChart Terms & Conditions',
      mychartRequest
    }
  }

  console.log('i am at some page, i dont know what to do!')
  console.log('Response URL:', responseUrl)
  console.log('Page snippet (first 500 chars):', secondaryAuthPage.substring(0, 500))

  return {
    state: 'error',
    error: 'Login failed: ended up on an unexpected page',
    mychartRequest
  }

}


// We have the 2fa code from the user's email, now we need to complete the login flow and get the remaining cookies
// then we have full access to the user's mychart account.

export type TwoFaResult = {
  state: 'logged_in' | 'invalid_2fa' | 'error'
  mychartRequest: MyChartRequest
}

export async function complete2faFlow({mychartRequest, code, twofaCodeArray, isTOTP}: {mychartRequest: MyChartRequest, code?: string, twofaCodeArray?: {code: string; score: number}[], isTOTP?: boolean}): Promise<TwoFaResult> {

  // Accept either a single code string or an array of scored codes
  const codeArray = twofaCodeArray ?? (code ? [{code, score: 1}] : []);
  const sortedCodes = codeArray.sort((a, b) => b.score - a.score);

  // // To make sure we don't grab an old code from the user's email, we only look for emails that arrived after the above API request was made. 
  // // Also, look up to 5 seconds before the request was made.
  // // And check continously for a code to arrive for up to a minute. 
  // const code = await get2FaCodeFromEmail(codeSendTimeBefore - 1000 * 5, fromEmail!);



  // Make another HTTP call to the secondary auth page to get the request verification token. 
  // This isn't necessary, but is the easiest way if we want to split the before 2fa and after 2fa steps. 
  const res = await mychartRequest.makeRequest({path: "/Authentication/SecondaryValidation"});

  const secondaryAuthPage = await res.text()
  const requestVerificationToken = getRequestVerificationTokenFromBody(secondaryAuthPage)

  if (!requestVerificationToken) { 
    console.log('could not find request verification token', secondaryAuthPage)
    return {
      state: 'error',
      mychartRequest
    }
  }


  console.log("Got 2fa sortedCodes from email:", sortedCodes)

  let invalidCode = false;

  for (const code of sortedCodes) {
    console.log('Trying code', code.code)
    const resp = await mychartRequest.makeRequest({
      path: "/Authentication/SecondaryValidation/Validate?noCache=" + Math.random(),
      "headers": { 
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        '__RequestVerificationToken': requestVerificationToken,
      },
      "body": "TwoFactorCode=" + code.code + "&RememberMe=checked&IsPostLogin2FA=false&EnrollDeviceTrackingOnRemember=false&DeviceId=&Workflow=1&isTOTP=" + (isTOTP ? "true" : "false"),
      "method": "POST",
    });

    const respBody = await resp.json()

    if (respBody.Success === true) {
      const insideResp = await mychartRequest.makeRequest({path: '/inside.asp'})
      const insideBody = await insideResp.text();
      const insideBodyLower = insideBody.toLowerCase();

      // Check if we landed on Terms & Conditions page — auto-accept silently
      if (insideBodyLower.includes('termsconditions') || insideBodyLower.includes('terms and conditions')) {
        console.log('Landed on Terms & Conditions page after 2FA, auto-accepting');
        const accepted = await acceptTermsAndConditions(mychartRequest);
        if (!accepted) {
          console.log('Failed to auto-accept Terms & Conditions after 2FA');
          return {
            state: 'error',
            mychartRequest
          };
        }
      }

      return {
        state: 'logged_in',
        mychartRequest
      };

    }

    if (respBody.TwoFactorCodeFailReason === 'codewrong') {
      // wrong code!
      console.log('wrong code!', code.code, code.score)
      invalidCode = true;
    }
  }


  if (invalidCode) {
    return {
      state: 'invalid_2fa',
      mychartRequest
    };
  }

  console.log('i am at some page after 2fa validation call, i dont know what to do!')
  return {
    state: 'error',
    mychartRequest
  };

}


export async function areCookiesValid(mychartRequest: MyChartRequest): Promise<boolean> {
  const res = await mychartRequest.makeRequest({path: '/Home', followRedirects: false})
  console.log("are cookies valid?", res.status == 200, res.headers.get('Location'))
  return res.status == 200
}

async function myChartRawLogin_TEST({hostname, user, pass}: {hostname: string, user: string, pass: string}): Promise<MyChartRequest> {

  const loginResult = await myChartUserPassLogin({hostname, user, pass})

  let mychartRequest = loginResult.mychartRequest;

  if (loginResult.state === 'need_2fa') {

    // get the 2fa, just for testing (dynamic import to avoid Node 25 SlowBuffer crash)

    const { get2FaCodeFromEmail } = await import("../../shared/gmail/gmail");
    const codeArray = await get2FaCodeFromEmail(Date.now(), hostname)

    if (!codeArray) {
       throw new Error('Failed to get 2fa code') 
    }

    mychartRequest = (await complete2faFlow({mychartRequest, twofaCodeArray: codeArray})).mychartRequest
  }

  const cookiesValid = await areCookiesValid(mychartRequest)
  console.log('cookies valid?', cookiesValid)

  return mychartRequest;
}


export async function login_TEST(hostname: string): Promise<MyChartRequest> {

  await changeDirToPackageRoot()


  let mychartRequest = new MyChartRequest(hostname);

  const foundMyChartFirstPathPart = await determineFirstPathPart(mychartRequest);

  if (!foundMyChartFirstPathPart) {
    console.log('could not determine first path part! exiting early')
    return mychartRequest
  }

  // First, figure out what the path is for the domain. 
  // Most mychart scrapers start at /MyChart, but some like Example Hospital use /MyChart-PRD
  // Fire an API request to determine it
  // mychartRequest.getPathFromDomain(domain);

  await mychartRequest.loadCookies_TEST('cookies.json');

  // Make a request to see if the cookies are valid or not 
  // There's basically three ways the cookies can go: 
  // 1. The cookies are valid, no more auth needed at all
  // 2. the are verified with 2fa, but we need to username + password auth again
  // 3. cookies are not valid at all, need to do username + password and 2fa again.

  const areCookiesValidBool = await areCookiesValid(mychartRequest);
  

  // If we got redirected somewhere, we need to relogin
  if (!areCookiesValidBool) {
    console.log('Cookies are not valid, going through login process again')
    // mychartRequest = await myChartRawLogin(hostname);
    const creds = await readTestCredentials_TEST_ONLY()
    mychartRequest = await myChartRawLogin_TEST({hostname, user: creds[hostname]['user'], pass: creds[hostname]['pass']})

  }
  else {
    console.log('Cookies are valid, re-using them')
  }

  await mychartRequest.saveCookies_TEST('cookies.json');  

  return mychartRequest
}


async function test() { 





}

if (require.main === module) {
  test()
}

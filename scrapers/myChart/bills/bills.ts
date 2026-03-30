
import { login_TEST } from "../login";
import { MyChartRequest } from "../myChartRequest";
import * as cheerio from 'cheerio';
import fs from 'fs';
import { subYears, addYears } from 'date-fns';
import { date2dte } from "./utils";
// import '../../../util'
import { BillingAccount, BillingDetails, BillingVisit, PaymentListResponse, StatementItem, StatementListResponse } from "./types";
import { mkdirp } from 'mkdirp';
import { MOCK_DATA } from '../../../shared/env';



// two main features of this file are 
// 1. getBillingAccountDetails and take the output of that and convert it to an excel file
// 2. and download all the pdfs with saveStatementPdf



export function parsePaymentUrl(html: string): { id: string, context: string } | null {
  const regex = /"URLMakePayment":\s*"([^"]+)"/;
  const match = html.match(regex);
  if (match) {
    // Remove the leading '~/'
    const urlStr = match[1].replace(/^~\//, '');
    // Split into path and query string
    let [, queryString] = urlStr.split('?');
    if (!queryString) {
      console.log('returning null')
      return null;
    }
    queryString = queryString.replaceAll('\\u0026', '&');

    if (queryString) {
      const params = new URLSearchParams(queryString);
      const id = params.get('ID');
      const context = params.get('Context');
      if (id && context) {
        return { id, context };
      }
    }
  }
  console.log('returning null')
  return null;
}

export function parseBillingAccountsHtml(html: string, hostname: string): BillingAccount[] {
  const $ = cheerio.load(html);
  const billing_accounts = $('.ba_card')
  const accounts: BillingAccount[] = []

  for (const billing_account of billing_accounts.toArray()) {
    const guarantorText = $('p.ba_card_header_account_idAndType', billing_account).text().trim();
    const guarantorNumber = guarantorText.match(/Guarantor #(\d+)/)?.[1] || 'unknown';
    const patientName = guarantorText.match(/\((.*)\)/)?.[1] || 'unknown';
    const amountdue = $('p.ba_card_status_due_amount', billing_account).text().trim()
    let amountDueNum: number | undefined;
    if (amountdue) amountDueNum = parseFloat(amountdue.replace('$', ''))

    const link = $('p.ba_card_status_recentPaymentLabel a', billing_account).attr('href')
    let ID, Context;
    if (link) {
      ID = new URL(link, 'https://' + hostname).searchParams.get('ID')
      Context = new URL(link, 'https://' + hostname).searchParams.get('Context')
    }
    // Fallback: look for any link to /Billing/Details within the card (e.g. "View Account Details" link)
    if (!ID || !Context) {
      const detailsLink = $('a[href*="Billing/Details"]', billing_account).attr('href');
      if (detailsLink) {
        const detailsUrl = new URL(detailsLink, 'https://' + hostname);
        ID = detailsUrl.searchParams.get('ID');
        Context = detailsUrl.searchParams.get('Context');
      }
    }
    if (!ID || !Context) {
      const paymentUrl = parsePaymentUrl(html)
      ID = paymentUrl?.id;
      Context = paymentUrl?.context;
    }
    if (!ID || !Context) continue;

    accounts.push({ guarantorNumber, patientName, amountDue: amountDueNum, id: ID, context: Context })
  }
  return accounts;
}

async function listBillingAccounts(mychartRequest: MyChartRequest): Promise<BillingAccount[]> {
  const communicationCenterRes = await mychartRequest.makeRequest({ path: '/Billing/Summary' })
  const html = await communicationCenterRes.text()
  return parseBillingAccountsHtml(html, mychartRequest.hostname);
}

async function getBillingAccountDetails(mychartRequest: MyChartRequest, billingAccount: BillingAccount): Promise<BillingDetails> {

  const date100YearsAgo = subYears(new Date(), 100);
  const date1YearFromNow = addYears(new Date(), 1);

  console.log('100 years ago:', date100YearsAgo);
  console.log('1 year from now:', date1YearFromNow);

  const results = await mychartRequest.makeRequest({ path: `/Billing/Details/GetVisits?noCache=${Math.random()}&id=${billingAccount.id}&context=${billingAccount.context}&filterOption=1&searchStartDTE=${date2dte(date100YearsAgo)}&searchStopDTE=${date2dte(date1YearFromNow)}&cid=` })

  const json = await results.json() as BillingDetails

  console.log(json)

  return json
}

export async function getPaymentList(mychartRequest: MyChartRequest, billingAccount: BillingAccount): Promise<PaymentListResponse> {

  const paymentListResponse = await mychartRequest.makeRequest({ path: `/Billing/Details/LoadPaymentList?noCache=${Math.random()}&id=${billingAccount.id}&context=${billingAccount.context}&searchStartDTE=&searchEndDTE=&cid=` })

  const paymentList = await paymentListResponse.json() as PaymentListResponse;

  return paymentList;
}

export async function getStatementList(mychartRequest: MyChartRequest, billingAccount: BillingAccount): Promise<StatementListResponse> {

  const statementsResponse = await mychartRequest.makeRequest({ path: `/Billing/Details/GetStatementList?noCache=${Math.random()}&id=${billingAccount.id}&context=${billingAccount.context}&cid=` })

  const statements = await statementsResponse.json() as StatementListResponse;

  return statements;
}


export async function getEncBillingId(mychartRequest: MyChartRequest, billingAccount: BillingAccount) {

  const path = `/Billing/Details?ID=${billingAccount.id}&Context=${billingAccount.context}`

  const res = await mychartRequest.makeRequest({ path })

  const body = await res.text()

  const match = body.match(/EncID"\s*:\s*"([^"]*)"/)

  if (!match) {
    console.log('unable to find end id')
  }

  return match?.[1]
}

export async function saveStatementPdf(mychartRequest: MyChartRequest, encId: string, statement: StatementItem) {

  const path = `/Billing/Details/DownloadFromBlob/?type=1&id=${statement.RecordID}&earId=${encId}&billSys=${statement.EncBillingSystem}&fileKey=${statement.ImagePath}&token=${encodeURIComponent(statement.Token)}&fileName=Statement_${statement.DateDisplay}&DocExt=PDF&PesId=&cid=`

  const statementPdf = await mychartRequest.makeRequest({ path: path })

  const pdfArrayBuffer = await statementPdf.arrayBuffer()

  // Convert ArrayBuffer to a Node.js Buffer
  const buffer = Buffer.from(pdfArrayBuffer);

  return buffer
}



// This function gets all the billing accounts and many historical bills for each account (how far does it go back ?)
export async function getBillingHistory(mychartRequest: MyChartRequest): Promise<BillingAccount[]> {

  const billingAccounts = await listBillingAccounts(mychartRequest)

  for (const billingAccount of billingAccounts) {

    const billingDetails = await getBillingAccountDetails(mychartRequest, billingAccount)
    const allVisits: BillingVisit[] = billingDetails.Data.UnifiedVisitList.concat(billingDetails.Data.InformationalVisitList)

    console.log('Found', allVisits?.length, ' bills in my chart')

    billingAccount.billingDetails = billingDetails;

    // Also fetch statement list, payment list, and encBillingId for PDF downloads
    try {
      const [statementList, paymentList, encBillingId] = await Promise.all([
        getStatementList(mychartRequest, billingAccount),
        getPaymentList(mychartRequest, billingAccount),
        getEncBillingId(mychartRequest, billingAccount),
      ]);
      billingAccount.statementList = statementList;
      billingAccount.paymentList = paymentList;
      billingAccount.encBillingId = encBillingId || undefined;
    } catch (err) {
      console.log('Failed to fetch billing details:', (err as Error).message);
    }
  }

  return billingAccounts;
}


// Given a list of billingAccounts, fetches all the statement PDFs associated with that account. 
// will be needed later for downloading itemized bills. 
export async function getBillingStatementPDFs(mychartRequest: MyChartRequest, billingAccount: BillingAccount) {
  const encId = await getEncBillingId(mychartRequest, billingAccount)
  const statementList = await getStatementList(mychartRequest, billingAccount)

  // TODO: this could be improved, the statement list has two different types of statements, the latter isn't really a statement.
  for (const statement of statementList.DataStatement.StatementList.concat(statementList.DataDetailBill.StatementList)) {

    const buffer = await saveStatementPdf(mychartRequest, encId!, statement)


    const name = 'Invoice on ' + statement.FormattedDateDisplay + ' for ' + statement.StatementAmountDisplay + '.pdf'

    // Write the buffer to a file
    await mkdirp('pdfs')
    if (MOCK_DATA) {
      console.log("not saving xlxs", name, " to disk b/c its mock data mode")
    }
    else {
      await fs.promises.writeFile('./pdfs/' + name, new Uint8Array(buffer));
      console.log('Saved', name)
    }
  }
}




async function test() {

  const mychartRequest = await login_TEST('mychart.example.org')

  const results = await getBillingHistory(mychartRequest)

  console.log(results)
}


if (require.main === module) {
  // This script is being run directly
  // We will call the main function
  test()
}
import { describe, it, expect } from 'bun:test'
import { date2dte, parsePaymentUrl, parseBillingAccountsHtml } from '../bills'

describe('date2dte', () => {
  it('converts Unix epoch (Jan 1, 1970) to DTE value of 47117', () => {
    // The DTE epoch is Dec 31, 1840, so Jan 1, 1970 should be 47117 days after that
    const epoch = new Date(1970, 0, 1)
    expect(date2dte(epoch)).toBe(47117)
  })

  it('converts a known date correctly', () => {
    // Jan 2, 1970 should be 47118
    const jan2 = new Date(1970, 0, 2)
    expect(date2dte(jan2)).toBe(47118)
  })

  it('handles dates in the 2020s', () => {
    // Jan 1, 2024 = 47117 + days from 1970 to 2024
    const jan1_2024 = new Date(2024, 0, 1)
    const result = date2dte(jan1_2024)
    // 54 years, accounting for leap years
    // From 1970 to 2024: 19723 days
    expect(result).toBe(47117 + 19723)
  })

  it('handles dates before 1970', () => {
    // Dec 31, 1969 should be 47116
    const dec31_1969 = new Date(1969, 11, 31)
    expect(date2dte(dec31_1969)).toBe(47116)
  })

  it('returns an integer for any date', () => {
    const date = new Date(2023, 5, 15)
    const result = date2dte(date)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('consecutive days have consecutive DTE values', () => {
    const day1 = new Date(2023, 0, 1)
    const day2 = new Date(2023, 0, 2)
    const day3 = new Date(2023, 0, 3)
    expect(date2dte(day2) - date2dte(day1)).toBe(1)
    expect(date2dte(day3) - date2dte(day2)).toBe(1)
  })

  it('handles leap year date', () => {
    const feb29 = new Date(2024, 1, 29)
    const mar1 = new Date(2024, 2, 1)
    expect(date2dte(mar1) - date2dte(feb29)).toBe(1)
  })
})

describe('parsePaymentUrl', () => {
  it('extracts ID and Context from URLMakePayment JSON', () => {
    const html = `
      <script>
        var config = {"URLMakePayment": "~/Billing/Payment?ID=12345\\u0026Context=ABC_XYZ"};
      </script>
    `
    expect(parsePaymentUrl(html)).toEqual({ id: '12345', context: 'ABC_XYZ' })
  })

  it('handles URL with multiple query parameters', () => {
    const html = `{"URLMakePayment": "~/Billing/Payment?ID=999\\u0026Context=CTX_123\\u0026Other=foo"}`
    expect(parsePaymentUrl(html)).toEqual({ id: '999', context: 'CTX_123' })
  })

  it('returns null when URLMakePayment is not present', () => {
    const html = `<html><body>No payment URL here</body></html>`
    expect(parsePaymentUrl(html)).toBeNull()
  })

  it('returns null when URL has no query string', () => {
    const html = `{"URLMakePayment": "~/Billing/Payment"}`
    expect(parsePaymentUrl(html)).toBeNull()
  })

  it('returns null when ID is missing from URL', () => {
    const html = `{"URLMakePayment": "~/Billing/Payment?Context=ABC"}`
    expect(parsePaymentUrl(html)).toBeNull()
  })

  it('returns null when Context is missing from URL', () => {
    const html = `{"URLMakePayment": "~/Billing/Payment?ID=123"}`
    expect(parsePaymentUrl(html)).toBeNull()
  })

  it('handles URL without ~/ prefix', () => {
    const html = `{"URLMakePayment": "Billing/Payment?ID=456\\u0026Context=DEF"}`
    expect(parsePaymentUrl(html)).toEqual({ id: '456', context: 'DEF' })
  })

  it('handles spaces around the colon in JSON', () => {
    const html = `{"URLMakePayment":   "~/Pay?ID=789\\u0026Context=GHI"}`
    expect(parsePaymentUrl(html)).toEqual({ id: '789', context: 'GHI' })
  })

  it('returns null for empty string', () => {
    expect(parsePaymentUrl('')).toBeNull()
  })

  it('handles realistic embedded JSON in HTML page', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div id="billing-app"></div>
        <script type="text/javascript">
          window.__INITIAL_STATE__ = {
            "URLMakePayment": "~/Billing/MakePayment?ID=GA_100200\\u0026Context=EPIC_CONTEXT_1234",
            "URLPaymentHistory": "~/Billing/History"
          };
        </script>
      </body>
      </html>
    `
    expect(parsePaymentUrl(html)).toEqual({
      id: 'GA_100200',
      context: 'EPIC_CONTEXT_1234',
    })
  })
})

describe('parseBillingAccountsHtml', () => {
  const hostname = 'mychart.example.com'

  it('parses a single billing account card', () => {
    const html = `
      <html>
      <body>
        <div class="ba_card">
          <p class="ba_card_header_account_idAndType">Guarantor #12345 (John Smith)</p>
          <p class="ba_card_status_due_amount">$150.00</p>
          <p class="ba_card_status_recentPaymentLabel">
            <a href="https://mychart.example.com/Billing/Detail?ID=ABC&Context=CTX1">View</a>
          </p>
        </div>
        <script>{"URLMakePayment": "~/Billing/Payment?ID=fallback\\u0026Context=fallback_ctx"}</script>
      </body>
      </html>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toEqual({
      guarantorNumber: '12345',
      patientName: 'John Smith',
      amountDue: 150.00,
      id: 'ABC',
      context: 'CTX1',
    })
  })

  it('parses multiple billing account cards', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #111 (Alice)</p>
        <p class="ba_card_status_due_amount">$50.00</p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=A1&Context=C1">View</a>
        </p>
      </div>
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #222 (Bob)</p>
        <p class="ba_card_status_due_amount">$200.50</p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=B2&Context=C2">View</a>
        </p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts).toHaveLength(2)
    expect(accounts[0].guarantorNumber).toBe('111')
    expect(accounts[0].patientName).toBe('Alice')
    expect(accounts[0].amountDue).toBe(50.00)
    expect(accounts[1].guarantorNumber).toBe('222')
    expect(accounts[1].patientName).toBe('Bob')
    expect(accounts[1].amountDue).toBe(200.50)
  })

  it('falls back to parsePaymentUrl when link has no ID/Context', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #999 (Fallback User)</p>
        <p class="ba_card_status_due_amount">$75.00</p>
        <p class="ba_card_status_recentPaymentLabel"></p>
      </div>
      <script>{"URLMakePayment": "~/Billing/Pay?ID=FB_ID\\u0026Context=FB_CTX"}</script>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts).toHaveLength(1)
    expect(accounts[0].id).toBe('FB_ID')
    expect(accounts[0].context).toBe('FB_CTX')
  })

  it('skips accounts with no ID or Context from any source', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #000 (No Link User)</p>
        <p class="ba_card_status_due_amount">$25.00</p>
        <p class="ba_card_status_recentPaymentLabel"></p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts).toHaveLength(0)
  })

  it('returns empty array when no billing cards exist', () => {
    const html = `<html><body><p>No billing accounts found.</p></body></html>`
    expect(parseBillingAccountsHtml(html, hostname)).toEqual([])
  })

  it('returns empty array for empty HTML', () => {
    expect(parseBillingAccountsHtml('', hostname)).toEqual([])
  })

  it('parses amount with no dollar sign gracefully', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #555 (Test)</p>
        <p class="ba_card_status_due_amount">99.99</p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=T1&Context=TC">View</a>
        </p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts[0].amountDue).toBe(99.99)
  })

  it('handles zero amount due', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #777 (Zero User)</p>
        <p class="ba_card_status_due_amount">$0.00</p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=Z1&Context=ZC">View</a>
        </p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts[0].amountDue).toBe(0)
  })

  it('sets unknown for missing guarantor number', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Account (Test Patient)</p>
        <p class="ba_card_status_due_amount">$10.00</p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=X1&Context=XC">View</a>
        </p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts[0].guarantorNumber).toBe('unknown')
    expect(accounts[0].patientName).toBe('Test Patient')
  })

  it('sets unknown for missing patient name', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #123</p>
        <p class="ba_card_status_due_amount">$10.00</p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=X1&Context=XC">View</a>
        </p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts[0].guarantorNumber).toBe('123')
    expect(accounts[0].patientName).toBe('unknown')
  })

  it('extracts ID/Context from Billing/Details link when recentPaymentLabel is missing', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #102424656 (Ryan Hughes)</p>
        <p class="ba_card_status_due_amount">$0.00</p>
        <a href="https://mychart.example.com/Billing/Details?ID=WP-ABC123&Context=WP-DEF456">
          View Account Details, Patient Payments, Billing Documents
        </a>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts).toHaveLength(1)
    expect(accounts[0].guarantorNumber).toBe('102424656')
    expect(accounts[0].patientName).toBe('Ryan Hughes')
    expect(accounts[0].id).toBe('WP-ABC123')
    expect(accounts[0].context).toBe('WP-DEF456')
  })

  it('handles amountDue as undefined when element is empty', () => {
    const html = `
      <div class="ba_card">
        <p class="ba_card_header_account_idAndType">Guarantor #888 (No Amount)</p>
        <p class="ba_card_status_due_amount"></p>
        <p class="ba_card_status_recentPaymentLabel">
          <a href="https://mychart.example.com/Billing/Detail?ID=NA&Context=NC">View</a>
        </p>
      </div>
    `
    const accounts = parseBillingAccountsHtml(html, hostname)
    expect(accounts[0].amountDue).toBeUndefined()
  })
})

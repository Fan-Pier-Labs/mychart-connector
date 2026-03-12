import { generateCsrfToken } from './csrf';

const FIRST_PATH = 'MyChart';

function basePageShell(title: string, bodyContent: string): string {
  const token = generateCsrfToken();
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" dir="ltr">
<head>
  <title>${title}</title>
  <meta http-equiv="content-type" content="text/html; charset=utf-8" />
</head>
<body>
  <div class='hidden' id='__CSRFContainer'><input name="__RequestVerificationToken" type="hidden" value="${token}" /></div>
  ${bodyContent}
</body>
</html>`;
}

export function loginPage(): string {
  const token = generateCsrfToken();
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" dir="ltr" class="notile">
<head>
  <title>MyChart - Login Page</title>
  <meta http-equiv="content-type" content="text/html; charset=utf-8" />
  <noscript><meta http-equiv="refresh" content="0;url=/${FIRST_PATH}/nojs.asp" /></noscript>
</head>
<body class="loginPage isPrelogin">
  <div class='hidden' id='__CSRFContainer'><input name="__RequestVerificationToken" type="hidden" value="${token}" /></div>
  <div id="wrap">
    <main id="main">
      <div class="login">
        <form autocomplete="off" method="post" action="#" id="loginForm">
          <div class="formcontents">
            <div class="legacyLabelledField">
              <label for="Login" class="required">Username</label>
              <input type="text" id="Login" name="Login" maxlength="128" autocomplete="username">
            </div>
            <div class="legacyLabelledField">
              <label for="Password" class="required">Password</label>
              <input type="password" id="Password" name="Password" autocomplete="current-password">
            </div>
            <input class="button" type="submit" name="submit" id="submit" value="Sign in">
          </div>
        </form>
        <form class="hidden" action="/${FIRST_PATH}/Authentication/Login/DoLogin" autocomplete="off" id="actualLogin" method="post">
          <input name="__RequestVerificationToken" type="hidden" value="${token}" />
        </form>
      </div>
    </main>
  </div>
  <div id='__PerformanceTrackingSettings' class='hidden'>
    <input name='__NavigationRequestMetrics' value='["fake-metrics"]' type='hidden' autocomplete='off' />
    <input name='__NavigationRedirectMetrics' value='[]' type='hidden' autocomplete='off' />
    <input name='__RedirectChainIncludesLogin' value='0' type='hidden' autocomplete='off' />
    <input name='__CurrentPageLoadDescriptor' value='' type='hidden' autocomplete='off' />
    <input name='__RttCaptureEnabled' value='1' type='hidden' autocomplete='off' />
  </div>
  <script src="/${FIRST_PATH}/areas/authentication/scripts/controllers/loginpagecontroller.min.js" type="text/javascript"></script>
</body>
</html>`;
}

export function loginPageControllerJs(): string {
  // The scraper regex-matches: Credentials:\s*\{([^}]{0,300})\}
  // If it finds "Username" but not "LoginIdentifier", it uses "Username"
  return `(function() {
  var LoginPageController = function() {
    this.Credentials = { Username: "", Password: "" };
  };
  new LoginPageController();
})();`;
}

export function doLoginSuccess(): string {
  const token = generateCsrfToken();
  return `<html><body class="md_home_index">
  <input name="__RequestVerificationToken" type="hidden" value="${token}" />
  <div>Login successful</div>
</body></html>`;
}

export function doLoginNeed2FA(): string {
  const token = generateCsrfToken();
  return `<html><body>
  <input name="__RequestVerificationToken" type="hidden" value="${token}" />
  <div>secondaryvalidationcontroller</div>
</body></html>`;
}

export function doLoginFailed(): string {
  return `<html><body><div> login failed</div></body></html>`;
}

export function secondaryValidationPage(): string {
  const token = generateCsrfToken();
  return `<html><body>
  <input name="__RequestVerificationToken" type="hidden" value="${token}" />
  <div>Enter your verification code</div>
</body></html>`;
}

export function homePage(name: string, dob: string, mrn: string, pcp: string): string {
  return basePageShell('MyChart - Home', `
    <div class="printheader">
    Name: ${name} | DOB: ${dob} | MRN: ${mrn} | PCP: ${pcp}
    </div>
    <div id="content">Welcome to MyChart</div>
  `);
}

export function csrfTokenPage(): string {
  const token = generateCsrfToken();
  return `<html><body><input name="__RequestVerificationToken" type="hidden" value="${token}" /></body></html>`;
}

export function genericTokenPage(title: string): string {
  return basePageShell(title, '<div></div>');
}

export function careTeamPage(providers: Array<{ name: string; role: string; specialty: string }>): string {
  const cards = providers.map(p => `
    <div class="careteam-provider">
      <h3 class="provider-name">${p.name}</h3>
      <div class="provider-role">${p.role}</div>
      <div class="provider-specialty">${p.specialty}</div>
    </div>
  `).join('\n');
  return basePageShell('MyChart - Care Team', cards);
}

export function insurancePage(plans: Array<{ planName: string; subscriberName: string; memberId: string; groupNumber: string }>): string {
  const cards = plans.map(p => `
    <div class="coverage-card">
      <div class="plan-name">${p.planName}</div>
      <div class="subscriber-name">${p.subscriberName}</div>
      <div class="member-id">${p.memberId}</div>
      <div class="group-number">${p.groupNumber}</div>
    </div>
  `).join('\n');
  return basePageShell('MyChart - Insurance', cards);
}

export function preventiveCarePage(items: Array<{ name: string; status: string; date: string }>): string {
  const lines = items.map(item => {
    if (item.status === 'overdue') {
      return `${item.name}\nOverdue since ${item.date}`;
    } else if (item.status === 'due') {
      return `${item.name}\nNot due until ${item.date}`;
    } else {
      return `${item.name}\nCompleted on ${item.date}`;
    }
  }).join('\n\n');
  return basePageShell('MyChart - Preventive Care', `<div class="healthAdvisories">${lines}</div>`);
}

export function billingSummaryPage(accounts: Array<{
  guarantorId: string;
  guarantorName: string;
  amountDue: string;
  lastPaid: string;
  detailsId: string;
  detailsContext: string;
}>): string {
  const cards = accounts.map(a => `
    <div class="col-6 card ba_card">
      <div class="grid compact">
        <div class="row fixed ba_card_header">
          <div class="ba_card_header_content col-12">
            <div class="ba_card_text_container">
              <span class="ba_card_header_saLabel ba_card_header_saLabel_saName">Springfield Nuclear Power Plant</span>
            </div>
            <p class="ba_card_header_account_idAndType">Guarantor #${a.guarantorId} (${a.guarantorName})</p>
          </div>
        </div>
        <div class="ba_card_status row cardlist flex_to_height">
          <div class="center col-12 ba_card_status_column">
            <div>
              <span class="ba_card_status_due_label">Amount Due</span>
              <p class="money ba_card_status_due_amount moneyColor">${a.amountDue}</p>
              <div class="ba_card_status_payLinks">
                <p class="subtle ba_card_status_recentPaymentLabel">
                  <a href="/${FIRST_PATH}/Billing/Details?ID=${a.detailsId}&Context=${a.detailsContext}&tab=3" title="View payment history">${a.lastPaid}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('\n');
  return basePageShell('MyChart - Billing Summary', `<div>${cards}</div>`);
}

export function billingDetailsPage(encId: string): string {
  return basePageShell('MyChart - Billing Details', `
    <script>
      accountDetailsController.Initialize({
        "ID": "742",
        "EncID": "${encId}",
        "EncCID": ""
      });
    </script>
  `);
}

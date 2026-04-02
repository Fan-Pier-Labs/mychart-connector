import { generateCsrfToken } from './csrf';

const FIRST_PATH = 'MyChart';

// ─── CSS ──────────────────────────────────────────────────────────────
const PORTAL_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; background: #f0f2f5; color: #1a1a2e; }
a { color: #1a6fa5; text-decoration: none; }
a:hover { text-decoration: underline; }

/* Header */
.mc-header { background: #1a5276; color: #fff; height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
.mc-header .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
.mc-header .logo span { color: #5dade2; }
.mc-header .user-info { display: flex; align-items: center; gap: 16px; font-size: 14px; }
.mc-header .user-info a { color: #aed6f1; }
.mc-header .user-info a:hover { color: #fff; }

/* Layout */
.mc-layout { display: flex; margin-top: 56px; min-height: calc(100vh - 56px); }

/* Sidebar */
.mc-sidebar { width: 240px; background: #fff; border-right: 1px solid #dde; padding: 16px 0; position: fixed; top: 56px; bottom: 0; overflow-y: auto; }
.mc-sidebar .nav-group { margin-bottom: 8px; }
.mc-sidebar .nav-group-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; padding: 8px 20px 4px; letter-spacing: 0.5px; }
.mc-sidebar a { display: flex; align-items: center; gap: 10px; padding: 8px 20px; font-size: 14px; color: #333; transition: background 0.15s; }
.mc-sidebar a:hover { background: #e8f4fd; text-decoration: none; }
.mc-sidebar a.active { background: #d4eaf7; color: #1a5276; font-weight: 600; border-right: 3px solid #1a5276; }
.mc-sidebar .nav-icon { width: 18px; text-align: center; font-size: 15px; }

/* Main content */
.mc-main { margin-left: 240px; flex: 1; padding: 24px 32px; min-width: 0; }
.mc-main h1 { font-size: 24px; font-weight: 600; margin-bottom: 20px; color: #1a1a2e; }
.mc-main h2 { font-size: 18px; font-weight: 600; margin: 20px 0 12px; color: #333; }

/* Cards */
.card { background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; padding: 16px 20px; margin-bottom: 12px; }
.card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card h3 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.card .meta { font-size: 13px; color: #666; margin-top: 4px; }
.card .detail { font-size: 14px; color: #444; margin-top: 4px; }

/* Grid cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px; }
.card-grid .card { margin-bottom: 0; }

/* Dashboard cards */
.dash-card { background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; padding: 20px; text-align: center; }
.dash-card .dash-icon { font-size: 32px; margin-bottom: 8px; }
.dash-card .dash-value { font-size: 24px; font-weight: 700; color: #1a5276; }
.dash-card .dash-label { font-size: 13px; color: #666; margin-top: 4px; }

/* Badges */
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.badge-red { background: #fde8e8; color: #c0392b; }
.badge-yellow { background: #fef9e7; color: #b7950b; }
.badge-green { background: #e8f8f5; color: #1e8449; }
.badge-blue { background: #d4eaf7; color: #1a5276; }
.badge-gray { background: #eee; color: #666; }

/* Tables */
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; margin-bottom: 16px; }
th { background: #f7f8fa; text-align: left; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #555; border-bottom: 2px solid #e0e0e0; }
td { padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafbfc; }
.abnormal { color: #c0392b; font-weight: 600; }

/* Messages */
.msg-list { display: flex; flex-direction: column; gap: 2px; }
.msg-item { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 20px; cursor: pointer; transition: background 0.15s; }
.msg-item:hover { background: #f0f7fd; }
.msg-item.unread { border-left: 4px solid #1a5276; }
.msg-subject { font-weight: 600; font-size: 15px; }
.msg-preview { font-size: 13px; color: #666; margin-top: 2px; }
.msg-meta { font-size: 12px; color: #999; margin-top: 4px; }
.msg-thread { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-top: 16px; display: none; }
.msg-thread.visible { display: block; }
.msg-bubble { padding: 12px 16px; border-radius: 12px; margin-bottom: 8px; max-width: 80%; }
.msg-bubble.provider { background: #f0f2f5; align-self: flex-start; }
.msg-bubble.patient { background: #d4eaf7; align-self: flex-end; margin-left: auto; }
.msg-bubble .author { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.msg-bubble .time { font-size: 11px; color: #888; margin-top: 4px; }
.msg-bubble .body { font-size: 14px; line-height: 1.5; }

/* Tabs */
.tabs { display: flex; gap: 0; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px; }
.tab { padding: 10px 20px; font-size: 14px; font-weight: 500; color: #666; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
.tab:hover { color: #1a5276; }
.tab.active { color: #1a5276; font-weight: 600; border-bottom-color: #1a5276; }

/* Loading */
.loading { text-align: center; padding: 40px; color: #888; }

/* Print header (scraper compat) */
.printheader { font-size: 13px; color: #666; padding: 8px 0; margin-bottom: 16px; border-bottom: 1px solid #e0e0e0; }

/* Letter detail */
.letter-body { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; line-height: 1.6; }
.letter-body h2 { margin: 0 0 12px; }
.letter-body p { margin: 8px 0; }

/* Vitals chart placeholder */
.vital-chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; margin-top: 8px; }
.vital-bar { background: #5dade2; border-radius: 3px 3px 0 0; min-width: 24px; }
`;

// ─── Navigation ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { group: 'Overview', items: [
    { icon: '\u{1F3E0}', label: 'Home', path: 'Home' },
    { icon: '\u{1F4AC}', label: 'Messages', path: 'Messaging' },
    { icon: '\u{1F4C5}', label: 'Visits', path: 'Visits' },
  ]},
  { group: 'Health', items: [
    { icon: '\u{1F9EA}', label: 'Test Results', path: 'TestResults' },
    { icon: '\u{1F48A}', label: 'Medications', path: 'Clinical/Medications' },
    { icon: '\u26A0\uFE0F', label: 'Allergies', path: 'Clinical/Allergies' },
    { icon: '\u{1FA7A}', label: 'Health Issues', path: 'Clinical/HealthIssues' },
    { icon: '\u{1F489}', label: 'Immunizations', path: 'Clinical/Immunizations' },
    { icon: '\u{1F4CA}', label: 'Vitals', path: 'TrackMyHealth' },
    { icon: '\u{1F4CB}', label: 'Medical History', path: 'MedicalHistory' },
  ]},
  { group: 'Care', items: [
    { icon: '\u{1F468}\u200D\u2695\uFE0F', label: 'Care Team', path: 'Clinical/CareTeam' },
    { icon: '\u{1F3AF}', label: 'Goals', path: 'Goals' },
    { icon: '\u{1F500}', label: 'Referrals', path: 'Referrals' },
    { icon: '\u2705', label: 'Preventive Care', path: 'HealthAdvisories' },
    { icon: '\u{1F6E4}\uFE0F', label: 'Care Journeys', path: 'CareJourneys' },
  ]},
  { group: 'Records', items: [
    { icon: '\u2709\uFE0F', label: 'Letters', path: 'Letters' },
    { icon: '\u{1F4C4}', label: 'Documents', path: 'Documents' },
    { icon: '\u{1F4DA}', label: 'Education', path: 'Education' },
  ]},
  { group: 'Account', items: [
    { icon: '\u{1F4B3}', label: 'Billing', path: 'Billing/Summary' },
    { icon: '\u{1F6E1}\uFE0F', label: 'Insurance', path: 'Insurance' },
    { icon: '\u{1F464}', label: 'Profile', path: 'PersonalInformation' },
    { icon: '\u{1F4DE}', label: 'Emergency Contacts', path: 'EmergencyContacts' },
  ]},
];

function buildNav(activePath: string): string {
  return NAV_ITEMS.map(group => `
    <div class="nav-group">
      <div class="nav-group-title">${group.group}</div>
      ${group.items.map(item => `
        <a href="/${FIRST_PATH}/${item.path}" class="${activePath === item.path ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span>${item.label}
        </a>
      `).join('')}
    </div>
  `).join('');
}

// ─── Portal Layout ────────────────────────────────────────────────────
function portalLayout(title: string, activePath: string, bodyContent: string): string {
  const token = generateCsrfToken();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MyChart - ${title}</title>
  <style>${PORTAL_CSS}</style>
</head>
<body>
  <div class='hidden' style='display:none' id='__CSRFContainer'><input name="__RequestVerificationToken" type="hidden" value="${token}" /></div>
  <header class="mc-header">
    <div class="logo">My<span>Chart</span></div>
    <div class="user-info">
      <span>Homer Simpson</span>
      <a href="/${FIRST_PATH}/Authentication/Login">Sign out</a>
    </div>
  </header>
  <div class="mc-layout">
    <nav class="mc-sidebar">${buildNav(activePath)}</nav>
    <main class="mc-main">${bodyContent}</main>
  </div>
</body>
</html>`;
}

// ─── Backward-compat shell (for scraper-parsed pages that need specific structure) ──
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

// ─── Login Page ──────────────────────────────────────────────────────
export function loginPage(): string {
  const token = generateCsrfToken();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>MyChart - Login Page</title>
  <meta charset="utf-8" />
  <style>
    ${PORTAL_CSS}
    body { background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%); display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-box { background: #fff; border-radius: 12px; padding: 40px; width: 380px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    .login-box .logo { text-align: center; font-size: 28px; font-weight: 700; margin-bottom: 8px; color: #1a5276; }
    .login-box .logo span { color: #5dade2; }
    .login-box .subtitle { text-align: center; font-size: 14px; color: #888; margin-bottom: 24px; }
    .login-box label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #333; }
    .login-box input[type="text"], .login-box input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 15px; margin-bottom: 16px; }
    .login-box input[type="text"]:focus, .login-box input[type="password"]:focus { outline: none; border-color: #1a5276; box-shadow: 0 0 0 3px rgba(26,82,118,0.1); }
    .login-box button { width: 100%; padding: 12px; background: #1a5276; color: #fff; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .login-box button:hover { background: #1c6ea4; }
    .login-box .error { background: #fde8e8; color: #c0392b; padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; display: none; }
    .demo-creds { background: #eaf6ff; border: 1px solid #b3d9f2; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; color: #1a5276; }
    .demo-creds .demo-title { font-weight: 700; margin-bottom: 6px; font-size: 14px; }
    .demo-creds code { background: #d4ecfc; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    .demo-creds .demo-note { margin-top: 8px; font-size: 12px; color: #666; }
    .noscript-meta { display: none; }
  </style>
  <noscript><meta class="noscript-meta" http-equiv="refresh" content="0;url=/${FIRST_PATH}/nojs.asp" /></noscript>
</head>
<body class="loginPage isPrelogin">
  <div class='hidden' style='display:none' id='__CSRFContainer'><input name="__RequestVerificationToken" type="hidden" value="${token}" /></div>
  <div class="login-box">
    <div class="logo">My<span>Chart</span></div>
    <div class="subtitle">Springfield General Hospital</div>
    <div class="demo-creds">
      <div class="demo-title">Demo Credentials</div>
      Username: <code>homer</code><br>
      Password: <code>donuts123</code>
      <div class="demo-note">This is a fake MyChart server with fictional Homer Simpson data for testing and development.</div>
    </div>
    <div class="error" id="errorMsg">Invalid username or password.</div>
    <form autocomplete="off" method="post" action="#" id="loginForm">
      <label for="Login">Username</label>
      <input type="text" id="Login" name="Login" maxlength="128" autocomplete="username" placeholder="Enter your username">
      <label for="Password">Password</label>
      <input type="password" id="Password" name="Password" autocomplete="current-password" placeholder="Enter your password">
      <button type="submit" id="submit">Sign In</button>
    </form>
    <form class="hidden" style="display:none" action="/${FIRST_PATH}/Authentication/Login/DoLogin" autocomplete="off" id="actualLogin" method="post">
      <input name="__RequestVerificationToken" type="hidden" value="${token}" />
    </form>
  </div>
  <div id='__PerformanceTrackingSettings' class='hidden' style='display:none'>
    <input name='__NavigationRequestMetrics' value='["fake-metrics"]' type='hidden' autocomplete='off' />
    <input name='__NavigationRedirectMetrics' value='[]' type='hidden' autocomplete='off' />
    <input name='__RedirectChainIncludesLogin' value='0' type='hidden' autocomplete='off' />
    <input name='__CurrentPageLoadDescriptor' value='' type='hidden' autocomplete='off' />
    <input name='__RttCaptureEnabled' value='1' type='hidden' autocomplete='off' />
  </div>
  <script src="/${FIRST_PATH}/areas/authentication/scripts/controllers/loginpagecontroller.min.js" type="text/javascript"></script>
  <script>
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var user = document.getElementById('Login').value;
      var pass = document.getElementById('Password').value;
      var token = document.querySelector('#__CSRFContainer input[name=__RequestVerificationToken]').value;
      var loginInfo = JSON.stringify({ Credentials: { Username: btoa(user), Password: btoa(pass) } });
      var body = '__RequestVerificationToken=' + encodeURIComponent(token) + '&LoginInfo=' + encodeURIComponent(loginInfo);
      fetch('/${FIRST_PATH}/Authentication/Login/DoLogin', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body, credentials: 'same-origin'
      }).then(function(r) { return r.text(); }).then(function(html) {
        if (html.indexOf('md_home_index') !== -1) {
          window.location.href = '/${FIRST_PATH}/Home';
        } else if (html.indexOf('secondaryvalidationcontroller') !== -1) {
          window.location.href = '/${FIRST_PATH}/Authentication/SecondaryValidation';
        } else {
          document.getElementById('errorMsg').style.display = 'block';
        }
      });
    });
  </script>
</body>
</html>`;
}

export function loginPageControllerJs(): string {
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

/**
 * Returns which 2FA delivery methods the fake MyChart should offer.
 * Controlled by the FAKE_MYCHART_2FA_METHODS env var:
 *   - "email"     → only email
 *   - "sms"       → only SMS/phone
 *   - "email,sms" → both (default)
 */
export function get2faMethods(): { email: boolean; sms: boolean } {
  const methods = (process.env.FAKE_MYCHART_2FA_METHODS || 'email,sms').toLowerCase();
  return {
    email: methods.includes('email'),
    sms: methods.includes('sms'),
  };
}

export function secondaryValidationPage(): string {
  const token = generateCsrfToken();
  const methods = get2faMethods();
  const maskedEmail = 'ho***@springfield.net';
  const maskedPhone = '***-***-7890';

  // Build method buttons matching real MyChart's structure
  let methodButtons = '';
  if (methods.email) {
    methodButtons += `<button type="button" class="method-btn" data-method="email">Email to me</button>\n`;
  }
  if (methods.sms) {
    methodButtons += `<button type="button" class="method-btn" data-method="sms">Text to my phone</button>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><title>MyChart - Verification</title>
<style>
  ${PORTAL_CSS}
  body { background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%); display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .verify-box { background: #fff; border-radius: 12px; padding: 40px; width: 380px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); text-align: center; }
  .verify-box h2 { margin-bottom: 8px; }
  .verify-box p { color: #666; font-size: 14px; margin-bottom: 20px; }
  .verify-box input[type="text"] { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 20px; text-align: center; letter-spacing: 8px; margin-bottom: 16px; }
  .verify-box button { width: 100%; padding: 12px; background: #1a5276; color: #fff; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 8px; }
  .method-btn { background: #2980b9; }
  .method-btn:hover { background: #1a5276; }
  .hidden { display: none; }
</style>
</head>
<body>
  <input name="__RequestVerificationToken" type="hidden" value="${token}" style="display:none" />
  <div>secondaryvalidationcontroller</div>
  <div class="verify-box">
    <h2>Verify your identity</h2>
    <p>Choose how to receive your security code.</p>
    <div id="methodSelection">
      ${methodButtons}
    </div>
    <div id="codeEntry" class="hidden">
      <p id="sentMessage"></p>
      <form id="verifyForm">
        <input type="text" id="code" name="code" maxlength="6" autocomplete="one-time-code" placeholder="000000">
        <button type="submit">Verify</button>
      </form>
    </div>
  </div>
  <script>
    var maskedEmail = '${maskedEmail}';
    var maskedPhone = '${maskedPhone}';
    document.querySelectorAll('.method-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var method = btn.getAttribute('data-method');
        var isEmail = method === 'email';
        var contact = isEmail ? maskedEmail : maskedPhone;
        fetch('/${FIRST_PATH}/Authentication/SecondaryValidation/SendCode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'deliveryMethodEmail=' + isEmail + '&resendCode=false&workflow=1',
          credentials: 'same-origin'
        }).then(function() {
          document.getElementById('methodSelection').classList.add('hidden');
          document.getElementById('codeEntry').classList.remove('hidden');
          document.getElementById('sentMessage').textContent =
            'We\\'ve sent a security code to ' + contact + '.';
        });
      });
    });
    document.getElementById('verifyForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var code = document.getElementById('code').value;
      fetch('/${FIRST_PATH}/Authentication/SecondaryValidation/Validate', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'code=' + encodeURIComponent(code), credentials: 'same-origin'
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.Success) { window.location.href = '/${FIRST_PATH}/Home'; }
        else { alert('Invalid code. Try 123456.'); }
      });
    });
  </script>
</body></html>`;
}

// ─── Home / Dashboard ──────────────────────────────────────────────────
export function homePage(name: string, dob: string, mrn: string, pcp: string): string {
  return portalLayout('Home', 'Home', `
    <div class="printheader">Name: ${name} | DOB: ${dob} | MRN: ${mrn} | PCP: ${pcp}</div>
    <h1>Welcome, ${name.split(' ')[0]}</h1>
    <div class="card-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="dash-card">
        <div class="dash-icon">\u{1F4C5}</div>
        <div class="dash-value">Apr 15</div>
        <div class="dash-label">Next Appointment</div>
      </div>
      <div class="dash-card">
        <div class="dash-icon">\u{1F4AC}</div>
        <div class="dash-value">2</div>
        <div class="dash-label">Messages</div>
      </div>
      <div class="dash-card">
        <div class="dash-icon">\u{1F9EA}</div>
        <div class="dash-value">3</div>
        <div class="dash-label">Recent Lab Results</div>
      </div>
      <div class="dash-card">
        <div class="dash-icon">\u{1F48A}</div>
        <div class="dash-value">4</div>
        <div class="dash-label">Active Medications</div>
      </div>
    </div>

    <h2>Quick Links</h2>
    <div class="card-grid" style="grid-template-columns: repeat(3, 1fr);">
      <a href="/${FIRST_PATH}/Messaging" class="card" style="text-decoration:none; color:inherit;">
        <h3>\u{1F4AC} Messages</h3>
        <div class="detail">View and send messages to your care team</div>
      </a>
      <a href="/${FIRST_PATH}/TestResults" class="card" style="text-decoration:none; color:inherit;">
        <h3>\u{1F9EA} Test Results</h3>
        <div class="detail">View your lab and imaging results</div>
      </a>
      <a href="/${FIRST_PATH}/Visits" class="card" style="text-decoration:none; color:inherit;">
        <h3>\u{1F4C5} Visits</h3>
        <div class="detail">Upcoming and past appointments</div>
      </a>
      <a href="/${FIRST_PATH}/Clinical/Medications" class="card" style="text-decoration:none; color:inherit;">
        <h3>\u{1F48A} Medications</h3>
        <div class="detail">Current prescriptions and refills</div>
      </a>
      <a href="/${FIRST_PATH}/Billing/Summary" class="card" style="text-decoration:none; color:inherit;">
        <h3>\u{1F4B3} Billing</h3>
        <div class="detail">View and pay your bills</div>
      </a>
      <a href="/${FIRST_PATH}/Clinical/CareTeam" class="card" style="text-decoration:none; color:inherit;">
        <h3>\u{1F468}\u200D\u2695\uFE0F Care Team</h3>
        <div class="detail">Your doctors and providers</div>
      </a>
    </div>
  `);
}

// ─── Medications ──────────────────────────────────────────────────────
export function medicationsPage(): string {
  return portalLayout('Medications', 'Clinical/Medications', `
    <h1>Medications</h1>
    <div id="content"><div class="loading">Loading medications...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/medications/loadmedicationspage', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var meds = (data.communityMembers && data.communityMembers[0] && data.communityMembers[0].prescriptionList) ? data.communityMembers[0].prescriptionList.prescriptions : [];
          document.getElementById('content').innerHTML = meds.length === 0 ? '<p>No medications found.</p>' :
            meds.map(m => '<div class="card">' +
              '<h3>' + m.name + '</h3>' +
              '<div class="detail">' + m.sig + '</div>' +
              '<div class="meta">Prescribed by ' + m.authorizingProvider.name + ' on ' + m.dateToDisplay + '</div>' +
              (m.refillDetails && m.refillDetails.isRefillable ? '<div class="meta"><span class="badge badge-green">Refillable</span> Qty: ' + m.refillDetails.writtenDispenseQuantity + ' | ' + m.refillDetails.daySupply + ' day supply</div>' : '') +
              (m.refillDetails && m.refillDetails.owningPharmacy ? '<div class="meta">\u{1F3E5} ' + m.refillDetails.owningPharmacy.name + '</div>' : '') +
            '</div>').join('');
        });
    </script>
  `);
}

// ─── Allergies ────────────────────────────────────────────────────────
export function allergiesPage(): string {
  return portalLayout('Allergies', 'Clinical/Allergies', `
    <h1>Allergies</h1>
    <div id="content"><div class="loading">Loading allergies...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/allergies/loadallergies', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var items = data.dataList || [];
          document.getElementById('content').innerHTML = items.length === 0 ? '<p>No allergies on file.</p>' :
            '<table><tr><th>Allergen</th><th>Type</th><th>Reaction</th><th>Severity</th><th>Date Noted</th></tr>' +
            items.map(a => {
              var i = a.allergyItem;
              var sev = i.severity === 'Severe' ? 'badge-red' : i.severity === 'Moderate' ? 'badge-yellow' : 'badge-green';
              return '<tr><td><strong>' + i.name + '</strong></td><td>' + i.type + '</td><td>' + i.reaction + '</td><td><span class="badge ' + sev + '">' + i.severity + '</span></td><td>' + i.formattedDateNoted + '</td></tr>';
            }).join('') + '</table>';
        });
    </script>
  `);
}

// ─── Health Issues ────────────────────────────────────────────────────
export function healthIssuesPage(): string {
  return portalLayout('Health Issues', 'Clinical/HealthIssues', `
    <h1>Health Issues</h1>
    <div id="content"><div class="loading">Loading health issues...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/healthissues/loadhealthissuesdata', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var items = data.dataList || [];
          document.getElementById('content').innerHTML = items.length === 0 ? '<p>No health issues on file.</p>' :
            '<table><tr><th>Condition</th><th>Date Noted</th></tr>' +
            items.map(h => '<tr><td><strong>' + h.healthIssueItem.name + '</strong></td><td>' + h.healthIssueItem.formattedDateNoted + '</td></tr>').join('') + '</table>';
        });
    </script>
  `);
}

// ─── Immunizations ────────────────────────────────────────────────────
export function immunizationsPage(): string {
  return portalLayout('Immunizations', 'Clinical/Immunizations', `
    <h1>Immunizations</h1>
    <div id="content"><div class="loading">Loading immunizations...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/immunizations/loadimmunizations', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var orgs = data.organizationImmunizationList || [];
          document.getElementById('content').innerHTML = orgs.map(org =>
            '<h2>' + org.organization.organizationName + '</h2>' +
            '<table><tr><th>Vaccine</th><th>Dates Administered</th></tr>' +
            org.orgImmunizations.map(imm =>
              '<tr><td><strong>' + imm.name + '</strong></td><td>' + imm.formattedAdministeredDates.join(', ') + '</td></tr>'
            ).join('') + '</table>'
          ).join('');
        });
    </script>
  `);
}

// ─── Vitals ──────────────────────────────────────────────────────────
export function vitalsPage(): string {
  return portalLayout('Vitals', 'TrackMyHealth', `
    <h1>Vitals</h1>
    <div id="content"><div class="loading">Loading vitals...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/track-my-health/getflowsheets', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var sheets = data.flowsheets || [];
          document.getElementById('content').innerHTML = sheets.map(fs =>
            '<div class="card"><h3>' + fs.name + '</h3>' +
            '<table><tr><th>Date</th><th>Value</th><th>Units</th></tr>' +
            fs.readings.map(r =>
              '<tr><td>' + r.date + '</td><td><strong>' + r.value + '</strong></td><td>' + r.units + '</td></tr>'
            ).join('') + '</table></div>'
          ).join('');
        });
    </script>
  `);
}

// ─── Medical History ──────────────────────────────────────────────────
export function medicalHistoryPage(): string {
  return portalLayout('Medical History', 'MedicalHistory', `
    <h1>Medical History</h1>
    <div id="content"><div class="loading">Loading medical history...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/histories/loadhistoriesviewmodel', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var html = '';
          if (data.medicalHistory) {
            html += '<h2>Diagnoses</h2><table><tr><th>Diagnosis</th><th>Date</th></tr>' +
              (data.medicalHistory.diagnoses || []).map(d => '<tr><td><strong>' + d.diagnosisName + '</strong></td><td>' + d.diagnosisDate + '</td></tr>').join('') + '</table>';
            if (data.medicalHistory.medicalHistoryNotes) html += '<div class="card"><div class="detail">' + data.medicalHistory.medicalHistoryNotes + '</div></div>';
          }
          if (data.surgicalHistory) {
            html += '<h2>Surgical History</h2><table><tr><th>Surgery</th><th>Date</th></tr>' +
              (data.surgicalHistory.surgeries || []).map(s => '<tr><td><strong>' + s.surgeryName + '</strong></td><td>' + s.surgeryDate + '</td></tr>').join('') + '</table>';
          }
          if (data.familyHistoryAndStatus) {
            html += '<h2>Family History</h2><table><tr><th>Relationship</th><th>Status</th><th>Conditions</th></tr>' +
              (data.familyHistoryAndStatus.familyMembers || []).map(f => '<tr><td><strong>' + f.relationshipToPatientName + '</strong></td><td>' + f.statusName + '</td><td>' + (f.conditions || []).join(', ') + '</td></tr>').join('') + '</table>';
          }
          document.getElementById('content').innerHTML = html || '<p>No medical history available.</p>';
        });
    </script>
  `);
}

// ─── Test Results ─────────────────────────────────────────────────────
export function testResultsPage(): string {
  return portalLayout('Test Results', 'TestResults', `
    <h1>Test Results</h1>
    <div class="tabs">
      <div class="tab active" onclick="loadResults(1, this)">Lab Results</div>
      <div class="tab" onclick="loadResults(2, this)">Imaging</div>
    </div>
    <div id="content"><div class="loading">Loading results...</div></div>
    <div id="detail" class="msg-thread"></div>
    <script>
      function loadResults(groupType, tabEl) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        if (tabEl) tabEl.classList.add('active');
        document.getElementById('detail').classList.remove('visible');
        document.getElementById('detail').innerHTML = '';
        fetch('/${FIRST_PATH}/api/test-results/getlist', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupType: groupType })
        }).then(r => r.json()).then(data => {
          var groups = data.newResultGroups || [];
          var results = data.newResults || {};
          if (groups.length === 0) {
            document.getElementById('content').innerHTML = '<p>No results found.</p>';
            return;
          }
          document.getElementById('content').innerHTML = '<table><tr><th>Test</th><th>Date</th><th>Provider</th><th>Status</th></tr>' +
            groups.map(g => {
              var rKey = g.resultList[0] + '^';
              var r = results[rKey];
              var name = r ? r.name : g.key;
              var abnormal = r && r.isAbnormal;
              return '<tr style="cursor:pointer" onclick="loadDetail(\\'' + g.key + '\\')">' +
                '<td><strong' + (abnormal ? ' class="abnormal"' : '') + '>' + name + '</strong></td>' +
                '<td>' + g.formattedDate + '</td>' +
                '<td>' + (r ? r.orderMetadata.orderProviderName : '') + '</td>' +
                '<td>' + (abnormal ? '<span class="badge badge-red">Abnormal</span>' : '<span class="badge badge-green">Normal</span>') + '</td></tr>';
            }).join('') + '</table>';
        });
      }
      function loadDetail(orderKey) {
        fetch('/${FIRST_PATH}/api/test-results/getdetails', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderKey: orderKey })
        }).then(r => r.json()).then(data => {
          var detail = document.getElementById('detail');
          var res = data.results && data.results[0];
          if (!res) { detail.innerHTML = '<p>No details available.</p>'; detail.classList.add('visible'); return; }
          var html = '<h2>' + (data.orderName || res.name) + '</h2>';
          html += '<div class="meta">' + res.orderMetadata.resultTimestampDisplay + ' | ' + res.orderMetadata.orderProviderName + '</div>';
          if (res.resultComponents && res.resultComponents.length > 0) {
            html += '<table style="margin-top:12px"><tr><th>Component</th><th>Value</th><th>Reference Range</th><th>Status</th></tr>';
            res.resultComponents.forEach(c => {
              var abnormal = c.componentResultInfo.abnormalFlagCategoryValue > 1;
              html += '<tr><td>' + c.componentInfo.name + '</td><td' + (abnormal ? ' class="abnormal"' : '') + '><strong>' + c.componentResultInfo.value + ' ' + c.componentInfo.units + '</strong></td><td>' + c.componentResultInfo.referenceRange.formattedReferenceRange + '</td><td>' + (abnormal ? '<span class="badge badge-red">Abnormal</span>' : '<span class="badge badge-green">Normal</span>') + '</td></tr>';
            });
            html += '</table>';
          }
          if (res.studyResult && res.studyResult.narrative && res.studyResult.narrative.hasContent) {
            html += '<h3 style="margin-top:16px">Findings</h3><div class="card"><div class="detail">' + res.studyResult.narrative.contentAsString + '</div></div>';
          }
          if (res.studyResult && res.studyResult.impression && res.studyResult.impression.hasContent) {
            html += '<h3>Impression</h3><div class="card"><div class="detail">' + res.studyResult.impression.contentAsString + '</div></div>';
          }
          if (res.imageStudies && res.imageStudies.length > 0) {
            html += '<h3>Images</h3>';
            res.imageStudies.forEach(img => {
              html += '<div class="card"><strong>' + img.studyDescription + '</strong><div class="meta">' + img.studyDate + ' | ' + img.numberOfImages + ' images | Modality: ' + img.modality + '</div></div>';
            });
          }
          detail.innerHTML = html;
          detail.classList.add('visible');
        });
      }
      loadResults(1, null);
    </script>
  `);
}

// ─── Messages ─────────────────────────────────────────────────────────
export function messagesPage(): string {
  return portalLayout('Messages', 'Messaging', `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h1 style="margin-bottom:0">Messages</h1>
      <button onclick="showCompose()" style="padding:10px 20px; background:#1a5276; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer;">New Message</button>
    </div>

    <!-- Compose new message form -->
    <div id="compose" class="msg-thread">
      <h2>New Message</h2>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">To:</label>
        <select id="composeRecipient" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
          <option value="">Loading providers...</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Topic:</label>
        <select id="composeTopic" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
          <option value="">Loading topics...</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Subject:</label>
        <input type="text" id="composeSubject" placeholder="Enter a subject" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:14px;" />
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Message:</label>
        <textarea id="composeBody" rows="5" placeholder="Type your message..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:14px; resize:vertical;"></textarea>
      </div>
      <div style="display:flex; gap:8px;">
        <button onclick="sendNewMessage()" style="padding:10px 20px; background:#1a5276; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer;">Send</button>
        <button onclick="hideCompose()" style="padding:10px 20px; background:#eee; color:#333; border:1px solid #ccc; border-radius:6px; font-size:14px; cursor:pointer;">Cancel</button>
      </div>
    </div>

    <div id="content"><div class="loading">Loading messages...</div></div>

    <!-- Thread view with reply -->
    <div id="thread" class="msg-thread"></div>

    <script>
      var currentConvId = null;

      // Load conversation list
      function loadConversations() {
        fetch('/${FIRST_PATH}/api/conversations/getconversationlist', { method: 'POST', credentials: 'same-origin' })
          .then(r => r.json()).then(data => {
            var convs = data.conversations || [];
            if (convs.length === 0) {
              document.getElementById('content').innerHTML = '<p>No messages.</p>';
              return;
            }
            document.getElementById('content').innerHTML = '<div class="msg-list">' +
              convs.map(c => '<div class="msg-item" onclick="loadThread(\\'' + c.hthId + '\\')">' +
                '<div class="msg-subject">' + c.subject + '</div>' +
                '<div class="msg-preview">' + (c.previewText || '') + '</div>' +
                '<div class="msg-meta">With: ' + (c.audience || []).map(a => a.name).join(', ') + '</div>' +
              '</div>').join('') + '</div>';
          });
      }

      // Load a thread and show reply box
      function loadThread(convId) {
        currentConvId = convId;
        fetch('/${FIRST_PATH}/api/conversations/getconversationmessages', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convId })
        }).then(r => r.json()).then(data => {
          var thread = document.getElementById('thread');
          var msgs = data.messages || [];
          var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
            '<h2 style="margin:0;">Conversation</h2>' +
            '<button onclick="closeThread()" style="padding:6px 12px; background:#eee; color:#333; border:1px solid #ccc; border-radius:4px; font-size:13px; cursor:pointer;">Back to inbox</button></div>';
          html += msgs.map(m => {
            var isPatient = m.author.wprKey && !m.author.empKey;
            return '<div class="msg-bubble ' + (isPatient ? 'patient' : 'provider') + '">' +
              '<div class="author">' + m.author.displayName + '</div>' +
              '<div class="body">' + m.body + '</div>' +
              '<div class="time">' + new Date(m.deliveryInstantISO).toLocaleString() + '</div>' +
            '</div>';
          }).join('');
          // Reply box
          html += '<div style="margin-top:16px; padding-top:16px; border-top:1px solid #e0e0e0;">' +
            '<label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Reply:</label>' +
            '<textarea id="replyBody" rows="3" placeholder="Type your reply..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:14px; resize:vertical; margin-bottom:8px;"></textarea>' +
            '<button onclick="sendReply()" style="padding:8px 16px; background:#1a5276; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer;">Send Reply</button>' +
          '</div>';
          thread.innerHTML = html;
          thread.classList.add('visible');
          thread.scrollIntoView({ behavior: 'smooth' });
        });
      }

      function closeThread() {
        currentConvId = null;
        document.getElementById('thread').classList.remove('visible');
        document.getElementById('thread').innerHTML = '';
      }

      // Send reply to current thread
      function sendReply() {
        var body = document.getElementById('replyBody').value.trim();
        if (!body) { alert('Please enter a reply.'); return; }
        fetch('/${FIRST_PATH}/api/conversations/sendreply', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: currentConvId, messageBody: body })
        }).then(r => r.json()).then(() => {
          loadThread(currentConvId);
          loadConversations();
        });
      }

      // Compose new message
      function showCompose() {
        document.getElementById('compose').classList.add('visible');
        // Load recipients
        fetch('/${FIRST_PATH}/api/medicaladvicerequests/getmedicaladvicerequestrecipients', { method: 'POST', credentials: 'same-origin' })
          .then(r => r.json()).then(data => {
            var recipients = Array.isArray(data) ? data : [];
            var sel = document.getElementById('composeRecipient');
            sel.innerHTML = '<option value="">Select a provider...</option>' +
              recipients.map(r => '<option value="' + r.id + '" data-name="' + r.name + '">' + r.name + ' (' + r.specialty + ')</option>').join('');
          });
        // Load topics
        fetch('/${FIRST_PATH}/api/medicaladvicerequests/getsubtopics', { method: 'POST', credentials: 'same-origin' })
          .then(r => r.json()).then(data => {
            var topics = data.topicList || [];
            var sel = document.getElementById('composeTopic');
            sel.innerHTML = '<option value="">Select a topic...</option>' +
              topics.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('');
          });
      }

      function hideCompose() {
        document.getElementById('compose').classList.remove('visible');
        document.getElementById('composeSubject').value = '';
        document.getElementById('composeBody').value = '';
      }

      function sendNewMessage() {
        var recipientEl = document.getElementById('composeRecipient');
        var recipientId = recipientEl.value;
        var recipientName = recipientEl.options[recipientEl.selectedIndex].getAttribute('data-name') || '';
        var subject = document.getElementById('composeSubject').value.trim();
        var body = document.getElementById('composeBody').value.trim();
        if (!recipientId) { alert('Please select a provider.'); return; }
        if (!subject) { alert('Please enter a subject.'); return; }
        if (!body) { alert('Please enter a message.'); return; }

        // Get compose ID first
        fetch('/${FIRST_PATH}/api/conversations/getcomposeid', { method: 'POST', credentials: 'same-origin' })
          .then(r => r.json()).then(composeId => {
            // Send the message
            return fetch('/${FIRST_PATH}/api/medicaladvicerequests/sendmedicaladvicerequest', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipientId: recipientId, recipientName: recipientName, subject: subject, messageBody: body, composeId: composeId })
            });
          })
          .then(r => r.json()).then(() => {
            // Clean up compose ID
            fetch('/${FIRST_PATH}/api/conversations/removecomposeid', { method: 'POST', credentials: 'same-origin' });
            hideCompose();
            loadConversations();
          });
      }

      // Initial load
      loadConversations();
    </script>
  `);
}

// ─── Visits ──────────────────────────────────────────────────────────
export function visitsPage(): string {
  return portalLayout('Visits', 'Visits', `
    <h1>Visits</h1>
    <div class="tabs">
      <div class="tab active" id="tab-upcoming" onclick="showTab('upcoming')">Upcoming</div>
      <div class="tab" id="tab-past" onclick="showTab('past')">Past</div>
    </div>
    <div id="content"><div class="loading">Loading visits...</div></div>
    <script>
      var visitData = {};
      function showTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        renderVisits(tab);
      }
      function renderVisits(tab) {
        var visits = tab === 'upcoming' ? (visitData.upcoming || []) : (visitData.past || []);
        if (visits.length === 0) {
          document.getElementById('content').innerHTML = '<p>No ' + tab + ' visits.</p>';
          return;
        }
        document.getElementById('content').innerHTML = visits.map(v => {
          var d = new Date(v.PrimaryDate);
          return '<div class="card">' +
            '<h3>' + v.VisitType + '</h3>' +
            '<div class="detail">' + d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</div>' +
            '<div class="meta">' + (v.Providers || []).map(p => p.Name).join(', ') + '</div>' +
            '<div class="meta">\u{1F4CD} ' + v.Location + '</div>' +
            (v.LocationAddress ? '<div class="meta">' + v.LocationAddress + '</div>' : '') +
          '</div>';
        }).join('');
      }
      Promise.all([
        fetch('/${FIRST_PATH}/Visits/VisitsList/LoadUpcoming', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()),
        fetch('/${FIRST_PATH}/Visits/VisitsList/LoadPast', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()),
      ]).then(([up, past]) => {
        visitData.upcoming = (up.LaterVisitsList || []).concat(up.EarlierVisitsList || []);
        visitData.past = past.PastVisitsList || [];
        renderVisits('upcoming');
      });
    </script>
  `);
}

// ─── Care Team ───────────────────────────────────────────────────────
export function careTeamPage(providers: Array<{ name: string; role: string; specialty: string }>): string {
  const cards = providers.map(p => `
    <div class="card careteam-provider">
      <h3 class="provider-name">${p.name}</h3>
      <div class="detail provider-role">${p.role}</div>
      <div class="meta provider-specialty">${p.specialty}</div>
    </div>
  `).join('');
  return portalLayout('Care Team', 'Clinical/CareTeam', `<h1>Care Team</h1><div class="card-grid">${cards}</div>`);
}

// ─── Insurance ───────────────────────────────────────────────────────
export function insurancePage(plans: Array<{ planName: string; subscriberName: string; memberId: string; groupNumber: string }>): string {
  const cards = plans.map(p => `
    <div class="card coverage-card">
      <h3>${p.planName}</h3>
      <div class="detail subscriber-name">Subscriber: ${p.subscriberName}</div>
      <div class="meta member-id">Member ID: ${p.memberId}</div>
      <div class="meta group-number">Group: ${p.groupNumber}</div>
    </div>
  `).join('');
  return portalLayout('Insurance', 'Insurance', `<h1>Insurance</h1>${cards}`);
}

// ─── Preventive Care ──────────────────────────────────────────────────
export function preventiveCarePage(items: Array<{ name: string; status: string; date: string }>): string {
  const rows = items.map(item => {
    const badge = item.status === 'overdue' ? 'badge-red' : item.status === 'due' ? 'badge-yellow' : 'badge-green';
    const label = item.status === 'overdue' ? 'Overdue' : item.status === 'due' ? 'Due' : 'Completed';
    const dateLabel = item.status === 'overdue' ? `Overdue since ${item.date}` : item.status === 'due' ? `Not due until ${item.date}` : `Completed on ${item.date}`;
    return `<tr><td><strong>${item.name}</strong></td><td><span class="badge ${badge}">${label}</span></td><td>${dateLabel}</td></tr>`;
  }).join('');
  // Keep original format for scraper compat
  const scraperLines = items.map(item => {
    if (item.status === 'overdue') return `${item.name}\nOverdue since ${item.date}`;
    if (item.status === 'due') return `${item.name}\nNot due until ${item.date}`;
    return `${item.name}\nCompleted on ${item.date}`;
  }).join('\n\n');
  return portalLayout('Preventive Care', 'HealthAdvisories', `
    <h1>Preventive Care</h1>
    <table><tr><th>Screening</th><th>Status</th><th>Details</th></tr>${rows}</table>
    <div class="healthAdvisories" style="display:none">${scraperLines}</div>
  `);
}

// ─── Billing ──────────────────────────────────────────────────────────
export function billingSummaryPage(accounts: Array<{
  guarantorId: string; guarantorName: string; amountDue: string; lastPaid: string; detailsId: string; detailsContext: string;
}>): string {
  const cards = accounts.map(a => `
    <div class="card col-6 ba_card">
      <h3>\u{1F4B3} Account #${a.guarantorId}</h3>
      <div class="detail">${a.guarantorName}</div>
      <div style="font-size:28px; font-weight:700; color:#c0392b; margin: 12px 0;">
        <p class="ba_card_status_due_amount moneyColor">${a.amountDue}</p>
      </div>
      <div class="meta ba_card_status_due_label">Amount Due</div>
      <p class="meta ba_card_status_recentPaymentLabel">
        <a href="/${FIRST_PATH}/Billing/Details?ID=${a.detailsId}&Context=${a.detailsContext}&tab=3" title="View payment history">${a.lastPaid}</a>
      </p>
      <div class="meta" style="margin-top:8px;">
        <span class="ba_card_header_saLabel ba_card_header_saLabel_saName">Springfield Nuclear Power Plant</span>
      </div>
      <p class="ba_card_header_account_idAndType" style="display:none">Guarantor #${a.guarantorId} (${a.guarantorName})</p>
    </div>
  `).join('');
  return portalLayout('Billing', 'Billing/Summary', `<h1>Billing</h1>${cards}`);
}

export function billingDetailsPage(encId: string): string {
  return portalLayout('Billing Details', 'Billing/Summary', `
    <h1>Billing Details</h1>
    <div id="content"><div class="loading">Loading billing details...</div></div>
    <script>
      accountDetailsController = { Initialize: function(d) { window._billingData = d; } };
    </script>
    <script>
      accountDetailsController.Initialize({ "ID": "742", "EncID": "${encId}", "EncCID": "" });
    </script>
    <script>
      fetch('/${FIRST_PATH}/Billing/Details/GetVisits', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var visits = (data.Data && data.Data.InformationalVisitList) || [];
          document.getElementById('content').innerHTML = visits.map(v =>
            '<div class="card">' +
              '<h3>' + v.Description + '</h3>' +
              '<div class="detail">' + v.StartDateDisplay + '</div>' +
              '<div class="meta">' + v.Provider + ' | ' + v.Patient + '</div>' +
              '<div style="display:flex;justify-content:space-between;margin-top:12px">' +
                '<div><div class="meta">Total Charges</div><div style="font-weight:600">' + v.ChargeAmount + '</div></div>' +
                '<div><div class="meta">Insurance</div><div style="font-weight:600">' + v.InsuranceAmountDue + '</div></div>' +
                '<div><div class="meta">You Owe</div><div style="font-weight:600;color:#c0392b">' + v.SelfAmountDue + '</div></div>' +
              '</div>' +
              (v.ProcedureList ? '<table style="margin-top:12px"><tr><th>Procedure</th><th>Amount</th><th>You Owe</th></tr>' +
                v.ProcedureList.map(p => '<tr><td>' + p.Description + '</td><td>' + p.Amount + '</td><td>' + p.SelfAmountDue + '</td></tr>').join('') + '</table>' : '') +
            '</div>'
          ).join('') || '<p>No billing details available.</p>';
        });
    </script>
  `);
}

// ─── Letters ──────────────────────────────────────────────────────────
export function lettersPage(): string {
  return portalLayout('Letters', 'Letters', `
    <h1>Letters</h1>
    <div id="content"><div class="loading">Loading letters...</div></div>
    <div id="letterDetail" class="msg-thread"></div>
    <script>
      fetch('/${FIRST_PATH}/api/letters/getletterslist', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var letters = data.letters || [];
          var users = data.users || {};
          document.getElementById('content').innerHTML = letters.length === 0 ? '<p>No letters.</p>' :
            letters.map(l => {
              var provider = users[l.empId] ? users[l.empId].name : '';
              var d = new Date(l.dateISO);
              return '<div class="card" style="cursor:pointer" onclick="loadLetter(\\'' + l.hnoId + '\\')">' +
                '<h3>' + l.reason + '</h3>' +
                '<div class="meta">' + provider + ' | ' + d.toLocaleDateString() + '</div>' +
                (!l.viewed ? '<span class="badge badge-blue">New</span>' : '') +
              '</div>';
            }).join('');
        });
      function loadLetter(hnoId) {
        fetch('/${FIRST_PATH}/api/letters/getletterdetails', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hnoId: hnoId })
        }).then(r => r.json()).then(data => {
          var el = document.getElementById('letterDetail');
          el.innerHTML = '<div class="letter-body">' + (data.bodyHTML || '<p>No content.</p>') + '</div>';
          el.classList.add('visible');
          el.scrollIntoView({ behavior: 'smooth' });
        });
      }
    </script>
  `);
}

// ─── Goals ──────────────────────────────────────────────────────────
export function goalsPage(): string {
  return portalLayout('Goals', 'Goals', `
    <h1>Goals</h1>
    <div id="content"><div class="loading">Loading goals...</div></div>
    <script>
      Promise.all([
        fetch('/${FIRST_PATH}/api/goals/loadcareteamgoals', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()),
        fetch('/${FIRST_PATH}/api/goals/loadpatientgoals', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()),
      ]).then(([ct, pt]) => {
        var html = '<h2>Care Team Goals</h2>';
        var ctGoals = ct.goals || [];
        html += ctGoals.map(g => {
          var badge = g.status === 'In Progress' ? 'badge-blue' : g.status === 'Completed' ? 'badge-green' : 'badge-gray';
          return '<div class="card"><h3>' + g.name + '</h3><div class="detail">' + g.description + '</div><div class="meta"><span class="badge ' + badge + '">' + g.status + '</span> | Target: ' + g.targetDate + '</div></div>';
        }).join('');
        html += '<h2>My Goals</h2>';
        var ptGoals = pt.goals || [];
        html += ptGoals.map(g => {
          var badge = g.status === 'In Progress' ? 'badge-blue' : g.status === 'Completed' ? 'badge-green' : 'badge-gray';
          return '<div class="card"><h3>' + g.name + '</h3><div class="detail">' + g.description + '</div><div class="meta"><span class="badge ' + badge + '">' + g.status + '</span> | Target: ' + g.targetDate + '</div></div>';
        }).join('');
        document.getElementById('content').innerHTML = html;
      });
    </script>
  `);
}

// ─── Referrals ────────────────────────────────────────────────────────
export function referralsPage(): string {
  return portalLayout('Referrals', 'Referrals', `
    <h1>Referrals</h1>
    <div id="content"><div class="loading">Loading referrals...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/referrals/listreferrals', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var refs = data.referralList || [];
          document.getElementById('content').innerHTML = refs.length === 0 ? '<p>No referrals.</p>' :
            refs.map(r => '<div class="card">' +
              '<h3>Referral to ' + r.referredToProviderName + '</h3>' +
              '<div class="detail">' + r.referredToFacility + '</div>' +
              '<div class="meta">Referred by: ' + r.referredByProviderName + ' | Created: ' + r.creationDate + '</div>' +
              '<div class="meta"><span class="badge badge-green">' + r.statusString + '</span> | Valid: ' + r.start + ' - ' + r.end + '</div>' +
            '</div>').join('');
        });
    </script>
  `);
}

// ─── Care Journeys ────────────────────────────────────────────────────
export function careJourneysPage(): string {
  return portalLayout('Care Journeys', 'CareJourneys', `
    <h1>Care Journeys</h1>
    <div id="content"><div class="loading">Loading care journeys...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/care-journeys/getcarejourneys', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var cjs = data.careJourneys || [];
          document.getElementById('content').innerHTML = cjs.length === 0 ? '<p>No care journeys.</p>' :
            cjs.map(cj => '<div class="card">' +
              '<h3>' + cj.name + '</h3>' +
              '<div class="detail">' + cj.description + '</div>' +
              '<div class="meta"><span class="badge badge-green">' + cj.status + '</span> | ' + cj.providerName + '</div>' +
            '</div>').join('');
        });
    </script>
  `);
}

// ─── Documents ────────────────────────────────────────────────────────
export function documentsPage(): string {
  return portalLayout('Documents', 'Documents', `
    <h1>Documents</h1>
    <div id="content"><div class="loading">Loading documents...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/documents/viewer/loadotherdocuments', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var docs = data.documents || [];
          document.getElementById('content').innerHTML = docs.length === 0 ? '<p>No documents.</p>' :
            '<table><tr><th>Title</th><th>Type</th><th>Date</th><th>Provider</th><th>Organization</th></tr>' +
            docs.map(d => '<tr><td><strong>' + d.title + '</strong></td><td>' + d.documentType + '</td><td>' + d.date + '</td><td>' + d.providerName + '</td><td>' + d.organizationName + '</td></tr>').join('') + '</table>';
        });
    </script>
  `);
}

// ─── Education ────────────────────────────────────────────────────────
export function educationPage(): string {
  return portalLayout('Education Materials', 'Education', `
    <h1>Education Materials</h1>
    <div id="content"><div class="loading">Loading education materials...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/education/getpateducationtitles', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var titles = data.educationTitles || [];
          document.getElementById('content').innerHTML = titles.length === 0 ? '<p>No education materials.</p>' :
            titles.map(t => '<div class="card">' +
              '<h3>' + t.title + '</h3>' +
              '<div class="meta"><span class="badge badge-blue">' + t.category + '</span> | Assigned: ' + t.assignedDate + ' | ' + t.providerName + '</div>' +
            '</div>').join('');
        });
    </script>
  `);
}

// ─── Emergency Contacts ──────────────────────────────────────────────
export function emergencyContactsPage(): string {
  return portalLayout('Emergency Contacts', 'EmergencyContacts', `
    <h1>Emergency Contacts</h1>
    <div id="content"><div class="loading">Loading contacts...</div></div>
    <script>
      fetch('/${FIRST_PATH}/api/personalinformation/getrelationships', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json()).then(data => {
          var contacts = data.relationships || [];
          document.getElementById('content').innerHTML = contacts.length === 0 ? '<p>No emergency contacts.</p>' :
            '<div class="card-grid">' + contacts.map(c => '<div class="card">' +
              '<h3>' + c.name + '</h3>' +
              '<div class="detail">' + c.relationshipType + '</div>' +
              '<div class="meta">\u{1F4DE} ' + c.phoneNumber + '</div>' +
            '</div>').join('') + '</div>';
        });
    </script>
  `);
}

// ─── Profile / Personal Information ──────────────────────────────────
export function profilePage(): string {
  return portalLayout('Profile', 'PersonalInformation', `
    <h1>Personal Information</h1>
    <div id="content"><div class="loading">Loading profile...</div></div>
    <script>
      Promise.all([
        fetch('/${FIRST_PATH}/PersonalInformation/GetContactInformation', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()),
        fetch('/${FIRST_PATH}/api/health-summary/fetchhealthsummary', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()),
      ]).then(([contact, summary]) => {
        var email = contact.SecureCommunicationInfo ? contact.SecureCommunicationInfo.EmailAddress : 'N/A';
        var h = summary.header || {};
        document.getElementById('content').innerHTML =
          '<div class="card-grid">' +
            '<div class="card"><h3>Contact</h3><div class="detail">\u2709\uFE0F ' + email + '</div></div>' +
            '<div class="card"><h3>Demographics</h3><div class="detail">Age: ' + (h.patientAge || 'N/A') + '</div><div class="detail">Blood Type: ' + (h.bloodType || 'N/A') + '</div></div>' +
            '<div class="card"><h3>Measurements</h3><div class="detail">Height: ' + (h.height ? h.height.value : 'N/A') + '</div><div class="detail">Weight: ' + (h.weight ? h.weight.value : 'N/A') + '</div></div>' +
          '</div>';
      });
    </script>
  `);
}

// ─── Terms & Conditions ──────────────────────────────────────────────
export function termsConditionsPage(): string {
  const token = generateCsrfToken();
  return `<!DOCTYPE html>
<html lang="en">
<head><title>MyChart - Terms and Conditions</title></head>
<body>
  <div>Terms and Conditions</div>
  <p>Please review and accept the MyChart Terms and Conditions to continue.</p>
  <form method="POST" action="/${FIRST_PATH}/Authentication/TermsConditions">
    <input name="__RequestVerificationToken" type="hidden" value="${token}" />
    <p>By clicking Accept, you agree to the MyChart Terms of Use and Privacy Policy.</p>
    <button type="submit">I Accept</button>
  </form>
</body></html>`;
}

// ─── Token-only pages (backward compat for scrapers) ──────────────────
export function csrfTokenPage(): string {
  const token = generateCsrfToken();
  return `<html><body><input name="__RequestVerificationToken" type="hidden" value="${token}" /></body></html>`;
}

export function genericTokenPage(title: string): string {
  return basePageShell(title, '<div></div>');
}

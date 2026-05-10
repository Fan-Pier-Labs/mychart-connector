import { NextRequest, NextResponse } from 'next/server';
import { resetState } from '@/lib/state';

const RESET_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Fake MyChart — Reset</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 540px; margin: 60px auto; padding: 0 20px; color: #222; }
    h1 { color: #1a5276; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-top: 20px; }
    button { background: #c0392b; color: #fff; border: none; padding: 12px 24px; border-radius: 4px; font-size: 16px; cursor: pointer; }
    button:hover { background: #e74c3c; }
    button:disabled { background: #999; cursor: not-allowed; }
    .ok { color: #27ae60; margin-top: 16px; font-weight: 600; }
    .err { color: #c0392b; margin-top: 16px; font-weight: 600; }
    ul { margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Fake MyChart — Reset</h1>
  <p>Wipe all in-memory state and restore the server to its starting Homer Simpson seed data.</p>
  <div class="card">
    <strong>Resetting will:</strong>
    <ul>
      <li>Sign out every active session</li>
      <li>Clear all sent messages and message replies</li>
      <li>Restore the original emergency contacts list</li>
      <li>Disable TOTP and remove all passkeys for every user</li>
      <li>Forget all booked appointments</li>
    </ul>
    <p style="margin-top: 20px;">
      <button id="reset-btn" onclick="doReset()">Reset Fake MyChart RAM</button>
    </p>
    <div id="status"></div>
  </div>
  <script>
    function doReset() {
      var btn = document.getElementById('reset-btn');
      var status = document.getElementById('status');
      btn.disabled = true;
      status.innerHTML = 'Resetting...';
      fetch('/reset', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.ok) {
            status.innerHTML = '<div class="ok">Done. State reset to starting values.</div>';
          } else {
            status.innerHTML = '<div class="err">Reset failed.</div>';
          }
        })
        .catch(function(err) {
          status.innerHTML = '<div class="err">Reset failed: ' + err + '</div>';
        })
        .finally(function() {
          btn.disabled = false;
        });
    }
  </script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(RESET_PAGE, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(_request: NextRequest) {
  resetState();
  return NextResponse.json({ ok: true });
}

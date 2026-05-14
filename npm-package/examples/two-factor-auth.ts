/**
 * Walk through a 2FA login. Demonstrates the discriminated union of
 * `ConnectResult` and the `pending.complete()` step.
 */
import readline from 'node:readline/promises';
import { MyChartClient } from 'mychart-cli';

const result = await MyChartClient.connect({
  hostname: process.env.MYCHART_HOSTNAME!,
  user:     process.env.MYCHART_USER!,
  pass:     process.env.MYCHART_PASS!,
});

if (result.state === 'invalid_login' || result.state === 'error') {
  console.error('Login failed:', result);
  process.exit(1);
}

let client;
if (result.state === 'connected') {
  client = result.client;
} else {
  // result.state === 'need_2fa'
  console.log(
    `Code sent via ${result.delivery?.method ?? 'unknown'}` +
    (result.delivery?.contact ? ` to ${result.delivery.contact}` : ''),
  );
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question('Code: ')).trim();
  rl.close();
  client = await result.complete(code);
}

console.log(await client.getProfile());
client.close();

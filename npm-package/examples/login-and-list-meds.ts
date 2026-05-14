/**
 * Minimal example: log in and print current medications.
 *
 * Run against the hosted fake-mychart for a quick smoke test:
 *   bun examples/login-and-list-meds.ts
 */
import { MyChartClient } from 'mychart-cli';

const HOSTNAME = process.env.MYCHART_HOSTNAME ?? 'fake-mychart.fanpierlabs.com';
const USER     = process.env.MYCHART_USER     ?? 'homer';
const PASS     = process.env.MYCHART_PASS     ?? 'donuts123';

const result = await MyChartClient.connect({ hostname: HOSTNAME, user: USER, pass: PASS });

let client;
if (result.state === 'connected') {
  client = result.client;
} else if (result.state === 'need_2fa') {
  // Hosted fake-mychart accepts code 123456.
  client = await result.complete(process.env.MYCHART_2FA ?? '123456');
} else {
  throw new Error(`login failed: ${JSON.stringify(result)}`);
}

const meds = await client.getMedications();
console.log(JSON.stringify(meds, null, 2));

client.close();

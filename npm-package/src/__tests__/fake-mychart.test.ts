/**
 * End-to-end integration test for the published `mychart-cli` package.
 *
 * Imports from the BUILT artifact (`../../dist/index.js`) so the test
 * exercises the same code consumers will run after `npm install`.
 *
 * By default targets the hosted fake-mychart at `fake-mychart.fanpierlabs.com`.
 * Set `FAKE_MYCHART_HOST` to a different host (e.g. `localhost:4000`) to
 * point at a locally-spun-up fake-mychart — that's what CI does. The client
 * auto-detects http for hostnames without a dot.
 *
 * Credentials are the standard Homer Simpson test account from `fake-mychart`.
 */

import { afterAll, beforeAll, expect, test } from 'bun:test';
import type { MyChartClient as MyChartClientT, ConnectResult } from '../../dist/index.js';

// Resolve at runtime so we read whatever is in dist/.
const {
  MyChartClient,
  MyChartRequest,
  getMedications,
  convertCloToJpg,
} = await import('../../dist/index.js') as typeof import('../../dist/index.js');

const HOSTNAME = process.env.FAKE_MYCHART_HOST ?? 'fake-mychart.fanpierlabs.com';
const USER = 'homer';
const PASS = 'donuts123';
const TWO_FA_CODE = '123456';

let client: MyChartClientT;

beforeAll(async () => {
  const result: ConnectResult = await MyChartClient.connect({
    hostname: HOSTNAME,
    user: USER,
    pass: PASS,
    keepalive: false, // disable in tests so timers don't keep the process alive
  });

  if (result.state === 'connected') {
    client = result.client;
    return;
  }
  if (result.state === 'need_2fa') {
    client = await result.complete(TWO_FA_CODE);
    return;
  }
  throw new Error(`login failed: state=${result.state} error=${'error' in result ? result.error : ''}`);
});

afterAll(() => {
  client?.close();
});

test('login establishes a session', async () => {
  expect(client).toBeDefined();
  expect(client.request).toBeInstanceOf(MyChartRequest);
  const cookies = client.request.getCookieInfo();
  expect(cookies.count).toBeGreaterThan(0);
});

test('getProfile returns Homer Simpson', async () => {
  const profile = await client.getProfile();
  expect(profile).toBeDefined();
  // Profile shape is implementation-defined; just verify a non-empty name.
  const name = JSON.stringify(profile).toLowerCase();
  expect(name).toContain('homer');
});

test('getMedications returns a list', async () => {
  const meds = await client.getMedications();
  expect(meds).toBeDefined();
  expect(Array.isArray(meds.medications)).toBe(true);
});

test('raw scraper API also works (parity with class API)', async () => {
  const meds = await getMedications(client.request);
  expect(meds).toBeDefined();
  expect(Array.isArray(meds.medications)).toBe(true);
});

test('serialize → fromSerialized round-trips without re-login', async () => {
  const json = await client.serialize();
  expect(json.length).toBeGreaterThan(0);

  const restored = await MyChartClient.fromSerialized(json, { keepalive: false });
  expect(restored).not.toBeNull();
  const profile = await restored!.getProfile();
  expect(JSON.stringify(profile).toLowerCase()).toContain('homer');
  restored!.close();
});

test('isSessionValid reports the active session as valid', async () => {
  const valid = await client.isSessionValid();
  expect(valid).toBe(true);
});

test('close() prevents further calls', async () => {
  const result = await MyChartClient.connect({
    hostname: HOSTNAME,
    user: USER,
    pass: PASS,
    keepalive: false,
  });
  let throwaway: MyChartClientT;
  if (result.state === 'connected') throwaway = result.client;
  else if (result.state === 'need_2fa') throwaway = await result.complete(TWO_FA_CODE);
  else throw new Error('unexpected login state');

  throwaway.close();
  expect(() => throwaway.getProfile()).toThrow('closed');
});

test('downloadImagingStudyDirect → convertCloToJpg produces a valid JPEG', async () => {
  const imagingResults = await client.getImagingResults();
  expect(Array.isArray(imagingResults)).toBe(true);

  const xray = imagingResults.find(
    (r) => r.fdiContext && (r.orderName ?? '').includes('XR'),
  );
  expect(xray).toBeDefined();
  expect(xray!.fdiContext).toBeDefined();

  const downloadResult = await client.downloadImagingStudy(
    xray!.fdiContext!,
    'Homer Skull XRay',
    '/tmp/npm-package-xray-test',
    { skipFileWrite: true },
  );

  expect(downloadResult.errors).toHaveLength(0);
  expect(downloadResult.images.length).toBeGreaterThan(0);

  const firstImage = downloadResult.images[0];
  expect(firstImage.format).toBe('CLHAAR');
  expect(firstImage.pixelData).toBeDefined();
  expect(firstImage.pixelData!.length).toBeGreaterThan(0);
  expect(firstImage.wrapperData).toBeDefined();

  const jpeg = await convertCloToJpg({
    pixelData: firstImage.pixelData!,
    wrapperData: firstImage.wrapperData!,
  });
  expect(Buffer.isBuffer(jpeg)).toBe(true);
  const buf = jpeg as Buffer;
  expect(buf.byteLength).toBeGreaterThan(1000);
  // JPEG magic: starts with FF D8, ends with FF D9.
  expect(buf[0]).toBe(0xff);
  expect(buf[1]).toBe(0xd8);
  expect(buf[buf.byteLength - 2]).toBe(0xff);
  expect(buf[buf.byteLength - 1]).toBe(0xd9);
}, 120_000);

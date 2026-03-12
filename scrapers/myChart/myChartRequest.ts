import fetchCookie, { FetchCookieImpl } from 'fetch-cookie'
import fs from 'fs';
import {mockRequest} from './mock_data/index'
import { RequestConfig } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const makeFetchCookie = require("fetch-cookie").default as typeof fetchCookie;

const tough = makeFetchCookie.toughCookie;

// Use CookieJar from fetch-cookie's bundled tough-cookie to avoid version mismatch
type CookieJar = InstanceType<typeof makeFetchCookie.toughCookie.CookieJar>;

// Class to keep track of variables used when making requests
// to MyChart's Site.
export class MyChartRequest {

  // Cookie jar to keep track of all the cookies received.
  cookieJar: CookieJar;

  // A wrapper around the built-in fetch to make requests with cookies in the cookie jar.
  fetchWithCookieJar: FetchCookieImpl<string | URL | Request, RequestInit, Response>;

  // The hostname of the MyChart site, eg. mychart.example.org
  hostname: string;

  // Protocol to use for requests. Defaults to 'https'. Set to 'http' for local fake-mychart server.
  protocol: string;

  // the first part of the path. For some instances, it is /MyChart-PRD. For others, it is /MyChart.
  firstPathPart: string = '';

  constructor(hostname: string, protocol?: string) {
    this.cookieJar = new makeFetchCookie.toughCookie.CookieJar();
    this.fetchWithCookieJar = makeFetchCookie(fetch, this.cookieJar);

    this.hostname = MyChartRequest.normalizeHostname(hostname);
    this.protocol = protocol ?? 'https';
  }

  /**
   * Strip protocol/path from user input so only the bare hostname remains.
   * e.g. "https://mychart.example.org/MyChart" → "mychart.example.org"
   */
  static normalizeHostname(input: string): string {
    const trimmed = input.trim();
    try {
      const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      // Use host (includes port) instead of hostname (strips port)
      // so that "localhost:4000" is preserved for local development
      return parsed.host;
    } catch {
      return trimmed;
    }
  }

  getCookieInfo(): { count: number; names: string[] } {
    const serialized = this.cookieJar.serializeSync() as unknown as { cookies?: { key: string; domain?: string; path?: string }[] };
    const cookies = serialized?.cookies ?? [];
    return {
      count: cookies.length,
      names: cookies.map(c => `${c.key}=${c.domain ?? ''}${c.path ?? ''}`),
    };
  }

  async serialize(): Promise<string> {
    return JSON.stringify({
      firstPathPart: this.firstPathPart,
      hostname: this.hostname,
      protocol: this.protocol,
      cookies: await this.cookieJar.serialize()
    })
  }

  static async unserialize(serializedData: string): Promise<MyChartRequest | null> {
    try {
      const data = JSON.parse(serializedData);
      if (data && data.hostname && data.firstPathPart && data.cookies) {
        const request = new MyChartRequest(data.hostname, data.protocol);
        request.firstPathPart = data.firstPathPart;
        if (Object.keys(data.cookies).length > 0) {
          request.cookieJar = await tough.CookieJar.deserialize(data.cookies);
          request.fetchWithCookieJar = makeFetchCookie(fetch, request.cookieJar);
        }
        return request;
      } else {
        console.error('Invalid data for MyChartRequest unserialization:', data);
      }
    } catch (error) {
      console.error('Error unserializing MyChartRequest:', error);
    }
    return null;
  }

  setFirstPathPart(firstPathPart: string) {
    this.firstPathPart = firstPathPart;
  }


  // Save the current state of the cookie jar to a JSON file.
  // Only used for local testing.
  public async saveCookies_TEST(filePath: string): Promise<void> {
    const serializedJar = await this.cookieJar.serialize();
    await fs.promises.writeFile(filePath, JSON.stringify(serializedJar, null, 2));
  }

  // Load cookies from a JSON file into the cookie jar.
  // Save the current state of the cookie jar to a JSON file.
  // Only used for local testing.
  public async loadCookies_TEST(filePath: string): Promise<void> {
    let data;
    try {
      data = await fs.promises.readFile(filePath, 'utf8');
    }
    catch (e) {
      console.log('Error loading cookies:', e);
      return
    }
    const serializedJar = JSON.parse(data);

    // Deserialize into a new CookieJar instance
    this.cookieJar = await tough.CookieJar.deserialize(serializedJar);

    // Recreate the fetch wrapper with the updated jar
    this.fetchWithCookieJar = makeFetchCookie(fetch, this.cookieJar);
  }

  // Make a request with the given config.
  // Returns the raw response object.
  async makeRequest(config: RequestConfig): Promise<Response> {
    if (config.method === undefined) {
      config.method = 'GET';
    }

    if (!config.url && !config.path) {
      throw new Error("Either url or path must be defined in the config object.");
    }

    // Pretend that we are making requests as Google Chrome on MacOS. 
    // Add a number of headers that Google Chrome typically sends with requests. 
    const finalHeaders: Record<string, string> = {
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': "macOS",
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Dnt': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ...config.headers,
    }


    // Default to application/json to all POST requests that have a body. 
    if (config.method === 'POST' && config.body && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json'
    }

    const finalConfig = {
      method: config.method ?? 'GET',
      redirect: "manual" as const,
      body: config.body,
      headers: finalHeaders
    }

    const url = config.url ?? (this.protocol + '://' + this.hostname + '/' + this.firstPathPart + config.path);

    let response ;

    if (process.env.MOCK_DATA) {
      response = await mockRequest(url, finalConfig)
      console.log('MOCK:', response.status, url)
    }
    else {
      response = await this.fetchWithCookieJar(url, finalConfig)
      // Log each request and its status code.
      console.log(response.status, url)
    }


    // Follow redirects, if necessary.
    if ([301, 302].includes(response.status) && config.followRedirects !== false) {

      let newLocation = response.headers.get('Location');

      if (!newLocation) {
        throw new Error("302 didn't have a location header" + url)
      }

      // If the Location header returned doesn't isn't absolute, make it absolute. 
      newLocation = new URL(newLocation, url).href

      // Following 302 should always be a GET
      return await this.makeRequest({ ...config, url: newLocation, method: 'GET', body: undefined })
    }

    return response;
  }
}

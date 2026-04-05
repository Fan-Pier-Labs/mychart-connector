import { CookieJar } from 'tough-cookie'
import fs from 'fs';
import {mockRequest} from './mock_data/index'
import { RequestConfig } from './types';

/**
 * Options for creating a MyChartRequest.
 * Pass a custom `fetchFn` to override how HTTP requests are made.
 * For example, on iOS, pass raw `fetch` to let the OS handle cookies natively.
 */
export type MyChartRequestOptions = {
  protocol?: string;
  /** Custom fetch function. Defaults to tough-cookie-wrapped fetch for Node/Bun. */
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
};

// Class to keep track of variables used when making requests
// to MyChart's Site.
export class MyChartRequest {

  // Cookie jar to keep track of all the cookies received.
  // On platforms that handle cookies natively (iOS), this jar stays empty
  // and is only used for getCookieInfo() / serialize() compatibility.
  cookieJar: CookieJar;

  // Mockable fetch function. Tests can replace this to intercept requests.
  // Default implementation injects/extracts cookies via the CookieJar.
  // On iOS, this is set to raw fetch (iOS handles cookies natively).
  fetchWithCookieJar: (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

  // The hostname of the MyChart site, eg. mychart.example.org
  hostname: string;

  // Protocol to use for requests. Defaults to 'https'. Set to 'http' for local fake-mychart server.
  protocol: string;

  // the first part of the path. For some instances, it is /MyChart-PRD. For others, it is /MyChart.
  firstPathPart: string = '';

  constructor(hostname: string, options?: string | MyChartRequestOptions) {
    // Support old signature: new MyChartRequest(hostname, protocol?)
    const opts: MyChartRequestOptions = typeof options === 'string'
      ? { protocol: options }
      : (options ?? {});

    this.cookieJar = new CookieJar();

    if (opts.fetchFn) {
      // Custom fetch function provided (e.g. raw fetch on iOS)
      this.fetchWithCookieJar = (url, init) => opts.fetchFn!(String(url), init ?? {});
    } else {
      // Default: tough-cookie-wrapped fetch for Node/Bun
      this.fetchWithCookieJar = (url, init) => this.fetchWithCookies(String(url), init ?? {});
    }

    this.hostname = MyChartRequest.normalizeHostname(hostname);
    this.protocol = opts.protocol ?? 'https';
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
      cookies: this.cookieJar.serializeSync()
    })
  }

  static async unserialize(serializedData: string, options?: MyChartRequestOptions): Promise<MyChartRequest | null> {
    try {
      const data = JSON.parse(serializedData);
      if (data && data.hostname && data.firstPathPart && data.cookies) {
        const request = new MyChartRequest(data.hostname, { ...options, protocol: data.protocol });
        request.firstPathPart = data.firstPathPart;
        if (Object.keys(data.cookies).length > 0) {
          request.cookieJar = CookieJar.deserializeSync(data.cookies);
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
    const serializedJar = this.cookieJar.serializeSync();
    await fs.promises.writeFile(filePath, JSON.stringify(serializedJar, null, 2));
  }

  // Load cookies from a JSON file into the cookie jar.
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
    this.cookieJar = CookieJar.deserializeSync(serializedJar);
  }

  /**
   * Fetch with manual cookie jar integration.
   * Injects cookies from the jar into the request headers, and stores
   * Set-Cookie headers from the response back into the jar.
   *
   * This is the default fetch strategy for Node/Bun environments.
   * On platforms with native cookie handling (iOS), the constructor
   * is given a custom fetchFn that bypasses this method entirely.
   */
  private async fetchWithCookies(url: string, init: RequestInit): Promise<Response> {
    // Get cookies for this URL and inject them
    const cookieString = await this.cookieJar.getCookieString(url);
    const headers: Record<string, string> = {};
    // Copy existing headers
    if (init.headers) {
      const h = init.headers as Record<string, string>;
      for (const key of Object.keys(h)) {
        headers[key] = h[key];
      }
    }
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }

    const response = await fetch(url, { ...init, headers });

    // Extract Set-Cookie headers and store them in the jar.
    // Node's undici exposes getSetCookie(); fall back to get('set-cookie') for other runtimes.
    let setCookies: string[] = [];
    if (typeof (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function') {
      setCookies = (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie();
    } else {
      const raw = response.headers.get('set-cookie');
      if (raw) {
        // Comma-separated cookies: split on ", " followed by a cookie name (token=)
        setCookies = raw.split(/,\s*(?=[A-Za-z0-9_-]+=)/);
      }
    }

    for (const cookieStr of setCookies) {
      try {
        await this.cookieJar.setCookie(cookieStr.trim(), url);
      } catch {
        // Skip invalid cookies
      }
    }

    return response;
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

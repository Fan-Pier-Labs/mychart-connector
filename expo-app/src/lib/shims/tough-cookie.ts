/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Shim for tough-cookie on React Native iOS.
 *
 * iOS's NSURLSession automatically manages cookies via NSHTTPCookieStorage.
 * We don't need tough-cookie — this no-op CookieJar lets MyChartRequest
 * construct normally, but the actual cookie handling is done by iOS natively.
 *
 * The fetchWithCookies method in MyChartRequest will:
 * - getCookieString() → returns "" (iOS injects cookies itself)
 * - setCookie() → no-op (iOS stores cookies itself)
 * - The Cookie header injection is skipped (empty string)
 * - iOS fetch automatically sends/receives cookies
 */
export class CookieJar {
  async getCookieString(_url: string): Promise<string> {
    return "";
  }

  async setCookie(_cookie: string, _url: string): Promise<void> {
    // no-op — iOS handles cookies natively
  }

  serializeSync(): { cookies: never[] } {
    return { cookies: [] };
  }

  static deserializeSync(_data: unknown): CookieJar {
    return new CookieJar();
  }

  async serialize(): Promise<{ cookies: never[] }> {
    return { cookies: [] };
  }

  static async deserialize(_data: unknown): Promise<CookieJar> {
    return new CookieJar();
  }
}

export class Cookie {
  static parse(_str: string): Cookie | undefined {
    return new Cookie();
  }
}

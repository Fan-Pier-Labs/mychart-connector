import { logger } from '../shared/logger';
export const DEFAULT_HEADERS = {
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
}

export async function rawRequest(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    headers: DEFAULT_HEADERS,
    ...options,
  });
}

export async function follow302sAndReturnFinalUrl(url: string): Promise<string> {
  const response = await rawRequest(url, {redirect: 'manual' as const});
  logger.debug(response.status, url);
  if (response.status === 302 || response.status === 301) {
    const newUrl = response.headers.get('location');
    if (!newUrl) {
      throw new Error('No location header in 302 response');
    }
    const newUrlObj = new URL(newUrl, url);
    return follow302sAndReturnFinalUrl(newUrlObj.toString());
  }

  return url;
}


if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  (async () => {
    const url = 'https://mychart.example.org/mychart';
    const finalUrl = await follow302sAndReturnFinalUrl(url);
    logger.debug(finalUrl);
  })();
}
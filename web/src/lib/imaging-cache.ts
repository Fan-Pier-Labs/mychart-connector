import { getSession } from '@/lib/sessions';
import { downloadImagingStudyDirect } from '../../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToJpg } from '../../../scrapers/myChart/clo-to-jpg-converter/clo_to_jpg';

export interface CachedStudy {
  /** Series list with actual downloadable image counts */
  series: Array<{
    seriesUID: string;
    description: string;
    imageCount: number;
  }>;
  /** JPEG buffers keyed by "seriesUID:index" */
  images: Map<string, Buffer>;
  ts: number;
}

// In-memory cache. Entries expire after 10 min.
const studyCache = new Map<string, CachedStudy>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const pendingDownloads = new Map<string, Promise<CachedStudy>>();

function evictStale() {
  const now = Date.now();
  for (const [key, entry] of studyCache) {
    if (now - entry.ts > CACHE_TTL_MS) studyCache.delete(key);
  }
}

function cacheKey(token: string, fdiParam: string) {
  return `${token}:${fdiParam}`;
}

/**
 * Download all images for a study, convert to JPEG, and cache.
 * Returns cached result on subsequent calls within TTL.
 */
export async function getOrDownloadStudy(
  token: string,
  fdiParam: string,
): Promise<CachedStudy> {
  const key = cacheKey(token, fdiParam);

  const cached = studyCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached;
  }

  const pending = pendingDownloads.get(key);
  if (pending) return pending;

  const downloadPromise = (async (): Promise<CachedStudy> => {
    try {
      const mychartRequest = getSession(token);
      if (!mychartRequest) throw new Error('Invalid or expired session');

      const fdiContext = JSON.parse(Buffer.from(fdiParam, 'base64').toString('utf-8'));

      const downloadResult = await downloadImagingStudyDirect(
        mychartRequest,
        fdiContext,
        '',
        '',
        { skipFileWrite: true, maxImages: 50 },
      );

      if (downloadResult.errors.length > 0 && downloadResult.images.length === 0) {
        throw new Error(downloadResult.errors.join('; '));
      }

      // Group images by series, convert to JPEG
      const images = new Map<string, Buffer>();
      const seriesCount = new Map<string, { description: string; count: number }>();

      const candidates = downloadResult.images.filter(
        img => img.pixelData && img.pixelData.length > 10000,
      );

      for (const image of candidates) {
        const existing = seriesCount.get(image.seriesUID);
        const idx = existing ? existing.count : 0;

        try {
          const jpegBuffer = await convertCloToJpg(
            image.pixelData,
            null,
            image.wrapperData,
            100,
          );
          if (Buffer.isBuffer(jpegBuffer)) {
            images.set(`${image.seriesUID}:${idx}`, jpegBuffer);
            seriesCount.set(image.seriesUID, {
              description: image.seriesDescription,
              count: idx + 1,
            });
          }
        } catch {
          // Skip images that fail to convert
        }
      }

      // Build series list from seriesList metadata + actual image counts
      const seriesList = (downloadResult.seriesList ?? []).map(s => ({
        seriesUID: s.seriesUID,
        description: s.description,
        imageCount: seriesCount.get(s.seriesUID)?.count ?? 0,
      }));

      const result: CachedStudy = { series: seriesList, images, ts: Date.now() };
      studyCache.set(key, result);
      evictStale();
      return result;
    } finally {
      pendingDownloads.delete(key);
    }
  })();

  pendingDownloads.set(key, downloadPromise);
  return downloadPromise;
}

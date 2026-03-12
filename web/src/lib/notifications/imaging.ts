import type { MyChartRequest } from '@/lib/mychart/myChartRequest';
import type { ImagingResult } from '@/lib/mychart/imagingResults';
import { downloadImagingStudyDirect } from '../../../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToJpg } from '../../../../clo-to-jpg-converter/clo_to_jpg';

const MAX_IMAGES_PER_EMAIL = 5;

export interface ImageAttachment {
  filename: string;
  content: Buffer;
}

/**
 * Download and convert X-ray images from new imaging results for email attachment.
 * Only processes studies with fdiContext (X-ray CLO format).
 * Caps at MAX_IMAGES_PER_EMAIL to stay within email size limits.
 */
export async function getImagingAttachments(
  mychartRequest: MyChartRequest,
  imagingResults: ImagingResult[]
): Promise<ImageAttachment[]> {
  const attachments: ImageAttachment[] = [];

  for (const imaging of imagingResults) {
    if (attachments.length >= MAX_IMAGES_PER_EMAIL) break;
    if (!imaging.fdiContext) continue;

    try {
      const downloadResult = await downloadImagingStudyDirect(
        mychartRequest,
        imaging.fdiContext,
        imaging.orderName,
        '',
        { skipFileWrite: true }
      );

      for (const image of downloadResult.images) {
        if (attachments.length >= MAX_IMAGES_PER_EMAIL) break;
        if (!image.pixelData) continue;

        try {
          const jpegBuffer = await convertCloToJpg(
            image.pixelData,
            null,
            image.wrapperData
          );

          if (Buffer.isBuffer(jpegBuffer)) {
            const safeName = (image.seriesDescription || imaging.orderName)
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .substring(0, 50);
            attachments.push({
              filename: `${safeName}.jpg`,
              content: jpegBuffer,
            });
          }
        } catch (err) {
          console.warn(`[notifications] CLO→JPG conversion failed for ${imaging.orderName}:`, (err as Error).message);
        }
      }
    } catch (err) {
      console.warn(`[notifications] Imaging download failed for ${imaging.orderName}:`, (err as Error).message);
    }
  }

  return attachments;
}

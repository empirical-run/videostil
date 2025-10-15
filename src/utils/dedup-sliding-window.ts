import type { FrameInfo } from "../types/index.js";
import { DEDUP_CONFIG } from "./config.js";
import { ImageLoader } from "./image-loader.js";
import { compareImageBuffers } from "./image-comparison.js";
import { updateProgressBar, finishProgressBar } from "./progress-bar.js";

export async function deduplicateImagesSlidingWindow(
  images: FrameInfo[],
  threshold: number,
  loader: ImageLoader,
  windowSize: number = DEDUP_CONFIG.SLIDING_WINDOW_SIZE,
  logPrefix: string = "dedup-sliding-window",
): Promise<FrameInfo[]> {
  if (images.length === 0) {
    return [];
  }

  const uniqueImages: FrameInfo[] = [];
  const window: Buffer[] = [];

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i]!;

    try {
      const currentBuffer = await loader.loadBuffer(imgData);

      let isDuplicate = false;

      for (const windowBuffer of window) {
        try {
          const { diffFraction } = await compareImageBuffers(
            currentBuffer,
            windowBuffer,
            0.1,
          );

          if (diffFraction <= threshold) {
            isDuplicate = true;
            break;
          }
        } catch (error) {
          console.error(`[${logPrefix}] Error comparing images:`, error);
        }
      }

      if (!isDuplicate) {
        uniqueImages.push(imgData);

        window.push(currentBuffer);

        if (window.length > windowSize) {
          window.shift();
        }
      }

      updateProgressBar(
        i + 1,
        images.length,
        logPrefix,
        `| Unique: ${uniqueImages.length}`,
      );
    } catch (error) {
      console.error(`\n[${logPrefix}] Error processing image ${i + 1}:`, error);
    }
  }

  finishProgressBar();
  return uniqueImages;
}

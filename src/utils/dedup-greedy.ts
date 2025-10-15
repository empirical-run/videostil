import type { FrameInfo } from "../types/index.js";
import { ImageLoader } from "./image-loader.js";
import { areImagesDuplicate } from "./image-comparison.js";
import { updateProgressBar, finishProgressBar } from "./progress-bar.js";

export async function deduplicateImagesGreedy(
  images: FrameInfo[],
  threshold: number,
  loader: ImageLoader,
  logPrefix: string = "dedup-greedy",
): Promise<FrameInfo[]> {
  const uniqueImages: FrameInfo[] = [];
  let previousImageBuffer: Buffer | null = null;

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i]!;

    try {
      const currentBuffer = await loader.loadBuffer(imgData);
      let isDuplicate = false;

      if (previousImageBuffer) {
        isDuplicate = await areImagesDuplicate(
          currentBuffer,
          previousImageBuffer,
          threshold,
        );
      }

      if (!isDuplicate) {
        uniqueImages.push(imgData);
        previousImageBuffer = currentBuffer;
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

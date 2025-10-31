import type { FrameInfo } from "../types/index.js";
import { ImageLoader } from "./image-loader.js";
import { compareImageBuffers } from "./image-comparison.js";
import { updateProgressBar, finishProgressBar } from "./progress-bar.js";
import { DiffDataCollector } from "./diff-data-collector.js";

export async function deduplicateImagesGreedy(
  images: FrameInfo[],
  threshold: number,
  loader: ImageLoader,
  logPrefix: string = "dedup-greedy",
  diffCollector?: DiffDataCollector,
  fps?: number,
): Promise<FrameInfo[]> {
  const uniqueImages: FrameInfo[] = [];
  let previousImageBuffer: Buffer | null = null;
  // Separate buffer tracking for diff data collection
  // This always updates to ensure consecutive frame comparisons
  let previousBufferForDiff: Buffer | null = null;

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i]!;

    try {
      const currentBuffer = await loader.loadBuffer(imgData);
      let isDuplicate = false;
      let diffFraction = 0;

      // Compare for diff data collection (if collector is provided)
      if (diffCollector && fps !== undefined && previousBufferForDiff) {
        const comparisonResult = await compareImageBuffers(
          previousBufferForDiff,
          currentBuffer,
          0.1,
        );
        diffFraction = comparisonResult.diffFraction;
      }

      // Compare for deduplication logic (uses separate previousImageBuffer)
      if (previousImageBuffer) {
        const comparisonResult = await compareImageBuffers(
          previousImageBuffer,
          currentBuffer,
          0.1,
        );
        isDuplicate = comparisonResult.diffFraction <= threshold;
      }

      // Collect diff data if collector is provided
      if (diffCollector && fps !== undefined) {
        diffCollector.addFrameDiff(imgData.index, diffFraction, fps);
      }

      if (!isDuplicate) {
        uniqueImages.push(imgData);
        previousImageBuffer = currentBuffer;
      }

      // Always update the diff tracking buffer (like the API does)
      if (diffCollector && fps !== undefined) {
        previousBufferForDiff = currentBuffer;
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

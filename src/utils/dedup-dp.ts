import type { FrameInfo } from "../types/index.js";
import { DEDUP_CONFIG } from "./config.js";
import { ImageLoader } from "./image-loader.js";
import { compareImageBuffers } from "./image-comparison.js";
import { updateProgressBar, finishProgressBar } from "./progress-bar.js";

export async function deduplicateImagesDP(
  images: FrameInfo[],
  threshold: number,
  loader: ImageLoader,
  maxLookback: number = DEDUP_CONFIG.DP_MAX_LOOKBACK,
  logPrefix: string = "dedup-dp",
): Promise<FrameInfo[]> {
  if (images.length === 0) {
    return [];
  }

  const processedImages: Array<{
    buffer: Buffer;
    original: FrameInfo;
  }> = [];

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i]!;
    try {
      const buffer = await loader.loadBuffer(imgData);
      processedImages.push({
        buffer,
        original: imgData,
      });

      updateProgressBar(i + 1, images.length, `${logPrefix} Loading`);
    } catch (error) {
      console.error(`\n[${logPrefix}] Error loading image ${i + 1}:`, error);
    }
  }

  finishProgressBar();

  const n = processedImages.length;
  if (n === 0) {
    return [];
  }

  const dp = new Array(n).fill(0);
  const keep = new Array(n).fill(false);

  dp[0] = 1;
  keep[0] = true;

  for (let i = 1; i < n; i++) {
    dp[i] = dp[i - 1];

    let canKeep = true;
    const lookbackLimit = Math.min(maxLookback, i);

    for (let j = i - 1; j >= i - lookbackLimit && j >= 0; j--) {
      if (keep[j]) {
        try {
          const currentImg = processedImages[i];
          const prevImg = processedImages[j];
          if (!currentImg || !prevImg) continue;

          const { diffFraction } = await compareImageBuffers(
            currentImg.buffer,
            prevImg.buffer,
            0.1,
          );

          if (diffFraction <= threshold) {
            canKeep = false;
            break;
          }
        } catch (error) {
          console.error(`[${logPrefix}] Error comparing images:`, error);
        }
      }
    }

    if (canKeep && dp[i - 1] + 1 > dp[i]) {
      dp[i] = dp[i - 1] + 1;
      keep[i] = true;
    }

    const uniqueCount = keep.filter(Boolean).length;
    updateProgressBar(
      i + 1,
      n,
      `${logPrefix} Processing`,
      `| Unique: ${uniqueCount}`,
    );
  }

  finishProgressBar();

  return processedImages.filter((_, i) => keep[i]).map((img) => img.original);
}

import type { FrameInfo, DeduplicationOptions } from "../types/index.js";
import { ALGO_MAP, DEDUP_CONFIG } from "./config.js";
import { deduplicateImagesDP } from "./dedup-dp.js";
import { deduplicateImagesGreedy } from "./dedup-greedy.js";
import { ImageLoader } from "./image-loader.js";
import { deduplicateImagesSlidingWindow } from "./dedup-sliding-window.js";

export async function deduplicateFrames(
  options: DeduplicationOptions,
): Promise<FrameInfo[]> {
  const {
    frames,
    threshold,
    logPrefix = "dedup-image",
    algo = "gd",
    dpMaxLookback = DEDUP_CONFIG.DP_MAX_LOOKBACK,
    slidingWindowSize = DEDUP_CONFIG.SLIDING_WINDOW_SIZE,
    diffCollector,
    fps,
  } = options;

  const loader = new ImageLoader();
  const approach = ALGO_MAP[algo] || DEDUP_CONFIG.DEFAULT_APPROACH;
  console.log(
    `[${logPrefix}] Input: ${frames.length} frames, Threshold: ${threshold}`,
  );

  let uniqueFrames: FrameInfo[] = [];

  try {
    switch (approach) {
      case ALGO_MAP["gd"]:
        uniqueFrames = await deduplicateImagesGreedy(
          frames,
          threshold,
          loader,
          logPrefix,
          diffCollector,
          fps,
        );
        break;
      case ALGO_MAP["dp"]:
        uniqueFrames = await deduplicateImagesDP(
          frames,
          threshold,
          loader,
          dpMaxLookback,
          logPrefix,
        );
        break;
      case ALGO_MAP["sw"]:
        uniqueFrames = await deduplicateImagesSlidingWindow(
          frames,
          threshold,
          loader,
          slidingWindowSize,
          logPrefix,
        );
        break;
      default:
        throw new Error(
          `Unknown approach: ${approach}. Use 'gd', 'dp', or 'sw'`,
        );
    }

    return uniqueFrames;
  } finally {
    loader.clearCache();
  }
}

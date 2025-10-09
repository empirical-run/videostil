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
  } = options;

  const loader = new ImageLoader();
  const approach = ALGO_MAP[algo] || DEDUP_CONFIG.DEFAULT_APPROACH;

  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

  console.log(
    `[${logPrefix}] Starting deduplication with ${approach} approach`,
  );
  console.log(
    `[${logPrefix}] Input: ${frames.length} frames, Threshold: ${threshold}`,
  );

  performance.mark(`${logPrefix}-start`);

  let uniqueFrames: FrameInfo[] = [];

  try {
    switch (approach) {
      case ALGO_MAP["gd"]:
        uniqueFrames = await deduplicateImagesGreedy(
          frames,
          threshold,
          loader,
          logPrefix,
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

    performance.mark(`${logPrefix}-end`);
    performance.measure(
      `${logPrefix}-total`,
      `${logPrefix}-start`,
      `${logPrefix}-end`,
    );

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    const executionTimeMs = endTime - startTime;
    const memoryUsedMB = Math.max(0, endMemory - startMemory);
    const duplicatesRemoved = frames.length - (uniqueFrames?.length ?? 0);

    console.log(`[${logPrefix}] === DEDUPLICATION SUMMARY ===`);
    console.log(`[${logPrefix}] Approach: ${approach}`);
    console.log(
      `[${logPrefix}] Execution time: ${executionTimeMs.toFixed(2)}ms`,
    );
    console.log(`[${logPrefix}] Memory used: ${memoryUsedMB.toFixed(2)}MB`);
    console.log(`[${logPrefix}] Input frames: ${frames.length}`);
    console.log(`[${logPrefix}] Output frames: ${uniqueFrames?.length ?? 0}`);
    console.log(`[${logPrefix}] Duplicates removed: ${duplicatesRemoved}`);
    console.log(`[${logPrefix}] === END SUMMARY ===`);
  }
}

import type { FrameInfo } from "../../types";
import { deduplicateImagesGreedy } from "./dedup-greedy";
import { ALGO_MAP, DEDUP_CONFIG } from "./config";
import { ImageLoader } from "../../utils/image-loader";
import { DeduplicationOptions } from "./types";

export async function deduplicateFrames(
  options: DeduplicationOptions,
): Promise<FrameInfo[]> {
  const {
    frames,
    threshold,
    logPrefix = "dedup-image",
    diffCollector,
    fps,
  } = options;

  const loader = new ImageLoader();
  const approach = DEDUP_CONFIG.DEFAULT_APPROACH;
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

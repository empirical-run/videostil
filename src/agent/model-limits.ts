import fs from "node:fs";
import {
  SupportedChatModels
} from "./types";
import { FrameInfo } from "../types";
import { VIDEO_ANALYSIS } from "./constants";

function isClaudeModel(model: string): boolean {
  return model.includes("claude") || model.includes("sonnet");
}

function isOpenAIModel(model: string): boolean {
  return model.includes("gpt") || model.includes("openai");
}

function getModelLimits(model: string) {
  if (isClaudeModel(model)) {
    return {
      maxImages: VIDEO_ANALYSIS.CLAUDE_MAX_IMAGES_PER_BATCH,
      maxSizeMB: VIDEO_ANALYSIS.CLAUDE_MAX_REQUEST_SIZE_MB,
    };
  }

  if (isOpenAIModel(model)) {
    return {
      maxImages: VIDEO_ANALYSIS.OPENAI_MAX_IMAGES_PER_BATCH,
      maxSizeMB: VIDEO_ANALYSIS.OPENAI_MAX_REQUEST_SIZE_MB,
    };
  }

  return {
    maxImages: 20,
    maxSizeMB: 10,
  };
}

async function calculateActualBatchSize(
  framesInfo: FrameInfo[],
): Promise<number> {
  try {
    const sizes = await Promise.all(
      framesInfo.map(async (frame, index) => {
        const pathToUse = frame.path;

        if (!pathToUse) {
          throw new Error(
            `Frame ${index} has no path: ${JSON.stringify(frame)}`,
          );
        }

        const stats = await fs.promises.stat(pathToUse);
        return stats.size;
      }),
    );

    const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
    // Base64 encoding inflates size by ~33% (4/3 ratio)
    const base64InflatedBytes = totalBytes * (4 / 3);
    const totalMB = base64InflatedBytes / (1024 * 1024);

    return totalMB;
  } catch (error) {
    // Apply same base64 inflation to default calculation
    return (
      framesInfo.length * VIDEO_ANALYSIS.DEFAULT_FRAME_SIZE_MB * (4 / 3)
    );
  }
}

export async function calculateOptimalBatchSize(
  model: SupportedChatModels,
  framesInfo: FrameInfo[],
): Promise<number> {
  if (!framesInfo || framesInfo.length === 0) {
    throw new Error(
      "framePaths are required to calculate the optimal batch size",
    );
  }

  const limits = getModelLimits(model);
  let batchSize = Math.min(limits.maxImages, framesInfo.length);

  while (batchSize > 0) {
    const frameBatch = framesInfo.slice(0, batchSize);
    console.log("Batch size:", frameBatch.length);
    const actualBatchSizeMB = await calculateActualBatchSize(frameBatch);
    console.log("Actual batch size in MB:", actualBatchSizeMB);

    if (actualBatchSizeMB <= limits.maxSizeMB) {
      return batchSize;
    }

    batchSize = Math.floor(
      batchSize * VIDEO_ANALYSIS.BATCH_SIZE_REDUCTION_FACTOR,
    );
    console.log("Reduced batch size:", batchSize);
  }

  return 1;
}

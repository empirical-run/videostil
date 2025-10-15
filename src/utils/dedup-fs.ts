import type { FrameInfo } from "../types/index.js";
import { promises as fs } from "fs";
import path from "path";
import { deduplicateFrames } from "./dedup-core.js";

export async function deduplicateImageFiles({
  imagePaths,
  threshold,
  logPrefix = "dedup-image-fs",
  algo,
  fps,
  frameIndexPadding = 6,
  diffCollector,
}: {
  imagePaths: string[];
  threshold: number;
  logPrefix?: string;
  algo?: "gd" | "dp" | "sw";
  fps?: number;
  frameIndexPadding?: number;
  diffCollector?: any;
}): Promise<FrameInfo[]> {
  console.log(`[${logPrefix}] Processing ${imagePaths.length} images`);

  const frames: FrameInfo[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    if (!imagePath) {
      console.error(
        `[${logPrefix}] Error: imagePath is undefined at index ${i}`,
      );
      continue;
    }

    try {
      const filename = path.basename(imagePath);
      const frameNumberMatch = filename.match(/frame_(\d+)\.png$/);
      const frameIndex = frameNumberMatch
        ? parseInt(frameNumberMatch[1]!, 10)
        : i;

      const normalizedIndex = frameIndex
        .toString()
        .padStart(frameIndexPadding, "0");
      const normalizedFileName = `frame_${normalizedIndex}.png`;

      let timestamp = "";
      if (fps) {
        const timeInSeconds = frameIndex / fps;
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        timestamp = `${minutes}m${seconds.toString().padStart(2, "0")}s`;
      }

      frames.push({
        index: frameIndex,
        path: imagePath,
        fileName: normalizedFileName,
        url: "",
        base64: "",
        timestamp,
      });
    } catch (error) {
      console.error(
        `[${logPrefix}] Error processing image path ${imagePath}:`,
        error,
      );
      continue;
    }
  }

  const uniqueFrames = await deduplicateFrames({
    frames,
    threshold,
    logPrefix,
    algo,
    diffCollector,
    fps,
  });

  console.log(
    `[${logPrefix}] Filtered to ${uniqueFrames.length} unique images from ${imagePaths.length} total images`,
  );

  // Load base64 data for unique frames
  for (const frame of uniqueFrames) {
    try {
      const buffer = await fs.readFile(frame.path);
      frame.base64 = buffer.toString("base64");
    } catch (error) {
      console.error(`[${logPrefix}] Error reading image ${frame.path}:`, error);
    }
  }

  return uniqueFrames;
}

import crypto from "node:crypto";
import fs from "node:fs";
import { finishProgressBar, updateProgressBar } from "./progress-bar";
import path from "node:path";
import { FrameInfo } from "../types";

export function formatSecondsToTimestamp(seconds: number | undefined): string {
  if (seconds === undefined) return "N/A";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimestampToSeconds(timestamp: string): number {
  try {
    const parts = timestamp.split(":").map((value) => parseFloat(value));

    if (parts.length === 1) {
      // Just seconds: "30" or "30.5"
      return parts[0] ?? 0;
    } else if (parts.length === 2) {
      // MM:SS format: "1:30" or "1:30.5"
      const [minutes, seconds] = parts;
      return (minutes ?? 0) * 60 + (seconds ?? 0);
    } else if (parts.length === 3) {
      // HH:MM:SS format: "1:30:45" or "1:30:45.5"
      const [hours, minutes, seconds] = parts;
      return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
    }

    throw new Error(
      `Invalid timestamp format: ${timestamp}. Expected format: SS, MM:SS, or HH:MM:SS`,
    );
  } catch (error) {
    throw new Error(
      `Invalid timestamp format: ${timestamp}. Expected format: SS, MM:SS, or HH:MM:SS`,
    );
  }
}

export function createHashBasedOnParams(
  mainStringToHash: string,
  additionalParams: Record<string, any>,
): string {
  const sortedParams = Object.keys(additionalParams)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = additionalParams[key as keyof typeof additionalParams];
        return acc;
      },
      {} as Record<string, any>,
    );
  const json = JSON.stringify({
    mainStringTohash: mainStringToHash,
    ...sortedParams,
  });
  return crypto
    .createHash("sha256")
    .update(json)
    .digest("hex")
    .substring(0, 16);
}

export interface VideoAnalysisSection {
  key_frame: string;
  description: string;
}

export function parseXmlSummaryToJson(
  xmlContent: string,
): VideoAnalysisSection[] {
  const sections: VideoAnalysisSection[] = [];

  try {
    // Find the summary block first to limit parsing scope
    const summaryMatch = xmlContent.match(/<summary>([\s\S]*?)<\/summary>/);
    if (!summaryMatch) {
      return sections;
    }

    const summaryContent = summaryMatch[1];
    if (!summaryContent) {
      return sections;
    }

    // Extract all section blocks using matchAll to avoid infinite loop
    const sectionMatches = Array.from(
      summaryContent.matchAll(/<section>([\s\S]*?)<\/section>/g) || [],
    );

    for (const sectionMatch of sectionMatches) {
      const sectionContent = sectionMatch?.[1];
      if (!sectionContent) continue;

      const keyFrameMatch = sectionContent.match(
        /<key_frame>(.*?)<\/key_frame>/,
      );
      const descriptionMatch = sectionContent.match(
        /<description>(.*?)<\/description>/,
      );

      if (keyFrameMatch?.[1] && descriptionMatch?.[1]) {
        sections.push({
          key_frame: keyFrameMatch[1].trim(),
          description: descriptionMatch[1].trim(),
        });
      }
    }
  } catch (error) {
    // Return empty array on error
  }

  return sections;
}

export async function downloadOrCopyVideo(
  videoUrl: string,
  destination: string,
): Promise<void> {
  // Check if file already exists
  try {
    await fs.promises.access(destination);
    console.log(`Video already exists at ${destination}, skipping download`);
    return;
  } catch {
    // File doesn't exist, proceed with download/copy
  }

  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    // Download from URL with progress bar
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let downloadedSize = 0;
    const startTime = Date.now();
    const totalSizeMB = totalSize / (1024 * 1024);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      downloadedSize += value.length;

      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speed = elapsedSeconds > 0 ? downloadedSize / elapsedSeconds : 0;
      const speedMBps = (speed / 1024 / 1024).toFixed(1);
      const downloadedMB = downloadedSize / (1024 * 1024);

      if (totalSize > 0) {
        updateProgressBar(
          Math.ceil(downloadedMB * 100),
          Math.ceil(totalSizeMB * 100),
          "Download",
          `${downloadedMB.toFixed(1)}/${totalSizeMB.toFixed(1)} MB @ ${speedMBps} MB/s`,
        );
      } else {
        process.stdout.write(
          `\rDownloaded: ${downloadedMB.toFixed(1)} MB @ ${speedMBps} MB/s`,
        );
      }
    }

    finishProgressBar();

    const buffer = new Uint8Array(downloadedSize);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    await fs.promises.writeFile(destination, buffer);
    console.log(`Video downloaded to ${destination}`);
  } else {
    // Copy local file
    console.log(`Copying video from ${videoUrl}...`);
    await fs.promises.copyFile(videoUrl, destination);
    console.log(`Video copied to ${destination}`);
  }
}

async function ensureEmptyDir(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function copyFramesToDirectory(
  frames: FrameInfo[],
  workingDir: string,
): Promise<string> {
  await ensureEmptyDir(workingDir);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame) continue;
    const originalPath = frame.path;

    const originalBasename = path.basename(originalPath);
    const frameNumberMatch = originalBasename.match(/frame_(\d+)\.png$/);
    const frameNumber = frameNumberMatch
      ? frameNumberMatch[1]
      : i.toString().padStart(6, "0");

    const uniqueFramePath = path.join(workingDir, `frame_${frameNumber}.png`);

    try {
      await fs.promises.copyFile(originalPath, uniqueFramePath);
    } catch (error) {
      console.warn(
        `Failed to copy frame ${originalPath} to ${uniqueFramePath}:`,
        error,
      );
    }
  }

  console.log(`Stored ${frames.length} unique frames in: ${workingDir}`);
  return workingDir;
}

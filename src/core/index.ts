import path from "node:path";
import {promises as fs} from "node:fs";
import crypto from "node:crypto";
import { ExtractOptions, ExtractResult } from "./ffmpeg/types";
import { copyFramesToDirectory, downloadOrCopyVideo } from "../utils";
import { checkFFmpegAvailability, extractFrames, getVideoDuration } from "./ffmpeg";
import { DiffDataCollector } from "../utils/diff-data-collector";
import { deduplicateImageFiles } from "./dedup/dedup-fs";

const MAX_VIDEO_DURATION_SECONDS = 180 * 60; // 180 mins (3 hrs)
const FRAME_INDEX_PADDING = 6;

export async function extractUniqueFrames(
  options: ExtractOptions,
): Promise<ExtractResult> {
  checkFFmpegAvailability();
  const { videoUrl, fps, threshold, startTime, duration, workingDir } = options;

  if (!workingDir) {
    throw new Error("Working directory is required");
  }

  const urlHash = crypto
    .createHash("sha256")
    .update(videoUrl)
    .digest("hex")
    .substring(0, 16);

  await fs.mkdir(workingDir, { recursive: true });

  const videoPath = path.join(workingDir, `video_${urlHash}.webm`);

  console.log("Working directory:", workingDir);

  try {
    // Download or copy video
    await downloadOrCopyVideo(videoUrl, videoPath);

    const videoDuration = await getVideoDuration(videoPath);
    console.log(
      `Video duration: ${Math.round(videoDuration)} seconds (raw: ${videoDuration})`,
    );

    if (videoDuration > MAX_VIDEO_DURATION_SECONDS) {
      throw new Error(
        `Video duration (${Math.round(videoDuration)}s) exceeds maximum allowed duration (${MAX_VIDEO_DURATION_SECONDS}s)`,
      );
    }

    let effectiveStartTime = 0;
    let effectiveDuration = videoDuration;

    if (startTime !== undefined) {
      if (startTime < 0) {
        throw new Error(`Start time cannot be negative: ${startTime}`);
      }
      if (startTime >= videoDuration) {
        throw new Error(
          `Start time (${startTime}s) exceeds video duration (${Math.round(videoDuration)}s)`,
        );
      }
      effectiveStartTime = startTime;
      effectiveDuration = videoDuration - startTime;
    }

    if (duration !== undefined) {
      if (duration <= 0) {
        throw new Error(`Duration must be positive: ${duration}`);
      }
      const maxAllowedDuration = videoDuration - effectiveStartTime;
      if (duration > maxAllowedDuration) {
        console.warn(
          `Requested duration (${duration}s) exceeds available time (${maxAllowedDuration}s), truncating to fit`,
        );
        effectiveDuration = maxAllowedDuration;
      } else {
        effectiveDuration = duration;
      }
    }

    console.log(
      `Effective extraction range: ${effectiveStartTime}s to ${effectiveStartTime + effectiveDuration}s`,
    );

    // Extract frames
    const framesDir = path.join(workingDir, "frames");
    try {
      await fs.rm(framesDir, { recursive: true, force: true });
      console.log(`Cleaned frames directory: ${framesDir}`);
    } catch (error) {
      console.log(
        `Note: Could not clean frames directory (may not exist yet): ${framesDir}`,
      );
    }
    await fs.mkdir(framesDir, { recursive: true });
    const allFramePaths = await extractFrames({
      videoPath,
      outputDir: framesDir,
      fps,
      startTime: effectiveStartTime,
      duration: effectiveDuration,
    });

    const allFramesCount = allFramePaths.length;

    if (allFramesCount === 0) {
      throw new Error("No frames were extracted from the video");
    }

    // Create collector for all frames diff data
    const allFramesCollector = new DiffDataCollector();

    // Deduplicate frames
    const uniqueFrames = await deduplicateImageFiles({
      imagePaths: allFramePaths,
      threshold,
      logPrefix: "ffmpeg-frame-dedup",
      fps,
      frameIndexPadding: FRAME_INDEX_PADDING,
      diffCollector: allFramesCollector,
    });

    console.log(
      `Filtered to ${uniqueFrames.length} unique frames from ${allFramesCount} total frames`,
    );

    if (uniqueFrames.length === 0) {
      throw new Error("No unique frames after deduplication");
    }
    const uniqueFramesDir = path.join(workingDir, "unique_frames");
    await copyFramesToDirectory(uniqueFrames, uniqueFramesDir);

    // Extract unique frames diff data from the all frames data
    console.log("Extracting diff data for unique frames...");
    const uniqueFrameIndices = new Set(uniqueFrames.map((f) => f.index));
    const { allFrames, uniqueFrames: uniqueFramesGraphData } =
      allFramesCollector.getFilteredGraphData(uniqueFrameIndices);

    // Generate and save file with diff data
    const diffData = {
      allFrames,
      uniqueFrames: uniqueFramesGraphData,
      computedAt: new Date().toISOString(),
    };

    const diffFilePath = path.join(workingDir, "frame-diff-data.json");
    await fs.writeFile(diffFilePath, JSON.stringify(diffData, null, 2), "utf8");
    console.log(`Frame diff data saved to: ${diffFilePath}`);

    // Save analysis metadata
    const analysisData = {
      unique_frames_count: uniqueFrames.length,
      video_url: videoUrl,
      analysis_id: urlHash,
      params: {
        fps,
        threshold,
        startTime: effectiveStartTime,
        duration: effectiveDuration,
      },
      unique_frames: uniqueFrames,
      analysis: `Video analysis complete. Extracted ${uniqueFrames.length} unique frames from ${allFramesCount} total frames.`,
      videoDurationSeconds: videoDuration,
    };

    const analysisFilePath = path.join(workingDir, "analysis-result.json");
    await fs.writeFile(
      analysisFilePath,
      JSON.stringify(analysisData, null, 2),
      "utf8",
    );
    console.log(`Analysis metadata saved to: ${analysisFilePath}`);

    return {
      totalFramesCount: allFramesCount,
      uniqueFrames,
      videoDurationSeconds: videoDuration,
      uniqueFramesDir,
    };
  } catch (error) {
    throw new Error(
      `Frame extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

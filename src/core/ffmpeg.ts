import crypto from "node:crypto";
import { exec, execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import type {
  FrameInfo,
  ExtractOptions,
  ExtractResult,
} from "../types/index.js";
import { deduplicateImageFiles } from "../utils/dedup-fs.js";
import { updateProgressBar, finishProgressBar } from "../utils/progress-bar.js";
import { DiffDataCollector } from "../utils/diff-data-collector.js";

const execAsync = promisify(exec);

const FRAME_DIMENSION = "1280:720";
const FRAME_INDEX_PADDING = 6;
const MAX_VIDEO_DURATION_SECONDS = 15 * 60; // 15 minutes

export class FFmpegClient {
  constructor() {
    this.checkFFmpegAvailability();
  }

  private checkFFmpegAvailability(): void {
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
      execSync("ffprobe -version", { stdio: "ignore" });
    } catch (error) {
      const installInstructions = this.getFFmpegInstallInstructions();
      throw new Error(
        `ffmpeg and ffprobe are required but not found.\n\n${installInstructions}`,
      );
    }
  }

  private getFFmpegInstallInstructions(): string {
    const platform = process.platform;
    let instructions = "Please install ffmpeg:\n\n";

    switch (platform) {
      case "darwin": // macOS
        instructions += "  macOS:\n";
        instructions += "    brew install ffmpeg\n";
        break;
      case "linux":
        instructions += "  Linux:\n";
        instructions += "    Ubuntu/Debian: sudo apt-get install ffmpeg\n";
        instructions += "    Fedora/RHEL:   sudo dnf install ffmpeg\n";
        instructions += "    Arch:          sudo pacman -S ffmpeg\n";
        break;
      case "win32": // Windows
        instructions += "  Windows:\n";
        instructions += "    choco install ffmpeg\n";
        instructions += "    or download from: https://ffmpeg.org/download.html\n";
        break;
      default:
        instructions += "  Visit: https://ffmpeg.org/download.html\n";
    }

    instructions += "\nAfter installation, verify with: ffmpeg -version";
    return instructions;
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;

    try {
      const { stdout } = await execAsync(command);
      const duration = parseFloat(stdout.trim());

      if (isNaN(duration)) {
        throw new Error("Could not determine video duration");
      }

      return duration;
    } catch (error) {
      throw new Error(`Failed to get video duration: ${error}`);
    }
  }

  private async ensureEmptyDir(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    await fs.mkdir(dir, { recursive: true });
  }

  private async runFFmpegCommand({
    inputPath,
    args,
    outputPath,
  }: {
    inputPath: string;
    args: string[];
    outputPath?: string;
  }): Promise<void> {
    const quotedInput = `"${inputPath}"`;
    const output = outputPath ? ` "${outputPath}"` : "";
    const cmd = `ffmpeg -y -nostdin -i ${quotedInput} ${args.join(" ")}${output}`;

    try {
      await execAsync(cmd);
    } catch (error) {
      throw new Error(`ffmpeg command failed: ${cmd} => ${String(error)}`);
    }
  }

  private async extractFrames({
    videoPath,
    outputDir,
    fps,
    startTime = 0,
    duration,
  }: {
    videoPath: string;
    outputDir: string;
    fps: number;
    startTime?: number;
    duration?: number;
  }): Promise<string[]> {
    await fs.mkdir(outputDir, { recursive: true });

    console.log(
      `Extracting frames at ${fps} fps from video${duration ? ` (${duration}s duration)` : ""} starting at ${startTime}s`,
    );

    const outputPattern = path.join(outputDir, "frame_%06d.png");
    const args = [];

    // Add start time if specified
    if (startTime > 0) {
      args.push("-ss", startTime.toString());
    }

    // Add duration if specified
    if (duration) {
      args.push("-t", duration.toString());
    }

    // Video filter for fps, scaling, and padding
    const vf = `fps=${fps},scale=${FRAME_DIMENSION}:force_original_aspect_ratio=decrease,pad=${FRAME_DIMENSION}:(ow-iw)/2:(oh-ih)/2`;
    args.push("-vf", `"${vf}"`, "-q:v", "2", "-y");

    try {
      await this.runFFmpegCommand({
        inputPath: videoPath,
        args: args,
        outputPath: outputPattern,
      });

      const files = await fs.readdir(outputDir);
      const frameFiles = files
        .filter(
          (f): f is string => f.startsWith("frame_") && f.endsWith(".png"),
        )
        .sort();

      // Rename frames with absolute frame numbers based on video timestamp
      const framePaths: string[] = [];
      for (let i = 0; i < frameFiles.length; i++) {
        const originalPath = path.join(outputDir, frameFiles[i]!);
        const frameNumber = Math.floor(startTime * fps) + i;
        const newFileName = `frame_${frameNumber.toString().padStart(6, "0")}.png`;
        const newPath = path.join(outputDir, newFileName);

        await fs.rename(originalPath, newPath);
        framePaths.push(newPath);
      }

      console.log(`Successfully extracted ${framePaths.length} frames`);
      return framePaths;
    } catch (error) {
      throw new Error(`Failed to extract frames: ${error}`);
    }
  }

  private async storeUniqueFrames(
    uniqueFrames: FrameInfo[],
    workingDir: string,
  ): Promise<string> {
    const uniqueFramesDir = path.join(workingDir, "unique_frames");

    // Ensure directory exists and is empty
    await this.ensureEmptyDir(uniqueFramesDir);

    for (let i = 0; i < uniqueFrames.length; i++) {
      const frame = uniqueFrames[i];
      if (!frame) continue;
      const originalPath = frame.path;

      const originalBasename = path.basename(originalPath);
      const frameNumberMatch = originalBasename.match(/frame_(\d+)\.png$/);
      const frameNumber = frameNumberMatch
        ? frameNumberMatch[1]
        : i.toString().padStart(6, "0");

      const uniqueFramePath = path.join(
        uniqueFramesDir,
        `frame_${frameNumber}.png`,
      );

      try {
        await fs.copyFile(originalPath, uniqueFramePath);
      } catch (error) {
        console.warn(
          `Failed to copy frame ${originalPath} to ${uniqueFramePath}:`,
          error,
        );
      }
    }

    console.log(
      `Stored ${uniqueFrames.length} unique frames in: ${uniqueFramesDir}`,
    );
    return uniqueFramesDir;
  }

  /**
   * Extract unique frames from a video
   */
  async extractUniqueFrames(options: ExtractOptions): Promise<ExtractResult> {
    const {
      videoUrl,
      fps = 25,
      threshold = 0.001,
      startTime,
      duration,
      algo = "gd",
      workingDir,
    } = options;

    // Display package identification banner
    console.log("");
    console.log(
      "╔═════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                                                                 ║",
    );
    console.log(
      "║   🎬 videostil - Bringing Video Understanding to Every LLM      ║",
    );
    console.log(
      "║   Made with ❤️  by Empirical Team                                ║",
    );
    console.log(
      "║                                                                 ║",
    );
    console.log(
      "╚═════════════════════════════════════════════════════════════════╝",
    );
    console.log("");

    // Create working directory in ~/.videostil/
    const urlHash = crypto
      .createHash("sha256")
      .update(videoUrl)
      .digest("hex")
      .substring(0, 16);

    const homeDir =
      process.env.HOME || process.env.USERPROFILE || process.cwd();
    const videostilRoot = path.join(homeDir, ".videostil");

    const absoluteWorkingDir = workingDir || path.join(videostilRoot, urlHash);
    await fs.mkdir(absoluteWorkingDir, { recursive: true });

    const videoPath = path.join(absoluteWorkingDir, `video_${urlHash}.webm`);

    console.log("Working directory:", absoluteWorkingDir);

    try {
      // Download or copy video
      await this.downloadOrCopyVideo(videoUrl, videoPath);

      const videoDuration = await this.getVideoDuration(videoPath);
      console.log(`Video duration: ${Math.round(videoDuration)} seconds`);

      if (videoDuration > MAX_VIDEO_DURATION_SECONDS) {
        throw new Error(
          `Video duration (${Math.round(videoDuration)}s) exceeds maximum allowed duration (${MAX_VIDEO_DURATION_SECONDS}s)`,
        );
      }

      // Validate time parameters
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
      const framesDir = path.join(absoluteWorkingDir, "frames");
      const allFramePaths = await this.extractFrames({
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
        algo,
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

      const uniqueFramesDir = await this.storeUniqueFrames(
        uniqueFrames,
        absoluteWorkingDir,
      );

      // Extract unique frames diff data from the all frames data
      console.log("Extracting diff data for unique frames...");
      const uniqueFrameIndices = new Set(uniqueFrames.map((f) => f.index));
      const { allFrames, uniqueFrames: uniqueFramesGraphData } =
        allFramesCollector.getFilteredGraphData(uniqueFrameIndices);

      // Generate and save cache file with diff data
      const cacheData = {
        allFrames,
        uniqueFrames: uniqueFramesGraphData,
        computedAt: new Date().toISOString(),
      };

      const cacheFilePath = path.join(
        absoluteWorkingDir,
        "frame-diff-cache.json",
      );
      await fs.writeFile(
        cacheFilePath,
        JSON.stringify(cacheData, null, 2),
        "utf8",
      );
      console.log(`Frame diff cache saved to: ${cacheFilePath}`);

      // Save analysis metadata
      const analysisData = {
        unique_frames_count: uniqueFrames.length,
        video_url: videoUrl,
        analysis_id: urlHash,
        params: {
          fps,
          threshold,
          algo,
          startTime: effectiveStartTime,
          duration: effectiveDuration,
        },
        unique_frames: uniqueFrames,
        analysis: `Video analysis complete. Extracted ${uniqueFrames.length} unique frames from ${allFramesCount} total frames.`,
        videoDurationSeconds: videoDuration,
      };

      const analysisFilePath = path.join(
        absoluteWorkingDir,
        "analysis-result.json",
      );
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

  private async downloadOrCopyVideo(
    videoUrl: string,
    destination: string,
  ): Promise<void> {
    // Check if file already exists
    try {
      await fs.access(destination);
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
      await fs.writeFile(destination, buffer);
      console.log(`Video downloaded to ${destination}`);
    } else {
      // Copy local file
      console.log(`Copying video from ${videoUrl}...`);
      await fs.copyFile(videoUrl, destination);
      console.log(`Video copied to ${destination}`);
    }
  }
}

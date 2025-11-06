import { exec, execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const FRAME_DIMENSION = "1280:720";

function getFFmpegInstallInstructions(): string {
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
      instructions +=
        "    or download from: https://ffmpeg.org/download.html\n";
      break;
    default:
      instructions += "  Visit: https://ffmpeg.org/download.html\n";
  }

  instructions += "\nAfter installation, verify with: ffmpeg -version";
  return instructions;
}

export function checkFFmpegAvailability(): void {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    execSync("ffprobe -version", { stdio: "ignore" });
  } catch (error) {
    const installInstructions = getFFmpegInstallInstructions();
    throw new Error(
      `ffmpeg is required but not found.\n\n${installInstructions}`,
    );
  }
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;

  try {
    const { stdout } = await execAsync(command);
    const duration = parseFloat(stdout.trim());

    if (isNaN(duration)) {
      throw new Error(
        `Could not determine video duration. ffprobe output was: "${stdout.trim()}"`,
      );
    }

    return duration;
  } catch (error) {
    throw new Error(`Failed to get video duration: ${error}`);
  }
}

async function runFFmpegCommand({
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

export async function extractFrames({
  videoPath,
  outputDir,
  fps,
  startTime,
  duration,
}: {
  videoPath: string;
  outputDir: string;
  fps: number;
  startTime: number;
  duration: number;
}): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });

  console.log(
    `Extracting frames at ${fps} fps from video${duration ? ` (${duration}s duration)` : ""} starting at ${startTime}s`,
  );

  const outputPattern = path.join(outputDir, "frame_%d.png");
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
    await runFFmpegCommand({
      inputPath: videoPath,
      args: args,
      outputPath: outputPattern,
    });

    const files = await fs.readdir(outputDir);
    const frameFiles = files
      .filter((f): f is string => f.startsWith("frame_") && f.endsWith(".png"))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/frame_(\d+)\.png$/)?.[1] || "0", 10);
        const bNum = parseInt(b.match(/frame_(\d+)\.png$/)?.[1] || "0", 10);
        return aNum - bNum;
      });

    const startFrameNumber = Math.floor(startTime * fps);
    const framePaths: string[] = new Array(frameFiles.length);

    for (let i = 0; i < frameFiles.length; i++) {
      const originalPath = path.join(outputDir, frameFiles[i]!);
      const frameNumber = startFrameNumber + i;
      const paddedPath = path.join(
        outputDir,
        `frame_${frameNumber.toString().padStart(6, "0")}.png`,
      );
      await fs.rename(originalPath, paddedPath);
      framePaths[i] = paddedPath;
    }

    console.log(`Successfully extracted ${framePaths.length} frames`);
    return framePaths;
  } catch (error) {
    throw new Error(`Failed to extract frames: ${error}`);
  }
}

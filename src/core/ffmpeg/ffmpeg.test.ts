import * as fs from "fs";
import path from "path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { formatTimestampToSeconds } from "../../utils";
import { extractUniqueFrames } from "../index";

describe("FFmpegClient", () => {
  const videoUrl =
    "https://assets-test.empirical.run/test-data/settings-Settings-Page-syn-2515f-nfig-and-verify-persistence-chromium-video.webm";
  const outputDir = `ffmpeg-test-${Date.now()}`;

  beforeAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    const testDirs = [
      outputDir,
      `${outputDir}-timed`,
      `${outputDir}-edge`,
      `${outputDir}-short`,
    ];

    testDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        console.log(`Cleaning up directory: ${dir}`);
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Directory ${dir} removed successfully`);
      }
    });
  });

  it(
    "should download video, extract and deduplicate frames",
    { timeout: 120000 },
    async () => {
      const startTime = formatTimestampToSeconds("00:00:00");
      const result = await extractUniqueFrames({
        videoUrl,
        fps: 30,
        startTime,
        threshold: 0.1,
        workingDir: outputDir,
      });

      // Basic assertions on the result structure
      expect(result.totalFramesCount).toBeGreaterThan(0);
      expect(result.uniqueFrames.length).toBeGreaterThan(0);
      expect(result.uniqueFrames.length).toBeLessThanOrEqual(
        result.totalFramesCount,
      );
      expect(result.videoDurationSeconds).toBeGreaterThan(0);
      expect(result.uniqueFramesDir).toBeTruthy();

      // Verify working directory exists
      const workingDirPath = path.isAbsolute(outputDir)
        ? outputDir
        : path.join(process.cwd(), outputDir);
      expect(fs.existsSync(workingDirPath)).toBeTruthy();

      // Verify unique frames directory exists
      expect(fs.existsSync(result.uniqueFramesDir)).toBeTruthy();

      // Verify frame files exist and have expected properties
      result.uniqueFrames.forEach((frame) => {
        expect(typeof frame.index).toBe("number");
        expect(frame.index).toBeGreaterThanOrEqual(0);
        expect(typeof frame.path).toBe("string");
        expect(fs.existsSync(frame.path)).toBeTruthy();
        expect(typeof frame.timestamp).toBe("number");

        // Verify it's a PNG file
        const filename = path.basename(frame.path);
        expect(filename).toMatch(/^frame_\d{6}\.png$/);
      });
    },
  );

  it(
    "should extract frames with time range (startTime and duration)",
    { timeout: 120000 },
    async () => {
      const outputDirTimed = `${outputDir}-timed`;
      const startTime = formatTimestampToSeconds("00:00:05");

      // Extract from 5 seconds for 10 seconds duration (5s to 15s)
      const result = await extractUniqueFrames({
        videoUrl,
        fps: 15,
        threshold: 0.001,
        startTime,
        duration: 10,
        workingDir: outputDirTimed,
      });

      // Should have fewer frames than full video since we're extracting a subset
      expect(result.totalFramesCount).toBeLessThanOrEqual(150); // 10s * 15fps
      expect(result.uniqueFrames.length).toBeGreaterThan(0);

      result.uniqueFrames.forEach((frame) => {
        expect(frame.index).toBeGreaterThanOrEqual(0);
        expect(fs.existsSync(frame.path)).toBeTruthy();
        const filename = path.basename(frame.path);
        expect(filename).toMatch(/^frame_\d{6}\.png$/);
      });
    },
  );

  it(
    "should handle edge cases with time parameters",
    { timeout: 120000 },
    async () => {
      const outputDirEdge = `${outputDir}-edge`;

      // Test with startTime beyond video duration - should throw error
      await expect(
        extractUniqueFrames({
          videoUrl,
          fps: 15,
          threshold: 0.001,
          startTime: 100, // Video is ~26 seconds, so this should fail
          duration: 10,
          workingDir: outputDirEdge,
        }),
      ).rejects.toThrow();

      // Test with zero duration - should throw error
      await expect(
        extractUniqueFrames({
          videoUrl,
          fps: 15,
          threshold: 0.001,
          startTime: 0,
          duration: 0,
          workingDir: outputDirEdge,
        }),
      ).rejects.toThrow();
    },
  );

  it(
    "should work with different deduplication algorithms",
    { timeout: 120000 },
    async () => {
      const outputDirShort = `${outputDir}-short`;

      const result = await extractUniqueFrames({
        videoUrl,
        fps: 10,
        threshold: 0.05,
        startTime: 0,
        duration: 5,
        workingDir: outputDirShort,
      });

      expect(result.uniqueFrames.length).toBeGreaterThan(0);
      expect(result.totalFramesCount).toBeLessThanOrEqual(50); // 5s * 10fps
    },
  );

  it("should create analysis metadata file", { timeout: 120000 }, async () => {
    const result = await extractUniqueFrames({
      videoUrl,
      fps: 10,
      threshold: 0.1,
      startTime: 0,
      duration: 3,
      workingDir: outputDir,
    });

    const workingDirPath = path.isAbsolute(outputDir)
      ? outputDir
      : path.join(process.cwd(), outputDir);

    const analysisFilePath = path.join(workingDirPath, "analysis-result.json");
    expect(fs.existsSync(analysisFilePath)).toBeTruthy();

    const analysisContent = fs.readFileSync(analysisFilePath, "utf8");
    const analysisData = JSON.parse(analysisContent);

    expect(analysisData.video_url).toBe(videoUrl);
    expect(analysisData.unique_frames_count).toBe(result.uniqueFrames.length);
    expect(analysisData.params.fps).toBe(10);
    expect(analysisData.params.threshold).toBe(0.1);
  });
});

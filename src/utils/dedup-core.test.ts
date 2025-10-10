import * as fs from "fs";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FrameInfo } from "../types/index.js";
import { deduplicateFrames } from "./dedup-core";

describe("dedup-core", () => {
  const testDir = path.join(process.cwd(), `test-dedup-${Date.now()}`);

  beforeEach(async () => {
    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  async function createTestImage(
    filename: string,
    color: "red" | "blue" | "green",
  ): Promise<string> {
    const imagePath = path.join(testDir, filename);

    // Base64 encoded 1x1 pixel PNGs of different colors
    const colors = {
      red: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      blue: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA3TyLVQAAAABJRU5ErkJggg==",
      green:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const buffer = Buffer.from(colors[color], "base64");
    await fs.promises.writeFile(imagePath, buffer);

    return imagePath;
  }

  describe("deduplicateFrames with greedy algorithm", () => {
    it("should keep all frames when they are all different (low threshold)", async () => {
      const redPath = await createTestImage("frame1.png", "red");
      const bluePath = await createTestImage("frame2.png", "blue");
      const greenPath = await createTestImage("frame3.png", "green");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: "0s" },
        { path: bluePath, index: 1, timestamp: "1s" },
        { path: greenPath, index: 2, timestamp: "2s" },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001, // Low threshold means stricter duplicate detection
        algo: "gd",
      });

      expect(result.length).toBe(3); // All frames should be kept
    });

    it("should remove duplicate frames when they are the same", async () => {
      const redPath1 = await createTestImage("frame1.png", "red");
      const redPath2 = await createTestImage("frame2.png", "red");
      const redPath3 = await createTestImage("frame3.png", "red");

      const frames: FrameInfo[] = [
        { path: redPath1, index: 0, timestamp: "0s" },
        { path: redPath2, index: 1, timestamp: "1s" },
        { path: redPath3, index: 2, timestamp: "2s" },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
        algo: "gd",
      });

      expect(result.length).toBe(1); // Only the first frame should be kept
      expect(result[0]?.index).toBe(0);
    });

    it("should handle high threshold by treating different images as duplicates", async () => {
      const redPath = await createTestImage("frame1.png", "red");
      const bluePath = await createTestImage("frame2.png", "blue");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: "0s" },
        { path: bluePath, index: 1, timestamp: "1s" },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 1.0, // High threshold means everything is a duplicate
        algo: "gd",
      });

      expect(result.length).toBe(1); // Only first frame kept
    });
  });

  describe("deduplicateFrames with different algorithms", () => {
    it("should work with dynamic programming algorithm", async () => {
      const redPath = await createTestImage("frame1.png", "red");
      const bluePath = await createTestImage("frame2.png", "blue");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: "0s" },
        { path: bluePath, index: 1, timestamp: "1s" },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
        algo: "dp",
        dpMaxLookback: 5,
      });

      expect(result.length).toBe(2);
    });

    it("should work with sliding window algorithm", async () => {
      const redPath = await createTestImage("frame1.png", "red");
      const bluePath = await createTestImage("frame2.png", "blue");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: "0s" },
        { path: bluePath, index: 1, timestamp: "1s" },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
        algo: "sw",
        slidingWindowSize: 3,
      });

      expect(result.length).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty frame list", async () => {
      const result = await deduplicateFrames({
        frames: [],
        threshold: 0.001,
        algo: "gd",
      });

      expect(result).toEqual([]);
    });

    it("should handle single frame", async () => {
      const redPath = await createTestImage("frame1.png", "red");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: "0s" },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
        algo: "gd",
      });

      expect(result.length).toBe(1);
      expect(result[0]).toEqual(frames[0]);
    });
  });
});

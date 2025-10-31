import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
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

    const colors = {
      red: { r: 255, g: 0, b: 0, alpha: 1 },
      blue: { r: 0, g: 0, b: 255, alpha: 1 },
      green: { r: 0, g: 255, b: 0, alpha: 1 },
    };

    await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: colors[color],
      },
    })
      .png()
      .toFile(imagePath);

    return imagePath;
  }

  describe("deduplicateFrames with greedy algorithm", () => {
    it("should keep all frames when they are all different (low threshold)", async () => {
      const redPath = await createTestImage("frame1.png", "red");
      const bluePath = await createTestImage("frame2.png", "blue");
      const greenPath = await createTestImage("frame3.png", "green");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: 0 },
        { path: bluePath, index: 1, timestamp: 1 },
        { path: greenPath, index: 2, timestamp: 2 },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001, // Low threshold means stricter duplicate detection
      });

      expect(result.length).toBe(3); // All frames should be kept
    });

    it("should remove duplicate frames when they are the same", async () => {
      const redPath1 = await createTestImage("frame1.png", "red");
      const redPath2 = await createTestImage("frame2.png", "red");
      const redPath3 = await createTestImage("frame3.png", "red");

      const frames: FrameInfo[] = [
        { path: redPath1, index: 0, timestamp: 0 },
        { path: redPath2, index: 1, timestamp: 1 },
        { path: redPath3, index: 2, timestamp: 2 },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
      });

      expect(result.length).toBe(1); // Only the first frame should be kept
      expect(result[0]?.index).toBe(0);
    });

    it("should handle high threshold by treating different images as duplicates", async () => {
      const redPath = await createTestImage("frame1.png", "red");
      const bluePath = await createTestImage("frame2.png", "blue");

      const frames: FrameInfo[] = [
        { path: redPath, index: 0, timestamp: 0 },
        { path: bluePath, index: 1, timestamp: 1 },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 1.0, // High threshold means everything is a duplicate
      });

      expect(result.length).toBe(1); // Only first frame kept
    });
  });

  describe("edge cases", () => {
    it("should handle empty frame list", async () => {
      const result = await deduplicateFrames({
        frames: [],
        threshold: 0.001,
      });

      expect(result).toEqual([]);
    });

    it("should handle single frame", async () => {
      const redPath = await createTestImage("frame1.png", "red");

      const frames: FrameInfo[] = [{ path: redPath, index: 0, timestamp: 0 }];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
      });

      expect(result.length).toBe(1);
      expect(result[0]).toEqual(frames[0]);
    });
  });
});

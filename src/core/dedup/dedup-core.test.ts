import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FrameInfo } from "../../types";
import { deduplicateFrames } from ".";

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
  ): Promise<{ path: string; fileName: string; base64: string }> {
    const imagePath = path.join(testDir, filename);

    const colors = {
      red: { r: 255, g: 0, b: 0, alpha: 1 },
      blue: { r: 0, g: 0, b: 255, alpha: 1 },
      green: { r: 0, g: 255, b: 0, alpha: 1 },
    };

    const sharpInstance = sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: colors[color],
      },
    }).png();

    await sharpInstance.toFile(imagePath);

    const buffer = await sharpInstance.toBuffer();
    const base64 = buffer.toString("base64");

    return { path: imagePath, fileName: filename, base64 };
  }

  describe("deduplicateFrames with greedy algorithm", () => {
    it("should keep all frames when they are all different (low threshold)", async () => {
      const red = await createTestImage("frame1.png", "red");
      const blue = await createTestImage("frame2.png", "blue");
      const green = await createTestImage("frame3.png", "green");

      const frames: FrameInfo[] = [
        {
          path: red.path,
          index: 0,
          timestamp: 0,
          fileName: red.fileName,
          base64: red.base64,
        },
        {
          path: blue.path,
          index: 1,
          timestamp: 1,
          fileName: blue.fileName,
          base64: blue.base64,
        },
        {
          path: green.path,
          index: 2,
          timestamp: 2,
          fileName: green.fileName,
          base64: green.base64,
        },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
      });

      expect(result.length).toBe(3);
    });

    it("should remove duplicate frames when they are the same", async () => {
      const red1 = await createTestImage("frame1.png", "red");
      const red2 = await createTestImage("frame2.png", "red");
      const red3 = await createTestImage("frame3.png", "red");

      const frames: FrameInfo[] = [
        {
          path: red1.path,
          index: 0,
          timestamp: 0,
          fileName: red1.fileName,
          base64: red1.base64,
        },
        {
          path: red2.path,
          index: 1,
          timestamp: 1,
          fileName: red2.fileName,
          base64: red2.base64,
        },
        {
          path: red3.path,
          index: 2,
          timestamp: 2,
          fileName: red3.fileName,
          base64: red3.base64,
        },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
      });

      expect(result.length).toBe(1);
      expect(result[0]?.index).toBe(0);
    });

    it("should handle high threshold by treating different images as duplicates", async () => {
      const red = await createTestImage("frame1.png", "red");
      const blue = await createTestImage("frame2.png", "blue");

      const frames: FrameInfo[] = [
        {
          path: red.path,
          index: 0,
          timestamp: 0,
          fileName: red.fileName,
          base64: red.base64,
        },
        {
          path: blue.path,
          index: 1,
          timestamp: 1,
          fileName: blue.fileName,
          base64: blue.base64,
        },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 1.0,
      });

      expect(result.length).toBe(1);
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
      const red = await createTestImage("frame1.png", "red");

      const frames: FrameInfo[] = [
        {
          path: red.path,
          index: 0,
          timestamp: 0,
          fileName: red.fileName,
          base64: red.base64,
        },
      ];

      const result = await deduplicateFrames({
        frames,
        threshold: 0.001,
      });

      expect(result.length).toBe(1);
      expect(result[0]).toEqual(frames[0]);
    });
  });
});

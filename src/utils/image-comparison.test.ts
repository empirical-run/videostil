import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { areImagesDuplicate, compareImageBuffers } from "./image-comparison";

describe("image-comparison", () => {
  describe("compareImageBuffers", () => {
    it("should compare two identical images and return zero difference", async () => {
      // Create a 10x10 red pixel PNG
      const testImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await compareImageBuffers(testImage, testImage, 0.1);

      expect(result.diffPixels).toBe(0);
      expect(result.totalPixels).toBe(100);
      expect(result.diffFraction).toBe(0);
    });

    it("should throw error when comparing images of different dimensions", async () => {
      // 10x10 image
      const smallImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      // 20x20 image
      const largerImage = await sharp({
        create: {
          width: 20,
          height: 20,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await expect(
        compareImageBuffers(smallImage, largerImage, 0.1),
      ).rejects.toThrow("Images must have the same dimensions");
    });

    it("should detect differences between different images", async () => {
      // Red image
      const redImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      // Blue image
      const blueImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await compareImageBuffers(redImage, blueImage, 0.1);

      expect(result.diffPixels).toBeGreaterThan(0);
      expect(result.diffFraction).toBeGreaterThan(0);
    });
  });

  describe("areImagesDuplicate", () => {
    it("should return true for identical images", async () => {
      const testImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await areImagesDuplicate(testImage, testImage, 0.001);

      expect(result).toBe(true);
    });

    it("should return false for very different images with low threshold", async () => {
      const redImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const blueImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await areImagesDuplicate(redImage, blueImage, 0.001);

      expect(result).toBe(false);
    });

    it("should return true for similar images with high threshold", async () => {
      const redImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const blueImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await areImagesDuplicate(redImage, blueImage, 1.0);

      expect(result).toBe(true);
    });

    it("should return false when image comparison throws an error (dimension mismatch)", async () => {
      const smallImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const largerImage = await sharp({
        create: {
          width: 20,
          height: 20,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await areImagesDuplicate(smallImage, largerImage, 0.001);

      expect(result).toBe(false);
    });
  });
});

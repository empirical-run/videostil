import * as fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { areImagesDuplicate, compareImageBuffers } from "./image-comparison";

describe("image-comparison", () => {
  describe("compareImageBuffers", () => {
    it("should compare two identical images and return zero difference", async () => {
      // Create a simple test image buffer (1x1 red pixel PNG)
      const testImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      const result = await compareImageBuffers(testImage, testImage, 0.1);

      expect(result.diffPixels).toBe(0);
      expect(result.totalPixels).toBe(1);
      expect(result.diffFraction).toBe(0);
    });

    it("should throw error when comparing images of different dimensions", async () => {
      // 1x1 image
      const smallImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      // 2x2 image
      const largerImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8/5+hHjgAMRgA5vAJ/bQYhgAAAABJRU5ErkJggg==",
        "base64",
      );

      await expect(
        compareImageBuffers(smallImage, largerImage, 0.1),
      ).rejects.toThrow("Images must have the same dimensions");
    });

    it("should detect differences between different images", async () => {
      // Red pixel
      const redImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      // Blue pixel
      const blueImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA3TyLVQAAAABJRU5ErkJggg==",
        "base64",
      );

      const result = await compareImageBuffers(redImage, blueImage, 0.1);

      expect(result.diffPixels).toBeGreaterThan(0);
      expect(result.diffFraction).toBeGreaterThan(0);
    });
  });

  describe("areImagesDuplicate", () => {
    it("should return true for identical images", async () => {
      const testImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      const result = await areImagesDuplicate(testImage, testImage, 0.001);

      expect(result).toBe(true);
    });

    it("should return false for very different images with low threshold", async () => {
      const redImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      const blueImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA3TyLVQAAAABJRU5ErkJggg==",
        "base64",
      );

      const result = await areImagesDuplicate(redImage, blueImage, 0.001);

      expect(result).toBe(false);
    });

    it("should return true for similar images with high threshold", async () => {
      const redImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      const blueImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA3TyLVQAAAABJRU5ErkJggg==",
        "base64",
      );

      const result = await areImagesDuplicate(redImage, blueImage, 1.0);

      expect(result).toBe(true);
    });

    it("should return false when image comparison throws an error (dimension mismatch)", async () => {
      const smallImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );

      const largerImage = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8/5+hHjgAMRgA5vAJ/bQYhgAAAABJRU5ErkJggg==",
        "base64",
      );

      const result = await areImagesDuplicate(smallImage, largerImage, 0.001);

      expect(result).toBe(false);
    });
  });
});

import { promises as fs } from "fs";
import type { FrameInfo } from "../types/index.js";

export class ImageLoader {
  private cache: Map<string, Buffer> = new Map();

  async loadBuffer(frame: FrameInfo): Promise<Buffer> {
    const cacheKey = frame.path;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (frame.base64) {
      const buffer = Buffer.from(frame.base64, "base64");
      this.cache.set(cacheKey, buffer);
      return buffer;
    }

    const buffer = await fs.readFile(frame.path);
    this.cache.set(cacheKey, buffer);
    return buffer;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

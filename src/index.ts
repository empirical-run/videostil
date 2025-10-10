/**
 * videostil - Convert videos into LLM-friendly formats
 *
 * Extract and deduplicate video frames to fit within LLM context windows.
 */

export { FFmpegClient } from "./core/ffmpeg.js";
export type {
  FrameInfo,
  ExtractOptions,
  ExtractResult,
  DeduplicationOptions,
} from "./types/index.js";
export { deduplicateFrames } from "./utils/dedup-core.js";
export { deduplicateImageFiles } from "./utils/dedup-fs.js";
export { DEDUP_CONFIG, ALGO_MAP } from "./utils/config.js";
export { startServer as startAnalysisServer } from "./server/index.js";
export type { ServerOptions, ServerHandle } from "./server/index.js";

/**
 * Main API - Extract unique frames from a video
 *
 * @example
 * ```typescript
 * import { extractUniqueFrames } from 'videostil';
 *
 * const result = await extractUniqueFrames({
 *   videoUrl: 'https://example.com/video.mp4',
 *   fps: 25,
 *   threshold: 0.01,
 *   algo: 'gd'
 * });
 *
 * console.log(`Extracted ${result.uniqueFrames.length} unique frames`);
 * ```
 */
export async function extractUniqueFrames(
  options: import("./types/index.js").ExtractOptions,
) {
  const { FFmpegClient } = await import("./core/ffmpeg.js");
  const client = new FFmpegClient();
  return client.extractUniqueFrames(options);
}

/**
 * Start analysis viewer server
 *
 * Serves all analyses from ~/.videostil/ directory or a custom working directory
 *
 * @example
 * ```typescript
 * import { serve } from 'videostil';
 *
 * const server = await serve({
 *   port: 8080,
 *   openBrowser: true,
 *   workingDir: './my-analyses' // Optional: custom directory
 * });
 *
 * console.log(`Server running at ${server.url}`);
 * ```
 */
export async function serve(
  options?: import("./server/index.js").ServerOptions,
) {
  const { startServer } = await import("./server/index.js");
  return startServer(options);
}

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

export { analyseFrames } from "./agent/index.js";
export type { AnalyseFramesResult } from "./agent/index.js";
export type {
  Attachment,
  SupportedChatModels,
  CanonicalMessage,
} from "./agent/types.js";

export async function extractUniqueFrames(
  options: import("./types/index.js").ExtractOptions,
) {
  const { FFmpegClient } = await import("./core/ffmpeg.js");
  const client = new FFmpegClient();
  return client.extractUniqueFrames(options);
}

export async function serve(
  options?: import("./server/index.js").ServerOptions,
) {
  const { startServer } = await import("./server/index.js");
  return startServer(options);
}

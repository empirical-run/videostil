export { FFmpegClient } from "./core/ffmpeg.ts";
export type {
  FrameInfo,
  ExtractOptions,
  ExtractResult,
  DeduplicationOptions,
} from "./types/index.ts";
export { deduplicateFrames } from "./utils/dedup-core.ts";
export { deduplicateImageFiles } from "./utils/dedup-fs.ts";
export { DEDUP_CONFIG, ALGO_MAP } from "./utils/config.ts";
export { startServer as startAnalysisServer } from "./server/index.ts";
export type { ServerOptions, ServerHandle } from "./server/index.ts";

export { analyseFrames } from "./agent/index.ts";
export type { AnalyseFramesResult } from "./agent/index.ts";
export type {
  Attachment,
  SupportedChatModels,
  CanonicalMessage,
} from "./agent/types.ts";

export async function extractUniqueFrames(
  options: import("./types/index.ts").ExtractOptions,
) {
  const { FFmpegClient } = await import("./core/ffmpeg.ts");
  const client = new FFmpegClient();
  return client.extractUniqueFrames(options);
}

export async function serve(
  options?: import("./server/index.ts").ServerOptions,
) {
  const { startServer } = await import("./server/index.ts");
  return startServer(options);
}

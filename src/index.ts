export { FFmpegClient } from "./core/ffmpeg";
export type {
  FrameInfo,
  ExtractOptions,
  ExtractResult,
  DeduplicationOptions,
} from "./types/index";
export { deduplicateFrames } from "./utils/dedup-core";
export { deduplicateImageFiles } from "./utils/dedup-fs";
export { DEDUP_CONFIG, ALGO_MAP } from "./utils/config";
export type { ServerOptions, ServerHandle } from "./server/index";

export { analyseFrames } from "./agent/index";
export type { AnalyseFramesResult } from "./agent/index";
export type {
  Attachment,
  SupportedChatModels,
  CanonicalMessage,
} from "./agent/types";

export { checkApiKeys, requireApiKeys } from "./utils/api-keys";
export type { ApiKeysConfig } from "./utils/api-keys";

export { startServer } from "./server/index";

export { extractUniqueFrames } from "./core/index";

import { ExtractOptions } from "../types";
import { FFmpegClient } from "./ffmpeg";

export async function extractUniqueFrames(options: ExtractOptions) {
  const client = new FFmpegClient();
  return client.extractUniqueFrames(options);
}
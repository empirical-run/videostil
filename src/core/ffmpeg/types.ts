import { FrameInfo } from "../../types";

export interface ExtractOptions {
  videoUrl: string;
  fps: number;
  threshold: number;
  startTime: number;
  duration?: number;
  workingDir: string;
}

export interface ExtractResult {
  totalFramesCount: number;
  uniqueFrames: FrameInfo[];
  videoDurationSeconds: number;
  uniqueFramesDir: string;
}

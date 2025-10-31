export interface FrameInfo {
  index: number;
  path: string;
  fileName: string;
  url?: string;
  base64: string;
  timestamp?: number;
}

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

export interface DeduplicationOptions {
  frames: FrameInfo[];
  threshold: number;
  logPrefix?: string;
  dpMaxLookback?: number;
  slidingWindowSize?: number;
  diffCollector?: any;
  fps?: number;
}

/**
 * Core type definitions for videostil
 */

/**
 * Information about a single video frame
 */
export interface FrameInfo {
  /** Frame index (position in original video, not relative) */
  index: number;
  /** Local file path to the frame image */
  path: string;
  /** Normalized filename (e.g., "frame_000123.png") */
  fileName: string;
  /** Optional URL if hosted remotely */
  url?: string;
  /** Base64-encoded image data */
  base64: string;
  /** Human-readable timestamp (e.g., "1m23s") */
  timestamp?: string;
}

/**
 * Options for extracting frames from a video
 */
export interface ExtractOptions {
  videoUrl: string;
  /** Frames per second to extract (default: 25) */
  fps: number;
  /** Similarity threshold for deduplication (0.0-1.0, default: 0.001) */
  /** Start extraction at X seconds into video */
  threshold: number;
  /** Start extraction at specified time into video in MM:SS format (e.g., "1:30" for 1 minute 30 seconds) */
  startTime: number;
  /** Extract only specified duration in seconds */
  duration?: number;
  /** Deduplication algorithm: "gd" (greedy), "dp" (dynamic programming), "sw" (sliding window) */
  algo: "gd" | "dp" | "sw";
  /** Absolute path to working directory for output */
  workingDir: string;
}

/**
 * Result of frame extraction
 */
export interface ExtractResult {
  /** Total number of frames extracted before deduplication */
  totalFramesCount: number;
  /** Array of unique frame information after deduplication */
  uniqueFrames: FrameInfo[];
  /** Total duration of the video in seconds */
  videoDurationSeconds: number;
  /** Path to directory containing unique frames */
  uniqueFramesDir: string;
}

/**
 * Options for deduplication algorithms
 */
export interface DeduplicationOptions {
  /** Array of frames to deduplicate */
  frames: FrameInfo[];
  /** Similarity threshold (0.0-1.0) */
  threshold: number;
  /** Log prefix for console output */
  logPrefix?: string;
  /** Algorithm to use */
  algo?: "gd" | "dp" | "sw";
  /** Max lookback for DP algorithm */
  dpMaxLookback?: number;
  /** Window size for sliding window algorithm */
  slidingWindowSize?: number;
  /** Optional collector for frame difference data */
  diffCollector?: any;
  /** Frames per second (used for timestamp calculation in diff collector) */
  fps?: number;
}

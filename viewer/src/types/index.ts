export interface AnalysisInfo {
  id: string;
  name: string;
  modifiedTime: string;
  video_url: string;
  analysis_id: string;
  unique_frames_count: number;
  params: {
    algo?: string;
    fps?: number;
    threshold?: number;
  };
}

export interface Frame {
  index: number;
  path: string;
  fileName: string;
  url: string;
  timestamp: string;
  size: number;
  similarityPercentage: number | null;
  description?: string;
}

export interface AnalysisData {
  unique_frames_count: number;
  video_url: string;
  analysis: string;
  analysis_id: string;
  params: {
    algo?: string;
    fps?: number;
    threshold?: number;
    startTime?: number;
    duration?: number;
  };
  unique_frames: Frame[];
  videoDurationSeconds?: number;
  totalFramesCount?: number;
  interleaved_tool_result?: string | unknown[];
}

export interface GraphPoint {
  frameIndex: number;
  diffFraction: number;
  timestamp: string;
}

export interface GraphMetadata {
  totalFrames: number;
  avgDiff: number;
  maxDiff: number;
  minDiff: number;
}

export interface GraphDataSet {
  points: GraphPoint[];
  metadata: GraphMetadata;
}

export interface GraphData {
  allFrames: GraphDataSet;
  uniqueFrames: GraphDataSet;
  cached?: boolean;
}

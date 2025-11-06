import { FrameInfo } from "../../types";

export interface DeduplicationOptions {
  frames: FrameInfo[];
  threshold: number;
  logPrefix?: string;
  diffCollector?: any;
  fps?: number;
}

export type FrameDiffPoint = {
  frameIndex: number;
  diffFraction: number;
  timestamp: string;
};

export type DiffMetadata = {
  totalFrames: number;
  avgDiff: number;
  maxDiff: number;
  minDiff: number;
};

export type GraphData = {
  points: FrameDiffPoint[];
  metadata: DiffMetadata;
};

/**
 * Collects frame difference data during deduplication process.
 * This data is used to generate graphs showing frame differences over time.
 */
export class DiffDataCollector {
  private points: FrameDiffPoint[] = [];
  private sumDiff = 0;
  private maxDiff = 0;
  private minDiff = 1;
  private comparisonCount = 0;

  /**
   * Add a frame difference measurement
   * @param frameIndex - The index of the frame
   * @param diffFraction - The difference fraction (0-1) compared to previous frame
   * @param fps - Frames per second (used to calculate timestamp)
   */
  addFrameDiff(frameIndex: number, diffFraction: number, fps: number): void {
    const minutes = Math.floor(frameIndex / fps / 60);
    const seconds = Math.floor((frameIndex / fps) % 60);
    const timestamp = `${minutes}m${seconds.toString().padStart(2, "0")}s`;

    this.points.push({
      frameIndex,
      diffFraction,
      timestamp,
    });

    // Track statistics (skip first frame which has 0 diff)
    if (this.points.length > 1) {
      this.sumDiff += diffFraction;
      this.maxDiff = Math.max(this.maxDiff, diffFraction);
      this.minDiff = Math.min(this.minDiff, diffFraction);
      this.comparisonCount++;
    }
  }

  /**
   * Get the collected graph data with metadata
   */
  getGraphData(): GraphData {
    const avgDiff =
      this.comparisonCount > 0 ? this.sumDiff / this.comparisonCount : 0;

    return {
      points: this.points,
      metadata: {
        totalFrames: this.points.length,
        avgDiff,
        maxDiff: this.maxDiff,
        minDiff: this.comparisonCount > 0 ? this.minDiff : 0,
      },
    };
  }

  /**
   * Check if any data has been collected
   */
  hasData(): boolean {
    return this.points.length > 0;
  }

  /**
   * Extract graph data for a subset of frames (e.g., unique frames after deduplication)
   * @param frameIndices - Set of frame indices to include in the subset
   * @returns Object containing both all frames and unique frames graph data
   */
  getFilteredGraphData(frameIndices: Set<number>): {
    allFrames: GraphData;
    uniqueFrames: GraphData;
  } {
    const allFramesGraphData = this.getGraphData();

    // Filter points to only include specified frames
    const uniqueFramesPoints = allFramesGraphData.points.filter((point) =>
      frameIndices.has(point.frameIndex)
    );

    // Recalculate metadata for unique frames subset
    let sumDiff = 0;
    let maxDiff = 0;
    let minDiff = 1;
    let comparisonCount = 0;

    for (let i = 1; i < uniqueFramesPoints.length; i++) {
      const diffFraction = uniqueFramesPoints[i]!.diffFraction;
      sumDiff += diffFraction;
      maxDiff = Math.max(maxDiff, diffFraction);
      minDiff = Math.min(minDiff, diffFraction);
      comparisonCount++;
    }

    const uniqueFramesGraphData = {
      points: uniqueFramesPoints,
      metadata: {
        totalFrames: uniqueFramesPoints.length,
        avgDiff: comparisonCount > 0 ? sumDiff / comparisonCount : 0,
        maxDiff,
        minDiff: comparisonCount > 0 ? minDiff : 0,
      },
    };

    return {
      allFrames: allFramesGraphData,
      uniqueFrames: uniqueFramesGraphData,
    };
  }
}

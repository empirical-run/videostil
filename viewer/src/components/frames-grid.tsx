import { useEffect, useState } from "react";
import type { Frame } from "../types";
import { fetchSimilarity, fetchGraphData } from "../lib/api";
import { formatSecondsToTimestamp } from "../utils";

interface FramesGridProps {
  frames: Frame[];
  loading: boolean;
  onFrameClick: (
    index: number,
    similarities: Map<number, number>,
    allFramesDiff: Map<number, number>,
  ) => void;
  activeTab?: 'unique' | 'all';
}

export default function FramesGrid({
  frames,
  loading,
  onFrameClick,
  activeTab = 'unique',
}: FramesGridProps) {
  const [similarities, setSimilarities] = useState<Map<number, number>>(
    new Map(),
  );
  const [allFramesDiff, setAllFramesDiff] = useState<Map<number, number>>(
    new Map(),
  );

  useEffect(() => {
    // Clear similarities when frames change (new analysis loaded)
    setSimilarities(new Map());
    setAllFramesDiff(new Map());

    if (frames.length === 0) return;

    // Load both similarities and graph data
    const loadComparisonData = async () => {
      // Load graph data to get diff with previous video frame
      try {
        const graphData = await fetchGraphData();
        const diffMap = new Map(
          graphData.allFrames.points.map((p) => [p.frameIndex, p.diffFraction]),
        );
        setAllFramesDiff(diffMap);
      } catch (error) {
        console.error("Error loading graph data:", error);
      }

      // Load similarities between consecutive unique frames
      for (let i = 1; i < frames.length; i++) {
        try {
          const similarity = await fetchSimilarity(
            frames[i - 1].fileName,
            frames[i].fileName,
          );
          setSimilarities((prev) => new Map(prev).set(i, similarity));
        } catch (error) {
          console.error(`Error loading similarity for frame ${i}:`, error);
        }
      }
    };

    loadComparisonData();
  }, [frames]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-[10px]">
        Loading frames...
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-[10px]">
        No frames available
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-1">
        {frames.map((frame, index) => {
          const frameSize = frame.size
            ? (frame.size / 1024).toFixed(1)
            : "Loading...";
          const similarity = similarities.get(index);
          const videoDiff = allFramesDiff.get(frame.index);

          const prevFrame = index > 0 ? frames[index - 1] : null;
          const frameGap = prevFrame ? frame.index - prevFrame.index : 0;

          const diffUniqueText =
            index === 0
              ? "First"
              : similarity !== undefined
                ? `${(similarity * 100).toFixed(1)}%`
                : "Loading...";

          const diffVideoText =
            videoDiff !== undefined && videoDiff !== null
              ? `${(videoDiff * 100).toFixed(1)}%`
              : "—";

          return (
            <div
              key={frame.fileName}
              className="border border-gray-200 rounded overflow-hidden bg-white cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onFrameClick(index, similarities, allFramesDiff)}
            >
              <img
                src={frame.url}
                alt={`Frame ${index + 1}`}
                className="w-full h-20 object-contain bg-gray-50"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="p-1 text-[8px] leading-tight bg-gray-50 border-t border-gray-100 font-bold text-black">
                <div className="font-bold">#{index + 1}</div>
                <div>
                  T:{" "}
                  {formatSecondsToTimestamp(parseFloat(frame.timestamp)) ||
                    "N/A"}
                </div>
                {activeTab === 'unique' && (
                  <div className="text-purple-600 text-[7px]">
                    D-Uniq: {diffUniqueText}
                  </div>
                )}
                <div className="text-blue-600 text-[7px]">
                  D-Video: {diffVideoText}
                </div>
                {activeTab === 'unique' && frameGap > 1 && (
                  <div className="text-orange-600 text-[7px]">
                    Gap: +{frameGap - 1}
                  </div>
                )}
                <div className="text-gray-600 text-[7px]">{frameSize} KB</div>
                <div className="text-gray-400 text-[7px] break-all">
                  {frame.fileName}
                </div>
                {frame.description && (
                  <div className="text-[7px] text-gray-600 mt-0.5">
                    {frame.description.substring(0, 25)}...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

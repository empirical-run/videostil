import type { AnalysisInfo } from "../types";

interface AnalysisListProps {
  analyses: AnalysisInfo[];
  currentAnalysisId: string | null;
  onSelectAnalysis: (id: string) => void;
}

export default function AnalysisList({
  analyses,
  currentAnalysisId,
  onSelectAnalysis,
}: AnalysisListProps) {
  if (analyses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-[10px] p-2.5">
        No saved analyses found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1">
      <div className="space-y-1">
        {analyses.map((analysis) => {
          const date = new Date(analysis.modifiedTime);
          const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          )}`;

          const params = analysis.params || {};
          const algo = params.algo || "gd";
          const fps = params.fps || "N/A";
          const threshold = params.threshold || "N/A";

          const videoUrl = analysis.video_url || "Unknown";
          const displayUrl =
            videoUrl.length > 30 ? videoUrl.substring(0, 30) + "..." : videoUrl;

          const isActive = analysis.id === currentAnalysisId;

          return (
            <div
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis.id)}
              className={`
                p-1.5 mb-1 border rounded cursor-pointer transition-colors
                ${
                  isActive
                    ? "bg-blue-50 border-blue-400"
                    : "bg-white border-gray-200 hover:bg-blue-50"
                }
              `}
            >
              <div className="font-bold text-[9px] text-[#2c3e50] mb-0.5">
                {analysis.name}
              </div>
              <div className="text-[8px] text-gray-600 leading-tight">
                {displayUrl}
              </div>
              <div className="text-[8px] text-gray-600 leading-tight">
                {analysis.unique_frames_count} Unique frames • algo: {algo}
              </div>
              <div className="text-[8px] text-gray-600 leading-tight">
                fps: {fps} • threshold: {threshold}
              </div>
              <div className="text-[7px] text-gray-400 mt-0.5">{dateStr}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

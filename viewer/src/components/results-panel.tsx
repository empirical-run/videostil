import type { AnalysisData } from "../types";

interface ResultsPanelProps {
  analysisData: AnalysisData | null;
}

export default function ResultsPanel({ analysisData }: ResultsPanelProps) {
  if (!analysisData) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-[10px]">
        No result
      </div>
    );
  }

  const renderInterleavedResult = () => {
    if (!analysisData.interleaved_tool_result) {
      return <div className="text-[9px] font-mono">No result</div>;
    }

    try {
      let parsedResult = analysisData.interleaved_tool_result;
      if (typeof parsedResult === "string") {
        parsedResult = JSON.parse(parsedResult);
      }

      if (Array.isArray(parsedResult) && parsedResult.length > 0) {
        return (
          <div className="space-y-3">
            {parsedResult.map((item: any, index: number) => {
              if (item.type === "text" && item.text) {
                let frameData: { key_frame?: string; description?: string };
                try {
                  frameData = JSON.parse(item.text);
                } catch {
                  frameData = { description: item.text };
                }

                const nextItem: any = parsedResult[index + 1];
                const imageUrl =
                  nextItem &&
                  typeof nextItem.type === "string" &&
                  nextItem.type.startsWith("image")
                    ? nextItem.url
                    : null;

                const frameIndex = Math.floor(index / 2);

                return (
                  <div
                    key={index}
                    className="p-1.5 border border-gray-200 rounded bg-white"
                  >
                    <div className="font-bold text-[#2c3e50] mb-1 text-[10px]">
                      {frameData.key_frame || `Frame ${frameIndex + 1}`}
                    </div>
                    <div className="text-[9px] text-gray-700 mb-1 break-words">
                      {frameData.description || item.text}
                    </div>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Frame"
                        className="w-full h-[120px] object-contain border border-gray-200 rounded bg-gray-50 cursor-pointer"
                      />
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }

      return (
        <pre className="text-[9px] font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(parsedResult, null, 2)}
        </pre>
      );
    } catch (error) {
      return (
        <pre className="text-[9px] font-mono whitespace-pre-wrap break-all">
          {typeof analysisData.interleaved_tool_result === "string"
            ? analysisData.interleaved_tool_result
            : JSON.stringify(analysisData.interleaved_tool_result, null, 2)}
        </pre>
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-1">
      {/* Info Section */}
      <div className="mb-1.5 border border-gray-100 rounded overflow-hidden">
        <div className="bg-gray-100 px-1 py-0.5 text-[9px] font-bold border-b border-gray-100">
          Info
        </div>
        <div className="p-1 bg-gray-50">
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
            {/* Analysis ID */}
            <div className="text-gray-600">Analysis ID:</div>
            <div className="font-mono text-[8px] truncate" title={analysisData.analysis_id}>
              {analysisData.analysis_id}
            </div>

            {/* Video URL */}
            {analysisData.video_url && (
              <>
                <div className="text-gray-600">Video URL:</div>
                <div className="font-mono text-[8px] truncate" title={analysisData.video_url}>
                  <a
                    href={analysisData.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {analysisData.video_url}
                  </a>
                </div>
              </>
            )}

            {/* Video Duration */}
            {analysisData.videoDurationSeconds !== undefined && (
              <>
                <div className="text-gray-600">Video Duration:</div>
                <div className="font-mono">{formatTime(analysisData.videoDurationSeconds)}</div>
              </>
            )}

            {/* Extraction Parameters */}
            {analysisData.params?.startTime !== undefined && (
              <>
                <div className="text-gray-600">Start Time:</div>
                <div className="font-mono">{formatTime(analysisData.params.startTime)}</div>
              </>
            )}
            {analysisData.params?.duration !== undefined && (
              <>
                <div className="text-gray-600">Extract Duration:</div>
                <div className="font-mono">{formatTime(analysisData.params.duration)}</div>
              </>
            )}

            {/* Frame Counts */}
            {analysisData.totalFramesCount !== undefined && (
              <>
                <div className="text-gray-600">Total Frames:</div>
                <div className="font-mono">{analysisData.totalFramesCount}</div>
              </>
            )}
            <div className="text-gray-600">Unique Frames:</div>
            <div className="font-mono">{analysisData.unique_frames_count}</div>

            {/* Algorithm Parameters */}
            {analysisData.params?.algo && (
              <>
                <div className="text-gray-600">Algorithm:</div>
                <div className="font-mono uppercase">{analysisData.params.algo}</div>
              </>
            )}
            {analysisData.params?.fps !== undefined && (
              <>
                <div className="text-gray-600">FPS:</div>
                <div className="font-mono">{analysisData.params.fps}</div>
              </>
            )}
            {analysisData.params?.threshold !== undefined && (
              <>
                <div className="text-gray-600">Threshold:</div>
                <div className="font-mono">{analysisData.params.threshold}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="mb-1.5 border border-gray-100 rounded overflow-hidden">
        <div className="bg-gray-100 px-1 py-0.5 text-[9px] font-bold border-b border-gray-100">
          Analysis
        </div>
        <div className="p-1 bg-gray-50 max-h-[200px] overflow-y-auto">
          <div className="text-[10px] leading-relaxed whitespace-pre-wrap">
            {analysisData.analysis || "No result"}
          </div>
        </div>
      </div>

      {/* Interleaved Result Section */}
      <div className="flex-1 border border-gray-100 rounded overflow-hidden flex flex-col min-h-0">
        <div className="bg-gray-100 px-1 py-0.5 text-[9px] font-bold border-b border-gray-100">
          Interleaved Result
        </div>
        <div className="flex-1 p-1 bg-gray-50 overflow-y-auto">
          {renderInterleavedResult()}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { fetchGraphData } from "../lib/api";
import type { GraphData, GraphDataSet } from "../types";

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
);

interface GraphSectionProps {
  analysisId: string;
}

export default function GraphSection({ analysisId }: GraphSectionProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"allFrames" | "uniqueFrames">(
    "allFrames",
  );
  const [zoomLevel, setZoomLevel] = useState("100%");
  const [visibleRange, setVisibleRange] = useState("Frames: All");
  const [showHelp, setShowHelp] = useState(false);

  const allFramesChartRef = useRef<HTMLCanvasElement>(null);
  const uniqueFramesChartRef = useRef<HTMLCanvasElement>(null);
  const modalChartRef = useRef<HTMLCanvasElement>(null);

  const allFramesChartInstance = useRef<Chart | null>(null);
  const uniqueFramesChartInstance = useRef<Chart | null>(null);
  const modalChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    loadGraphData();

    return () => {
      allFramesChartInstance.current?.destroy();
      uniqueFramesChartInstance.current?.destroy();
      modalChartInstance.current?.destroy();
    };
  }, [analysisId]);

  useEffect(() => {
    if (graphData) {
      renderMiniGraphs();
    }
  }, [graphData]);

  useEffect(() => {
    if (modalOpen && graphData) {
      renderModalGraph();
    } else if (!modalOpen) {
      // Reset help panel when modal closes
      setShowHelp(false);
    }
  }, [modalOpen, activeTab, graphData]);

  // Keyboard shortcuts for modal
  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showHelp && e.key === "Escape") {
        setShowHelp(false);
        return;
      }

      switch (e.key) {
        case "Escape":
          setModalOpen(false);
          break;
        case "?":
          e.preventDefault();
          setShowHelp(!showHelp);
          break;
        case "ArrowLeft":
        case "ArrowRight":
          if (!e.shiftKey) {
            setActiveTab((prev) =>
              prev === "allFrames" ? "uniqueFrames" : "allFrames",
            );
          }
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomIn();
          break;
        case "-":
        case "_":
          e.preventDefault();
          zoomOut();
          break;
        case "0":
        case "r":
        case "R":
          e.preventDefault();
          resetZoom();
          break;
        case "h":
        case "H":
          e.preventDefault();
          panLeft();
          break;
        case "l":
        case "L":
          e.preventDefault();
          panRight();
          break;
        case "j":
        case "J":
          e.preventDefault();
          zoomOut();
          break;
        case "k":
        case "K":
          e.preventDefault();
          zoomIn();
          break;
        case "Home":
          e.preventDefault();
          panToStart();
          break;
        case "End":
          e.preventDefault();
          panToEnd();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, showHelp, activeTab]);

  async function loadGraphData() {
    setLoading(true);
    try {
      const data = await fetchGraphData();
      setGraphData(data);
      setError(null);
    } catch (err) {
      setError("Error loading graph data");
      console.error("Error loading graph data:", err);
    } finally {
      setLoading(false);
    }
  }

  function createChartConfig(
    data: GraphDataSet,
    isMini = false,
  ): ChartConfiguration {
    return {
      type: "line",
      data: {
        labels: data.points.map((p) => p.frameIndex),
        datasets: [
          {
            label: "Diff Fraction",
            data: data.points.map((p) => p.diffFraction),
            borderColor: "#2196f3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            borderWidth: 2,
            pointRadius: isMini ? 1 : 3,
            pointHoverRadius: isMini ? 2 : 5,
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: !isMini,
          },
          tooltip: {
            enabled: !isMini,
            callbacks: {
              title: (context) => {
                const index = context[0].dataIndex;
                const point = data.points[index];
                return `Frame ${point.frameIndex} (${point.timestamp})`;
              },
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `Diff: ${(value * 100).toFixed(2)}%`;
              },
            },
          },
          zoom: !isMini
            ? {
                zoom: {
                  wheel: {
                    enabled: true,
                    speed: 0.1,
                  },
                  pinch: {
                    enabled: true,
                  },
                  mode: "x",
                  onZoomStart: (context: any) => {
                    // Prevent zoom on horizontal scroll or Shift+wheel
                    const event = context.event;
                    if (event && event.type === "wheel") {
                      if (
                        event.shiftKey ||
                        Math.abs(event.deltaX) > Math.abs(event.deltaY)
                      ) {
                        return false; // Cancel zoom
                      }
                    }
                    return true; // Allow zoom
                  },
                  onZoomComplete: () => updateZoomInfo(),
                },
                pan: {
                  enabled: true,
                  mode: "x",
                  onPanComplete: () => updateZoomInfo(),
                },
                limits: {
                  x: {
                    min: 0,
                    max: data.points.length - 1,
                    minRange: 10,
                  },
                },
              }
            : undefined,
        },
        scales: {
          x: {
            display: !isMini,
            title: {
              display: !isMini,
              text: "Frame Index",
            },
          },
          y: {
            display: true,
            title: {
              display: !isMini,
              text: "Difference Fraction",
            },
            ticks: {
              font: {
                size: isMini ? 8 : 11,
              },
            },
            min: 0,
            max: Math.max(data.metadata.maxDiff * 1.1, 0.1),
          },
        },
      },
    };
  }

  function renderMiniGraphs() {
    if (!graphData) return;

    if (graphData.allFrames && allFramesChartRef.current) {
      if (allFramesChartInstance.current) {
        allFramesChartInstance.current.destroy();
      }
      const ctx = allFramesChartRef.current.getContext("2d");
      if (ctx) {
        allFramesChartInstance.current = new Chart(
          ctx,
          createChartConfig(graphData.allFrames, true),
        );
      }
    }

    if (graphData.uniqueFrames && uniqueFramesChartRef.current) {
      if (uniqueFramesChartInstance.current) {
        uniqueFramesChartInstance.current.destroy();
      }
      const ctx = uniqueFramesChartRef.current.getContext("2d");
      if (ctx) {
        uniqueFramesChartInstance.current = new Chart(
          ctx,
          createChartConfig(graphData.uniqueFrames, true),
        );
      }
    }
  }

  function renderModalGraph() {
    if (!graphData || !modalChartRef.current) return;

    const data =
      activeTab === "allFrames" ? graphData.allFrames : graphData.uniqueFrames;

    if (modalChartInstance.current) {
      modalChartInstance.current.destroy();
    }

    const ctx = modalChartRef.current.getContext("2d");
    if (ctx) {
      modalChartInstance.current = new Chart(
        ctx,
        createChartConfig(data, false),
      );
      updateZoomInfo();
    }
  }

  function updateZoomInfo() {
    if (!modalChartInstance.current) return;

    const xScale = modalChartInstance.current.scales.x;
    if (!xScale) return;

    const data =
      activeTab === "allFrames"
        ? graphData!.allFrames
        : graphData!.uniqueFrames;
    const total = data.points.length;
    if (total === 0) return;

    const minIndex = Math.max(0, Math.floor(xScale.min));
    const maxIndex = Math.min(total - 1, Math.ceil(xScale.max));
    const visibleCount = maxIndex - minIndex + 1;

    const zoom = total > 0 ? (total / visibleCount) * 100 : 100;
    setZoomLevel(`${Math.round(zoom)}%`);

    if (visibleCount >= total - 1) {
      setVisibleRange("Frames: All");
    } else {
      const startFrame = data.points[minIndex].frameIndex;
      const endFrame = data.points[maxIndex].frameIndex;
      setVisibleRange(`Frames: ${startFrame} - ${endFrame}`);
    }
  }

  function zoomIn() {
    modalChartInstance.current?.zoom(1.2);
    updateZoomInfo();
  }

  function zoomOut() {
    modalChartInstance.current?.zoom(0.8);
    updateZoomInfo();
  }

  function resetZoom() {
    if (modalChartInstance.current) {
      modalChartInstance.current?.resetZoom();
      updateZoomInfo();
    } else {
      console.log("modalChartInstance is not initialized");
    }
  }

  function panLeft() {
    if (!modalChartInstance.current) return;
    const xScale = modalChartInstance.current.scales.x as any;
    if (!xScale) return;

    const currentMin = (xScale.options.min ?? xScale.min) as number;
    const currentMax = (xScale.options.max ?? xScale.max) as number;
    const range = currentMax - currentMin;
    const panAmount = -range * 0.1;
    let newMin = currentMin + panAmount;
    let newMax = newMin + range;

    if (newMin < 0) {
      newMin = 0;
      newMax = range;
    }

    xScale.options.min = newMin;
    xScale.options.max = newMax;
    modalChartInstance.current.update("none");
    updateZoomInfo();
  }

  function panRight() {
    if (!modalChartInstance.current) return;
    const xScale = modalChartInstance.current.scales.x as any;
    if (!xScale) return;

    const currentMin = (xScale.options.min ?? xScale.min) as number;
    const currentMax = (xScale.options.max ?? xScale.max) as number;
    const range = currentMax - currentMin;
    const dataMax = modalChartInstance.current.data.labels!.length - 1;
    const panAmount = range * 0.1;
    let newMin = currentMin + panAmount;
    let newMax = newMin + range;

    if (newMax > dataMax) {
      newMax = dataMax;
      newMin = dataMax - range;
    }

    xScale.options.min = newMin;
    xScale.options.max = newMax;
    modalChartInstance.current.update("none");
    updateZoomInfo();
  }

  function panToStart() {
    if (!modalChartInstance.current) return;
    const xScale = modalChartInstance.current.scales.x as any;
    if (!xScale) return;

    const currentMin = (xScale.options.min ?? xScale.min) as number;
    const currentMax = (xScale.options.max ?? xScale.max) as number;
    const range = currentMax - currentMin;

    xScale.options.min = 0;
    xScale.options.max = range;
    modalChartInstance.current.update("none");
    updateZoomInfo();
  }

  function panToEnd() {
    if (!modalChartInstance.current) return;
    const xScale = modalChartInstance.current.scales.x as any;
    if (!xScale) return;

    const currentMin = (xScale.options.min ?? xScale.min) as number;
    const currentMax = (xScale.options.max ?? xScale.max) as number;
    const range = currentMax - currentMin;
    const dataMax = modalChartInstance.current.data.labels!.length - 1;

    xScale.options.min = dataMax - range;
    xScale.options.max = dataMax;
    modalChartInstance.current.update("none");
    updateZoomInfo();
  }

  if (loading) return null;
  if (error) return null;
  if (!graphData) return null;

  const currentData =
    activeTab === "allFrames" ? graphData.allFrames : graphData.uniqueFrames;

  return (
    <>
      {/* Mini Graphs Section */}
      <div className="border-b border-gray-200 bg-white">
        <div className="bg-gray-100 px-2 py-1 text-[9px] font-bold border-b border-gray-100">
          FRAME DIFFERENCE ANALYSIS
        </div>
        <div className="p-2 flex flex-col gap-2">
          <div
            className="border border-gray-200 rounded bg-white cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setActiveTab("allFrames");
              setModalOpen(true);
            }}
          >
            <div className="bg-[#2c3e50] text-white px-1.5 py-0.5 text-[8px] font-bold text-center">
              ALL FRAMES
            </div>
            <div className="p-1 h-[120px]">
              <canvas ref={allFramesChartRef}></canvas>
            </div>
          </div>
          <div
            className="border border-gray-200 rounded bg-white cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setActiveTab("uniqueFrames");
              setModalOpen(true);
            }}
          >
            <div className="bg-[#2c3e50] text-white px-1.5 py-0.5 text-[8px] font-bold text-center">
              UNIQUE FRAMES
            </div>
            <div className="p-1 h-[120px]">
              <canvas ref={uniqueFramesChartRef}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/90"
          onClick={() => setModalOpen(false)}
          tabIndex={0}
        >
          <button
            onClick={() => setModalOpen(false)}
            className="absolute top-4 right-6 text-white text-3xl font-bold cursor-pointer z-[1001] hover:text-gray-300"
          >
            ×
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(!showHelp);
            }}
            className="absolute top-4 left-6 text-white text-xl font-bold cursor-pointer z-[1001] hover:text-gray-300 bg-white/10 w-8 h-8 rounded-full flex items-center justify-center"
            title="Keyboard Shortcuts (press ?)"
          >
            ?
          </button>

          <div
            className="flex flex-col items-center justify-center h-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-[96%] mb-3 px-3 py-2 bg-white/10 rounded">
              <div className="flex gap-1.5 items-center">
                <button
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                    activeTab === "allFrames"
                      ? "bg-white/90 text-[#2c3e50]"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  onClick={() => setActiveTab("allFrames")}
                >
                  All Frames
                </button>
                <button
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                    activeTab === "uniqueFrames"
                      ? "bg-white/90 text-[#2c3e50]"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  onClick={() => setActiveTab("uniqueFrames")}
                >
                  Unique Frames
                </button>
                <div className="flex gap-3 ml-6 text-white text-[10px] font-bold">
                  <span className="bg-black/50 px-3 py-1 rounded">
                    Zoom: {zoomLevel}
                  </span>
                  <span className="bg-black/50 px-3 py-1 rounded">
                    {visibleRange}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 text-white text-[10px] font-bold">
                <button
                  className="bg-white/20 border border-white/30 px-2.5 py-1 rounded hover:bg-white/35 transition-all"
                  onClick={zoomIn}
                  title="Zoom In (+)"
                >
                  +
                </button>
                <button
                  className="bg-white/20 border border-white/30 px-2.5 py-1 rounded hover:bg-white/35 transition-all"
                  onClick={zoomOut}
                  title="Zoom Out (-)"
                >
                  -
                </button>
                <button
                  className="bg-white/20 border border-white/30 px-2.5 py-1 rounded hover:bg-white/35 transition-all"
                  onClick={resetZoom}
                  title="Reset Zoom (0/r)"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 w-[96%] h-[72vh]">
              <canvas ref={modalChartRef}></canvas>
            </div>
            <div className="flex gap-5 mt-4 text-white text-[10px]">
              <div className="bg-black/70 px-3 py-1.5 rounded">
                <span className="text-gray-400 mr-1">Total Frames:</span>
                <span className="font-bold">
                  {currentData.metadata.totalFrames}
                </span>
              </div>
              <div className="bg-black/70 px-3 py-1.5 rounded">
                <span className="text-gray-400 mr-1">Avg Diff:</span>
                <span className="font-bold">
                  {(currentData.metadata.avgDiff * 100).toFixed(2)}%
                </span>
              </div>
              <div className="bg-black/70 px-3 py-1.5 rounded">
                <span className="text-gray-400 mr-1">Max Diff:</span>
                <span className="font-bold">
                  {(currentData.metadata.maxDiff * 100).toFixed(2)}%
                </span>
              </div>
              <div className="bg-black/70 px-3 py-1.5 rounded">
                <span className="text-gray-400 mr-1">Min Diff:</span>
                <span className="font-bold">
                  {(currentData.metadata.minDiff * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Help Overlay */}
          {showHelp && (
            <div
              className="absolute inset-0 bg-black/85 z-[1002] flex items-center justify-center"
              onClick={() => setShowHelp(false)}
            >
              <div
                className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 max-w-[600px] max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">
                  Keyboard Shortcuts
                </div>

                <div className="mb-5">
                  <div className="text-sm font-bold text-blue-400 mb-2">
                    Navigation (Vim-style)
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        h
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Pan left
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        l
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Pan right
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        Home
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Jump to start
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        End
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Jump to end
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-sm font-bold text-blue-400 mb-2">
                    Zoom
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        k or +
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">Zoom in</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        j or -
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Zoom out
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        0 or r
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Reset zoom
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        Scroll
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Zoom in/out
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-sm font-bold text-blue-400 mb-2">
                    Mouse Controls
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        Drag
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Pan graph
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        Shift+Scroll
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Pan left/right
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold text-blue-400 mb-2">
                    Other
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        ←/→
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Switch tabs
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        Esc
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Close modal
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="bg-gray-800 px-2 py-1 rounded font-mono text-blue-400 min-w-[80px] text-center">
                        ?
                      </span>
                      <span className="text-gray-300 flex-1 ml-3">
                        Toggle help
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
                  Press ? or Esc to close • Click outside to dismiss
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

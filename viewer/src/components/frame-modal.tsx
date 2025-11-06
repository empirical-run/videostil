import { useEffect, useRef, useState } from "react";
import type { Frame } from "../types";
import { formatSecondsToTimestamp } from "../utils";

interface FrameModalProps {
  frames: Frame[];
  initialIndex: number;
  similarities: Map<number, number>;
  allFramesDiff: Map<number, number>;
  onClose: () => void;
  activeTab?: 'unique' | 'all';
}

export default function FrameModal({
  frames,
  initialIndex,
  similarities,
  allFramesDiff,
  onClose,
  activeTab,
}: FrameModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dimensions, setDimensions] = useState<string>("Loading...");
  const filmstripRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLImageElement | null)[]>([]);

  const currentFrame = frames[currentIndex];

  // Scroll active frame into view when currentIndex changes
  useEffect(() => {
    const activeFrame = frameRefs.current[currentIndex];
    if (activeFrame && filmstripRef.current) {
      const filmstrip = filmstripRef.current;
      const frameRect = activeFrame.getBoundingClientRect();
      const filmstripRect = filmstrip.getBoundingClientRect();

      // Calculate the center position
      const frameCenterX = frameRect.left + frameRect.width / 2;
      const filmstripCenterX = filmstripRect.left + filmstripRect.width / 2;
      const scrollOffset = frameCenterX - filmstripCenterX;

      // Smooth scroll to center the active frame
      filmstrip.scrollBy({
        left: scrollOffset,
        behavior: "smooth",
      });
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          navigatePrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          navigateNext();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, frames.length, onClose]);

  const navigatePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + frames.length) % frames.length);
  };

  const navigateNext = () => {
    setCurrentIndex((prev) => (prev + 1) % frames.length);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions(`${img.naturalWidth} × ${img.naturalHeight}`);
  };

  const frameSize = currentFrame.size
    ? (currentFrame.size / 1024).toFixed(1)
    : "Loading...";
  const similarity = similarities.get(currentIndex);
  const videoDiff = allFramesDiff.get(currentFrame.index);

  const prevFrame = currentIndex > 0 ? frames[currentIndex - 1] : null;
  const frameGap = prevFrame ? currentFrame.index - prevFrame.index : 0;

  const similarityPercentage =
    currentIndex === 0
      ? "First"
      : similarity !== undefined
        ? `${(similarity * 100).toFixed(1)}%`
        : "Loading...";

  const videoDiffPercentage =
    videoDiff !== undefined && videoDiff !== null
      ? `${(videoDiff * 100).toFixed(1)}%`
      : "N/A";

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90"
      onClick={onClose}
      tabIndex={0}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-6 text-white text-3xl font-bold cursor-pointer z-[1001] hover:text-gray-300"
      >
        ×
      </button>

      {/* Info Panel */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/90 text-white px-6 py-4 rounded-lg z-[1001] text-center backdrop-blur-sm max-w-[700px] shadow-2xl">
        <div className="text-[13px] mb-1.5 text-white">
          Frame {currentIndex + 1} of {frames.length}
        </div>
        <div className={`grid ${activeTab === 'all' ? 'grid-cols-2' : 'grid-cols-3'} gap-x-4 gap-y-2 text-[10px] text-gray-200`}>
          <div className="text-left">
            <span className="text-gray-400">T:</span>{" "}
            <span className="text-white">
              {formatSecondsToTimestamp(parseFloat(currentFrame.timestamp)) ||
                "N/A"}
            </span>
          </div>
          {activeTab === 'unique' && (
            <div className="text-left">
              <span className="text-purple-400">D-Uniq:</span>{" "}
              <span className="text-purple-300">{similarityPercentage}</span>
            </div>
          )}
          <div className="text-left">
            <span className="text-blue-400">D-Video:</span>{" "}
            <span className="text-blue-300">{videoDiffPercentage}</span>
          </div>
          {activeTab === 'unique' && frameGap > 1 && (
            <div className="text-left col-span-3">
              <span className="text-orange-400">Gap:</span>{" "}
              <span className="text-orange-300">
                +{frameGap - 1} frames skipped (last unique was frame{" "}
                {prevFrame?.index})
              </span>
            </div>
          )}
          <div className="text-left">
            <span className="text-gray-400">Size:</span>{" "}
            <span className="text-white">{frameSize} KB</span>
          </div>
          <div className={`text-left ${activeTab === 'all' ? 'col-span-2' : 'col-span-2'}`}>
            <span className="text-gray-400">Dimensions:</span>{" "}
            <span className="text-white">{dimensions}</span>
          </div>
          <div className={`text-left ${activeTab === 'all' ? 'col-span-2' : 'col-span-3'}`}>
            <span className="text-gray-400">File:</span>{" "}
            <span className="text-white text-[9px]">
              {currentFrame.fileName}
            </span>
          </div>
        </div>
        {currentFrame.description && (
          <div className="mt-2 pt-2 border-t border-gray-700 text-[9px] text-gray-300 text-left max-h-[60px] overflow-y-auto">
            {currentFrame.description}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigatePrev();
        }}
        className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/75 border-0 rounded-full w-10 h-10 cursor-pointer text-lg font-bold text-black flex items-center justify-center z-[1001]"
      >
        ‹
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigateNext();
        }}
        className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/75 border-0 rounded-full w-10 h-10 cursor-pointer text-lg font-bold text-black flex items-center justify-center z-[1001]"
      >
        ›
      </button>

      {/* Main Image */}
      <div
        className="flex items-center justify-center h-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentFrame.url}
          alt={`Frame ${currentIndex + 1}`}
          className="max-w-[90%] max-h-[70%] object-contain"
          onLoad={handleImageLoad}
          onError={() => setDimensions("N/A")}
        />
      </div>

      {/* Filmstrip */}
      <div
        ref={filmstripRef}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1 bg-black/70 p-2 rounded-lg max-w-[80%] overflow-x-auto z-[1001] scroll-smooth"
      >
        {frames.map((frame, index) => (
          <img
            key={frame.fileName}
            ref={(el) => (frameRefs.current[index] = el)}
            src={frame.url}
            alt={`Frame ${index + 1}`}
            className={`
              w-[60px] h-[34px] border-2 rounded cursor-pointer object-cover opacity-60 transition-all flex-shrink-0
              ${
                index === currentIndex
                  ? "border-blue-500 opacity-100 scale-110"
                  : "border-transparent hover:opacity-80"
              }
            `}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
          />
        ))}
      </div>
    </div>
  );
}

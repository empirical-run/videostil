import { useEffect, useRef, useState } from 'react';
import type { Frame, VideoChapter } from '../types';
import { fetchChapters, createChapter, updateChapter, deleteChapter } from '../lib/api';

interface FrameModalProps {
  frames: Frame[];
  initialIndex: number;
  similarities: Map<number, number>;
  allFramesDiff: Map<number, number>;
  onClose: () => void;
  activeTab?: 'unique' | 'all';
  analysisId?: string;
  fps?: number;
}

export default function FrameModal({ frames, initialIndex, similarities, allFramesDiff, onClose, activeTab = 'unique', analysisId = '', fps = 25 }: FrameModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dimensions, setDimensions] = useState<string>('Loading...');
  const filmstripRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLImageElement | null)[]>([]);

  // Chapter state
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [markedStart, setMarkedStart] = useState<number | null>(null);
  const [markedEnd, setMarkedEnd] = useState<number | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [editingChapter, setEditingChapter] = useState<VideoChapter | null>(null);

  const currentFrame = frames[currentIndex];

  // Load chapters when modal opens (only for All Frames tab)
  useEffect(() => {
    if (activeTab === 'all' && analysisId) {
      loadChapters();
    }
  }, [activeTab, analysisId]);

  const loadChapters = async () => {
    try {
      const data = await fetchChapters(analysisId);
      setChapters(data.chapters);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  };

  const getCurrentFrameTime = (frameIndex: number): number => {
    return frames[frameIndex].index / fps;
  };

  const getCurrentChapter = (): VideoChapter | null => {
    const currentTime = getCurrentFrameTime(currentIndex);
    return chapters.find(
      ch => currentTime >= ch.startTime && currentTime <= ch.endTime
    ) || null;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const markAsStart = () => {
    const time = getCurrentFrameTime(currentIndex);
    setMarkedStart(time);
  };

  const markAsEnd = () => {
    const time = getCurrentFrameTime(currentIndex);
    setMarkedEnd(time);
  };

  const clearMarks = () => {
    setMarkedStart(null);
    setMarkedEnd(null);
    setChapterTitle('');
  };

  const handleCreateChapter = async () => {
    if (!chapterTitle.trim() || markedStart === null || markedEnd === null) {
      return;
    }

    const newChapter: VideoChapter = {
      id: crypto.randomUUID(),
      startTime: markedStart,
      endTime: markedEnd,
      title: chapterTitle.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await createChapter(analysisId, newChapter);
      await loadChapters();
      clearMarks();
    } catch (error) {
      console.error('Error creating chapter:', error);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      await deleteChapter(analysisId, chapterId);
      await loadChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
    }
  };

  const currentChapter = getCurrentChapter();

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
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const frameSize = currentFrame.size ? (currentFrame.size / 1024).toFixed(1) : 'Loading...';
  const similarity = similarities.get(currentIndex);
  const videoDiff = allFramesDiff.get(currentFrame.index);

  const prevFrame = currentIndex > 0 ? frames[currentIndex - 1] : null;
  const frameGap = prevFrame ? currentFrame.index - prevFrame.index : 0;

  const similarityPercentage =
    currentIndex === 0
      ? 'First'
      : similarity !== undefined
        ? `${(similarity * 100).toFixed(1)}%`
        : 'Loading...';

  const videoDiffPercentage = videoDiff !== undefined && videoDiff !== null
    ? `${(videoDiff * 100).toFixed(1)}%`
    : 'N/A';

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
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-[10px] text-gray-200">
          <div className="text-left">
            <span className="text-gray-400">T:</span>{' '}
            <span className="text-white">{currentFrame.timestamp || 'N/A'}</span>
          </div>
          <div className="text-left">
            <span className="text-purple-400">D-Uniq:</span>{' '}
            <span className="text-purple-300">{similarityPercentage}</span>
          </div>
          <div className="text-left">
            <span className="text-blue-400">D-Video:</span>{' '}
            <span className="text-blue-300">{videoDiffPercentage}</span>
          </div>
          {frameGap > 1 && (
            <div className="text-left col-span-3">
              <span className="text-orange-400">Gap:</span>{' '}
              <span className="text-orange-300">+{frameGap - 1} frames skipped (last unique was frame {prevFrame?.index})</span>
            </div>
          )}
          <div className="text-left">
            <span className="text-gray-400">Size:</span>{' '}
            <span className="text-white">{frameSize} KB</span>
          </div>
          <div className="text-left col-span-2">
            <span className="text-gray-400">Dimensions:</span>{' '}
            <span className="text-white">{dimensions}</span>
          </div>
          <div className="text-left col-span-3">
            <span className="text-gray-400">File:</span>{' '}
            <span className="text-white text-[9px]">{currentFrame.fileName}</span>
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
          onError={() => setDimensions('N/A')}
        />
      </div>

      {/* Chapter UI - Only show in All Frames tab */}
      {activeTab === 'all' && (
        <div className="absolute top-1/2 right-6 -translate-y-1/2 bg-black/80 text-white p-4 rounded-lg z-[1001] max-w-[300px] max-h-[80vh] overflow-y-auto backdrop-blur-sm">
          <h3 className="text-[12px] font-bold mb-3 border-b border-gray-600 pb-2">📖 Chapters</h3>

          {/* Current Chapter Display */}
          {currentChapter && (
            <div className="mb-3 p-2 bg-blue-900/30 rounded border border-blue-700 text-[10px]">
              <div className="text-blue-300 font-semibold">{currentChapter.title}</div>
              <div className="text-gray-400 text-[9px]">
                {formatTime(currentChapter.startTime)} - {formatTime(currentChapter.endTime)}
              </div>
            </div>
          )}

          {/* Mark Timestamps Panel */}
          <div className="mb-3 p-2 bg-gray-900/50 rounded border border-gray-700">
            <div className="text-[10px] font-semibold mb-2">📍 Mark Timestamps</div>
            <div className="text-[9px] text-gray-400 mb-2">
              Current: {formatTime(getCurrentFrameTime(currentIndex))}
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={markAsStart}
                className="flex-1 bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-[9px] font-semibold"
              >
                Mark Start
              </button>
              <button
                onClick={markAsEnd}
                className="flex-1 bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-[9px] font-semibold"
              >
                Mark End
              </button>
            </div>
            {(markedStart !== null || markedEnd !== null) && (
              <div className="text-[9px] bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">Selected Range:</div>
                <div>Start: {markedStart !== null ? formatTime(markedStart) : '—'}</div>
                <div>End: {markedEnd !== null ? formatTime(markedEnd) : '—'}</div>
                <button
                  onClick={clearMarks}
                  className="mt-2 w-full bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-[9px]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Create Chapter Form */}
          {markedStart !== null && markedEnd !== null && (
            <div className="mb-3 p-2 bg-green-900/30 rounded border border-green-700">
              <div className="text-[10px] font-semibold mb-2">➕ Create Chapter</div>
              <input
                type="text"
                placeholder="Chapter title"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                className="w-full bg-gray-800 text-white px-2 py-1 rounded text-[9px] mb-2 border border-gray-600"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="text-[9px] text-gray-400 mb-2">
                Range: {formatTime(markedStart)} - {formatTime(markedEnd)} ({(markedEnd - markedStart).toFixed(0)}s)
              </div>
              <button
                onClick={handleCreateChapter}
                disabled={!chapterTitle.trim()}
                className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed px-2 py-1 rounded text-[9px] font-semibold"
              >
                Create
              </button>
            </div>
          )}

          {/* Chapter List */}
          <div className="text-[10px]">
            <div className="font-semibold mb-2">📚 All Chapters ({chapters.length})</div>
            {chapters.length === 0 ? (
              <div className="text-gray-500 text-[9px] italic">No chapters yet</div>
            ) : (
              <div className="space-y-2">
                {chapters.map(chapter => (
                  <div key={chapter.id} className="bg-gray-800/50 p-2 rounded border border-gray-700">
                    <div className="text-[9px] font-semibold text-white mb-1">{chapter.title}</div>
                    <div className="text-[8px] text-gray-400 mb-2">
                      {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                    </div>
                    <button
                      onClick={() => handleDeleteChapter(chapter.id)}
                      className="w-full bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-[8px]"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                  ? 'border-blue-500 opacity-100 scale-110'
                  : 'border-transparent hover:opacity-80'
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

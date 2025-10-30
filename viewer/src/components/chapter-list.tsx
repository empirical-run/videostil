import { useEffect, useState } from 'react';
import type { VideoChapter } from '../types';
import { fetchChapters } from '../lib/api';

interface ChapterListProps {
  analysisId: string;
  onChapterClick?: (chapter: VideoChapter) => void;
}

export default function ChapterList({ analysisId, onChapterClick }: ChapterListProps) {
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChapters();
  }, [analysisId]);

  const loadChapters = async () => {
    setLoading(true);
    try {
      const data = await fetchChapters(analysisId);
      setChapters(data.chapters);
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
        <div className="text-[10px] text-gray-500">Loading chapters...</div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
        <div className="text-[10px] text-blue-800">
          📖 No chapters yet. Click on a frame to open the filmstrip and create chapters.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded mb-2">
      <div className="flex justify-between items-center bg-gray-100 px-2 py-1 border-b border-gray-300">
        <h4 className="text-[10px] font-bold text-[#2c3e50]">📚 Video Chapters ({chapters.length})</h4>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[9px] text-blue-600 hover:text-blue-800 font-semibold"
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="p-2 max-h-[200px] overflow-y-auto">
          <div className="space-y-1">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                onClick={() => onChapterClick?.(chapter)}
                className="flex items-start gap-2 p-1.5 bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
              >
                <div className="flex-shrink-0 text-[10px] font-mono text-gray-600 min-w-[80px]">
                  {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                </div>
                <div className="flex-1 text-[10px] text-gray-800">
                  <span className="font-semibold">#{index + 1}:</span> {chapter.title}
                </div>
                <div className="flex-shrink-0 text-[9px] text-gray-500">
                  {(chapter.endTime - chapter.startTime).toFixed(0)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

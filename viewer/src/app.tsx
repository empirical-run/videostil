import { useEffect, useState } from 'react';
import type { AnalysisData, AnalysisInfo, Frame } from './types';
import { fetchAnalyses, fetchAnalysisData, fetchUniqueFrames, fetchAllFrames } from './lib/api';
import AnalysisList from './components/analysis-list';
import FramesGrid from './components/frames-grid';
import ResultsPanel from './components/results-panel';
import FrameModal from './components/frame-modal';
import GraphSection from './components/graph-section';

type FrameTab = 'unique' | 'all';

function App() {
  const [analyses, setAnalyses] = useState<AnalysisInfo[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [frameSimilarities, setFrameSimilarities] = useState<Map<number, number>>(new Map());
  const [allFramesDiff, setAllFramesDiff] = useState<Map<number, number>>(new Map());
  const [activeTab, setActiveTab] = useState<FrameTab>('unique');
  const [allFrames, setAllFrames] = useState<Frame[]>([]);

  // Load analyses on mount and check URL for analysis ID
  useEffect(() => {
    loadAnalyses();
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const analysisIdFromUrl = urlParams.get('id');

      if (analysisIdFromUrl && analysisIdFromUrl !== currentAnalysisId) {
        loadAnalysis(analysisIdFromUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentAnalysisId]);

  async function loadAnalyses() {
    try {
      const data = await fetchAnalyses();
      setAnalyses(data);

      // Check URL for analysis ID
      const urlParams = new URLSearchParams(window.location.search);
      const analysisIdFromUrl = urlParams.get('id');

      if (analysisIdFromUrl) {
        // Load analysis from URL if it exists
        const analysisExists = data.some(a => a.id === analysisIdFromUrl);
        if (analysisExists && !currentAnalysisId) {
          loadAnalysis(analysisIdFromUrl);
        }
      } else if (data.length > 0 && !currentAnalysisId) {
        // Auto-load first analysis if no URL param
        loadAnalysis(data[0].id);
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  }

  async function loadAnalysis(id: string) {
    setLoading(true);
    setCurrentAnalysisId(id);
    // Clear stale data when switching analyses
    setFrameSimilarities(new Map());
    setSelectedFrameIndex(null);

    // Update URL with analysis ID
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    window.history.pushState({}, '', url.toString());

    try {
      const data = await fetchAnalysisData(id);

      // Try to get local frames
      try {
        const localFrames = await fetchUniqueFrames();
        if (localFrames && localFrames.length > 0) {
          data.unique_frames = localFrames;
        }
      } catch {
        // Use frames from analysis data
      }

      // Try to get all frames
      try {
        const allFramesData = await fetchAllFrames();
        if (allFramesData && allFramesData.length > 0) {
          setAllFrames(allFramesData);
        }
      } catch {
        console.log('All frames not available');
      }

      setAnalysisData(data);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  }

  console.log("analysisData --> ", analysisData)

  return (
    <div className="flex flex-col lg:flex-row h-screen gap-0.5 bg-gray-100 overflow-hidden">
      {/* Left Panel - Analyses List */}
      <div className="w-full lg:w-48 xl:w-56 bg-white border border-gray-300 flex flex-col max-h-[30vh] lg:max-h-full">
        <div className="bg-[#2c3e50] text-white px-2 py-1 text-[10px] font-bold uppercase border-b border-gray-300">
          Video Analysis
        </div>
        <AnalysisList
          analyses={analyses}
          currentAnalysisId={currentAnalysisId}
          onSelectAnalysis={loadAnalysis}
        />
      </div>

      {/* Middle Panel - Frames */}
      <div className="flex-1 bg-white border border-gray-300 flex flex-col min-w-0">
        <div className="bg-[#2c3e50] text-white px-2 py-1 text-[10px] font-bold uppercase border-b border-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="hidden lg:inline">Total Unique Frames: {analysisData?.unique_frames?.length || 0} | Size:{' '}
          {analysisData?.unique_frames
            ? (
                analysisData.unique_frames.reduce((sum, f) => sum + (f.size || 0), 0) /
                (1024 * 1024)
              ).toFixed(2)
            : 0}{' '}
          MB | Max 100 frames or 32 MB of payload is allowed whichever is smaller (LLM LIMIT)</span>
          <span className="lg:hidden">Frames: {analysisData?.unique_frames?.length || 0} | {analysisData?.unique_frames
            ? (
                analysisData.unique_frames.reduce((sum, f) => sum + (f.size || 0), 0) /
                (1024 * 1024)
              ).toFixed(2)
            : 0} MB</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-300 bg-gray-50">
          <button
            onClick={() => setActiveTab('unique')}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              activeTab === 'unique'
                ? 'bg-white text-[#2c3e50] border-b-2 border-[#2c3e50]'
                : 'text-gray-600 hover:text-[#2c3e50]'
            }`}
          >
            Unique Frames ({analysisData?.unique_frames?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-[#2c3e50] border-b-2 border-[#2c3e50]'
                : 'text-gray-600 hover:text-[#2c3e50]'
            }`}
          >
            All Frames ({allFrames.length || 0})
          </button>
        </div>

        {analysisData && currentAnalysisId && !loading && activeTab === 'unique' && (
          <GraphSection key={currentAnalysisId} analysisId={currentAnalysisId} />
        )}

        <FramesGrid
          frames={activeTab === 'unique' ? (analysisData?.unique_frames || []) : allFrames}
          loading={loading}
          onFrameClick={(index, similarities, allFramesDiff) => {
            setSelectedFrameIndex(index);
            setFrameSimilarities(similarities);
            setAllFramesDiff(allFramesDiff);
          }}
        />
      </div>

      {/* Right Panel - Results */}
      <div className="w-full lg:w-80 xl:w-96 2xl:w-[500px] bg-white border border-gray-300 flex flex-col max-h-[40vh] lg:max-h-full">
        <div className="bg-[#2c3e50] text-white px-2 py-1 text-[10px] font-bold uppercase border-b border-gray-300">
          Final Result
        </div>
        <ResultsPanel analysisData={analysisData} />
      </div>

      {/* Frame Modal */}
      {selectedFrameIndex !== null && (activeTab === 'unique' ? analysisData?.unique_frames : allFrames) && (
        <FrameModal
          frames={activeTab === 'unique' ? (analysisData?.unique_frames || []) : allFrames}
          initialIndex={selectedFrameIndex}
          similarities={frameSimilarities}
          allFramesDiff={allFramesDiff}
          onClose={() => setSelectedFrameIndex(null)}
          activeTab={activeTab}
          analysisId={currentAnalysisId || ''}
          fps={analysisData?.params?.fps || 25}
        />
      )}
    </div>
  );
}

export default App;

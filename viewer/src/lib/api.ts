import type { AnalysisData, AnalysisInfo, Frame, GraphData } from "../types";

export async function fetchAnalyses(): Promise<AnalysisInfo[]> {
  const response = await fetch("/api/analyses");
  if (!response.ok) {
    throw new Error("Failed to fetch analyses");
  }
  return response.json();
}

export async function fetchAnalysisData(id: string): Promise<AnalysisData> {
  const response = await fetch(`/api/data?id=${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch analysis data");
  }
  return response.json();
}

export async function fetchUniqueFrames(): Promise<Frame[]> {
  const response = await fetch("/api/unique-frames");
  if (!response.ok) {
    throw new Error("Failed to fetch unique frames");
  }
  return response.json();
}

export async function fetchAllFrames(): Promise<Frame[]> {
  const response = await fetch("/api/all-frames");
  if (!response.ok) {
    throw new Error("Failed to fetch all frames");
  }
  return response.json();
}

export async function fetchSimilarity(
  frame1: string,
  frame2: string,
): Promise<number> {
  const response = await fetch(
    `/api/similarity?frame1=${encodeURIComponent(frame1)}&frame2=${encodeURIComponent(frame2)}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch similarity");
  }
  const data = await response.json();
  return data.similarity;
}

export async function fetchGraphData(): Promise<GraphData> {
  const response = await fetch("/api/frame-diff-data");
  if (!response.ok) {
    throw new Error("Failed to fetch graph data");
  }
  return response.json();
}

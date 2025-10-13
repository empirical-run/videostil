import { promises as fs } from "node:fs";
import path from "node:path";

export interface VideoAnalysisSection {
  key_frame: string;
  description: string;
}

export interface ProcessedAnalysis {
  parsedSections: VideoAnalysisSection[];
  keyFrameImagesMap: Map<string, { type: "image/png"; base64Data: string }>;
}

export function parseXmlSummaryToJson(
  xmlContent: string,
): VideoAnalysisSection[] {
  const sections: VideoAnalysisSection[] = [];

  try {
    // Find the summary block first to limit parsing scope
    const summaryMatch = xmlContent.match(/<summary>([\s\S]*?)<\/summary>/);
    if (!summaryMatch) {
      return sections;
    }

    const summaryContent = summaryMatch[1];
    if (!summaryContent) {
      return sections;
    }

    // Extract all section blocks using matchAll to avoid infinite loop
    const sectionMatches = Array.from(
      summaryContent.matchAll(/<section>([\s\S]*?)<\/section>/g) || [],
    );

    for (const sectionMatch of sectionMatches) {
      const sectionContent = sectionMatch?.[1];
      if (!sectionContent) continue;

      const keyFrameMatch = sectionContent.match(
        /<key_frame>(.*?)<\/key_frame>/,
      );
      const descriptionMatch = sectionContent.match(
        /<description>(.*?)<\/description>/,
      );

      if (keyFrameMatch?.[1] && descriptionMatch?.[1]) {
        sections.push({
          key_frame: keyFrameMatch[1].trim(),
          description: descriptionMatch[1].trim(),
        });
      }
    }
  } catch (error) {
    // Return empty array on error
  }

  return sections;
}

function extractKeyFramesFromAnalysis(
  analysisData: VideoAnalysisSection[],
): string[] {
  const keyFrames: string[] = [];

  if (analysisData && Array.isArray(analysisData)) {
    for (const section of analysisData) {
      if (section.key_frame && typeof section.key_frame === "string") {
        keyFrames.push(section.key_frame);
      }
    }
  }

  return keyFrames;
}

async function fileExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

async function findFramePath(
  frameId: string,
  baseDir: string,
): Promise<string | null> {
  const uniqueFramePath = path.join(baseDir, "unique_frames", `${frameId}.png`);
  const consolidatedFramePath = path.join(baseDir, "frames", `${frameId}.png`);

  if (await fileExists(uniqueFramePath)) {
    return uniqueFramePath;
  }
  if (await fileExists(consolidatedFramePath)) {
    return consolidatedFramePath;
  }

  return null;
}

async function loadFrameImage(
  framePath: string,
): Promise<{ type: "image/png"; base64Data: string }> {
  const imageBuffer = await fs.readFile(framePath);
  const base64Data = imageBuffer.toString("base64");
  return {
    type: "image/png" as const,
    base64Data: base64Data,
  };
}

async function loadSingleFrame(
  frameId: string,
  extractionArtifactsDir: string,
) {
  try {
    const framePath = await findFramePath(frameId, extractionArtifactsDir);
    if (!framePath) {
      return null;
    }

    const imageData = await loadFrameImage(framePath);
    return {
      frameId: frameId,
      imageData,
    };
  } catch (error) {
    return null;
  }
}

export async function loadKeyFrameImages(
  keyFrames: string[],
  extractionArtifactsDir: string,
): Promise<Map<string, { type: "image/png"; base64Data: string }>> {
  const frameImageParts = await Promise.all(
    keyFrames.map((frameId) =>
      loadSingleFrame(frameId, extractionArtifactsDir),
    ),
  );

  const frameImageMap = new Map<
    string,
    { type: "image/png"; base64Data: string }
  >();
  for (const part of frameImageParts) {
    if (part !== null) {
      frameImageMap.set(part.frameId, part.imageData);
    }
  }

  return frameImageMap;
}

export async function processAnalysisAndLoadFrames(
  rawAnalysis: string,
  artifactsPath: string,
): Promise<ProcessedAnalysis> {
  const parsedSections = parseXmlSummaryToJson(rawAnalysis);

  const keyFrames = extractKeyFramesFromAnalysis(parsedSections);

  let keyFrameImagesMap: Map<
    string,
    { type: "image/png"; base64Data: string }
  > = new Map();

  if (keyFrames.length > 0) {
    try {
      keyFrameImagesMap = await loadKeyFrameImages(keyFrames, artifactsPath);
    } catch (error) {
      // Ignore errors loading key frames
    }
  }

  return { parsedSections, keyFrameImagesMap };
}

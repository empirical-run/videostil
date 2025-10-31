import crypto from "node:crypto";

export function formatSecondsToTimestamp(seconds: number | undefined): string {
  if (seconds === undefined) return "N/A";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formateTimestampToSeconds(timestamp: string): number {
  try {
    const parts = timestamp.split(':').map((value) => parseFloat(value));
    
    if (parts.length === 1) {
      // Just seconds: "30" or "30.5"
      return parts[0] ?? 0;
    } else if (parts.length === 2) {
      // MM:SS format: "1:30" or "1:30.5"
      const [minutes, seconds] = parts;
      return (minutes ?? 0) * 60 + (seconds ?? 0);
    } else if (parts.length === 3) {
      // HH:MM:SS format: "1:30:45" or "1:30:45.5"
      const [hours, minutes, seconds] = parts;
      return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
    }
    
    throw new Error(`Invalid timestamp format: ${timestamp}. Expected format: SS, MM:SS, or HH:MM:SS`);
  } catch (error) {
    throw new Error(`Invalid timestamp format: ${timestamp}. Expected format: SS, MM:SS, or HH:MM:SS`);
  }
}

export function createHashBasedOnParams(
  mainStringToHash: string,
  additionalParams: Record<string, any>,
): string {
  const sortedParams = Object.keys(additionalParams)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = additionalParams[key as keyof typeof additionalParams];
        return acc;
      },
      {} as Record<string, any>,
    );
  const json = JSON.stringify({
    mainStringTohash: mainStringToHash,
    ...sortedParams,
  });
  return crypto
    .createHash("sha256")
    .update(json)
    .digest("hex")
    .substring(0, 16);
}


export interface VideoAnalysisSection {
  key_frame: string;
  description: string;
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

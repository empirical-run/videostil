import crypto from "node:crypto";

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

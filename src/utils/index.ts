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

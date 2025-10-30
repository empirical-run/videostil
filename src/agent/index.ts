import { createChatModel } from "@empiricalrun/llm/chat";
import type {
  Attachment,
  SupportedChatModels,
  CanonicalMessage,
} from "./types";
import { VIDEO_ANALYSIS_SYSTEM_PROMPT } from "./constants";
import { parseXmlSummaryToJson, VideoAnalysisSection } from "../utils";
import { requireApiKeys, type ApiKeysConfig } from "../utils/api-keys";

async function getFrameAnalysisFromLLM({
  selectedModel,
  systemPrompt,
  frameBatch,
  initialPrompt = "Analyse the frames and give me a summary at the end.",
  apiKeys,
}: {
  selectedModel: SupportedChatModels;
  systemPrompt: string;
  frameBatch: Attachment[];
  initialPrompt?: string;
  apiKeys: ApiKeysConfig;
}): Promise<{
  analysis: string;
  allMessages: CanonicalMessage[];
}> {
  const chatModel = createChatModel(
    [],
    selectedModel,
    apiKeys as Record<string, string>,
  );

  const parts = [
    { text: initialPrompt },
    ...frameBatch.map((attachment) => ({
      text: `Frame ID: ${attachment.name.split(".")[0]}`,
      attachments: [attachment],
    })),
  ];

  chatModel.pushUserPartsMessage(parts);

  const response = await chatModel.getLLMResponse({
    systemPrompt,
    tools: { custom: [] },
    hasThinkingEnabled: false,
  });

  if (!response) {
    throw new Error("Failed to get response from LLM");
  }

  chatModel.pushMessage(response);

  const allMessages = chatModel.messages as CanonicalMessage[];
  const lastMessage = allMessages[allMessages.length - 1];

  if (!lastMessage) {
    throw new Error(
      "Could not extract text response from accumulated messages",
    );
  }

  const textParts = lastMessage.parts.filter(
    (p): p is { text: string } => "text" in p && !("thinking" in p),
  );
  const analysis = textParts.map((p) => p.text).join("\n");

  if (!analysis) {
    throw new Error(
      "Could not extract text response from accumulated messages",
    );
  }

  return {
    analysis,
    allMessages,
  };
}

export interface AnalyseFramesResult {
  analysis: string;
  allMessages: CanonicalMessage[];
  parsedXml: VideoAnalysisSection[];
}

export async function analyseFrames({
  selectedModel,
  frameBatch,
  systemPrompt,
  initialUserPrompt,
  apiKeys,
}: {
  selectedModel: SupportedChatModels;
  frameBatch: Attachment[];
  systemPrompt?: string;
  initialUserPrompt?: string;
  apiKeys?: ApiKeysConfig;
}): Promise<AnalyseFramesResult> {
  requireApiKeys(apiKeys);

  const { analysis: rawAnalysis, allMessages } = await getFrameAnalysisFromLLM({
    selectedModel,
    systemPrompt: systemPrompt ? systemPrompt : VIDEO_ANALYSIS_SYSTEM_PROMPT,
    frameBatch,
    initialPrompt: initialUserPrompt
      ? initialUserPrompt
      : "Analyse the frames and give me a summary at the end.",
    apiKeys: apiKeys!,
  });

  const parsedSections = parseXmlSummaryToJson(rawAnalysis);

  return {
    analysis: rawAnalysis,
    allMessages,
    parsedXml: parsedSections,
  };
}

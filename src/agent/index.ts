import { createChatModel } from "@empiricalrun/llm/chat";
import type {
  Attachment,
  SupportedChatModels,
  CanonicalMessage,
} from "./types";
import { VIDEO_ANALYSIS_SYSTEM_PROMPT } from "./constants";
import { processAnalysisAndLoadFrames, VideoAnalysisSection } from "./parser";

async function getFrameAnalysisFromLLM({
  selectedModel,
  systemPrompt,
  frameBatch,
  initialPrompt = "Analyse the frames and give me a summary at the end.",
}: {
  selectedModel: SupportedChatModels;
  systemPrompt: string;
  frameBatch: Attachment[];
  initialPrompt?: string;
}): Promise<{
  analysis: string;
  allMessages: CanonicalMessage[];
}> {
  const chatModel = createChatModel(
    [],
    selectedModel,
    process.env as Record<string, string>,
  );

  // Push user message with initial prompt
  chatModel.pushUserMessage(initialPrompt, []);

  // Add frame parts to the message (each frame gets its own part)
  const messages = chatModel.messages;
  if (messages.length > 0 && messages[0]) {
    const userMessage = messages[0];
    userMessage.parts = [
      ...userMessage.parts,
      ...frameBatch.map((attachment) => ({
        text: `Frame ID: ${attachment.name.split(".")[0]}`,
        attachments: [attachment],
      })),
    ];
  }

  // Get LLM response
  const response = await chatModel.getLLMResponse({
    systemPrompt,
    tools: { custom: [] },
    hasThinkingEnabled: false,
  });

  if (!response) {
    throw new Error("Failed to get response from LLM");
  }

  chatModel.pushMessage(response);

  // Extract text from last message
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
  keyFrameImagesMap: Map<string, { type: "image/png"; base64Data: string }>;
}

export async function analyseFrames({
  selectedModel,
  workingDirectory,
  frameBatch,
  systemPrompt,
  initialUserPrompt,
}: {
  selectedModel: SupportedChatModels;
  workingDirectory: string;
  frameBatch: Attachment[];
  systemPrompt: string;
  initialUserPrompt: string;
}): Promise<AnalyseFramesResult> {
  const { analysis: rawAnalysis, allMessages } = await getFrameAnalysisFromLLM({
    selectedModel,
    systemPrompt: systemPrompt ? systemPrompt : VIDEO_ANALYSIS_SYSTEM_PROMPT,
    frameBatch,
    initialPrompt: initialUserPrompt
      ? initialUserPrompt
      : "Analyse the frames and give me a summary at the end.",
  });

  const { parsedSections, keyFrameImagesMap } =
    await processAnalysisAndLoadFrames(rawAnalysis, workingDirectory);

  return {
    analysis: rawAnalysis,
    allMessages,
    parsedXml: parsedSections,
    keyFrameImagesMap,
  };
}

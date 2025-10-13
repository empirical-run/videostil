// Types copied from @empiricalrun/shared-types for compatibility
// (Cannot add as dependency due to proprietary code)

export type SupportedChatModels =
	| "gemini-2.5-pro"
	| "gemini-2.5-flash"
	| "o4-mini-2025-04-16"
	| "o3-2025-04-16"
	| "gpt-5-2025-08-07"
	| "gpt-5-codex"
	| "claude-sonnet-4-20250514"
	| "claude-sonnet-4-5-20250929"
	| "claude-opus-4-20250514"
	| "claude-3-5-haiku-20241022"
	| "mock-claude"
	| "mock-claude-tool-call";

export type Usage = {
	tokens: { input: number; output: number };
	cost: { input: number; output: number };
};

export type AttachmentWithURL = {
	name: string;
	contentType: string;
	url: string;
};

export type AttachmentWithBase64Data = {
	name: string;
	contentType: string;
	base64Data: string;
};

export type Attachment = AttachmentWithURL | AttachmentWithBase64Data;

export type MessageCheckpoint = {
	commit: string;
};

export type TextMessagePart = {
	text: string;
};

export type ThinkingMessagePart = {
	text: string;
	thinking: true;
	signature: string;
};

export type TextMessageWithAttachmentsPart = {
	text: string;
	attachments: Attachment[];
};

export type PendingToolCall = {
	id: string;
	name: string;
	input: Record<string, unknown>;
};

export type ToolCallMessagePart = {
	toolCallId: string;
	toolName: string;
	toolCall: PendingToolCall;
};

export type ToolResultTextPart = {
	type: "text";
	text: string;
};

export type ToolResultImageContentType =
	| "image/png"
	| "image/jpeg"
	| "image/gif"
	| "image/webp";

export type ToolResultImageBase64Part = {
	type: ToolResultImageContentType;
	base64Data: string;
};

export type ToolResultImageUrlPart = {
	type: ToolResultImageContentType;
	url: string;
};

export type ToolResultPart =
	| ToolResultTextPart
	| ToolResultImageBase64Part
	| ToolResultImageUrlPart;

export type Artifact = {
	name: string;
	contentType: string;
	url: string;
};

export interface ToolResult {
	isError: boolean;
	result: string | Array<ToolResultPart>;
	artifacts?: Artifact[] | null;
	usage?: Usage;
}

export type ToolResultMessagePart = {
	toolCallId: string;
	toolName: string;
	toolResult: ToolResult;
};

export type CanonicalMessagePart =
	| TextMessagePart
	| TextMessageWithAttachmentsPart
	| ThinkingMessagePart
	| ToolCallMessagePart
	| ToolResultMessagePart;

export type CanonicalMessage = {
	id: number;
	timestamp: string;
	role: "user" | "assistant" | "tool";
	parts: CanonicalMessagePart[];
	checkpoint?: MessageCheckpoint | null;
	usage?: Usage;
};

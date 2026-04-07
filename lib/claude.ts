/**
 * Claude AI integration for Cultivate.
 *
 * This module provides two chat implementations:
 * 1. LEGACY (Direct Anthropic SDK):
 *    - chat()        — non-streaming, returns full response
 *    - chatStream()  — streaming via async iterator
 *    - generateTitle() — cheap Haiku call to auto-name conversations
 *
 * 2. MASTRA (Recommended for Phase 6+):
 *    - mastraStream() — streaming with tool calling support (weather, future: KB search, etc.)
 *
 * The system prompt is assembled from 3 layers:
 * 1. Agent's systemPrompt (set by the agronomist, e.g. "You are a maize farming expert...")
 * 2. Agent's responseStyle (optional, e.g. "concise" or "detailed with examples")
 * 3. Knowledge context from RAG (Phase 3 — relevant document chunks)
 */
import Anthropic from "@anthropic-ai/sdk";
import { buildAgent } from "@/lib/agent-builder";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatInput {
  systemPrompt: string;
  responseStyle: string | null;
  conversationHistory: {
    role: "user" | "assistant";
    content: string;
    attachments?: ChatImageInput[];
  }[];
  userMessage: string;
  userImages?: ChatImageInput[];
  knowledgeContext?: string; // RAG chunks injected here in Phase 3
}

type ChatImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface ChatImageInput {
  fileUrl?: string;
  base64Data?: string;
  mimeType: ChatImageMimeType;
}

export interface ChatResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Build the full system prompt by layering agent config + knowledge context + guardrails.
 *
 * Example output:
 *   "You are a maize farming expert for Ghana...
 *    Response style: concise. Adjust your tone and format accordingly.
 *    <knowledge_context>...relevant chunks...</knowledge_context>
 *    <guardrails>Only answer questions related to farming...</guardrails>"
 */
function buildSystemPrompt(systemPrompt: string, responseStyle: string | null, knowledgeContext?: string): string {
  let prompt = systemPrompt;

  if (responseStyle) {
    prompt += `\n\nResponse style: ${responseStyle}. Adjust your tone and format accordingly.`;
  }

  if (knowledgeContext) {
    prompt += `\n\n<knowledge_context>\n${knowledgeContext}\n</knowledge_context>\n\nUse the above knowledge context to inform your answers. If the context doesn't contain relevant information, say so honestly rather than making things up.`;
  }

  // Guardrails: ensure the agent only answers farming-related questions
  prompt += `\n\n<guardrails>
You are an agricultural assistant. ONLY answer questions related to farming, agriculture, crops, livestock, soil, pests, irrigation, and related topics.

If the user asks about anything unrelated to farming (politics, entertainment, general knowledge, math, coding, etc.), politely decline and redirect them back to farming topics.

Example responses for off-topic questions:
- "I'm here to help with farming and agriculture questions. Could I assist you with something related to your crops or livestock instead?"
- "I don't have expertise in that area, but I'm happy to answer questions about farming practices, crop care, or agricultural challenges."

If you're unsure whether something is farming-related, err on the side of caution and ask the user to clarify how it relates to their farming needs.
</guardrails>`;

  return prompt;
}

function buildMessageContent(
  text: string,
  attachments?: ChatImageInput[]
): string | Anthropic.ContentBlockParam[] {
  const contentBlocks: Anthropic.ContentBlockParam[] = [];

  if (text.trim().length > 0) {
    contentBlocks.push({ type: "text", text });
  }

  for (const attachment of attachments ?? []) {
    if (attachment.base64Data) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: attachment.mimeType as Anthropic.Base64ImageSource["media_type"],
          data: attachment.base64Data,
        },
      });
      continue;
    }

    if (!attachment.fileUrl) continue;

    contentBlocks.push({
      type: "image",
      source: {
        type: "url",
        url: attachment.fileUrl,
      },
    });
  }

  if (contentBlocks.length === 0) {
    return [{ type: "text", text: "[Image attachment unavailable]" }];
  }

  return contentBlocks;
}

function buildAnthropicMessages(input: ChatInput) {
  return [
    ...input.conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: buildMessageContent(msg.content, msg.attachments),
    })),
    {
      role: "user" as const,
      content: buildMessageContent(input.userMessage, input.userImages),
    },
  ];
}

/**
 * Non-streaming chat call. Waits for the full response before returning.
 * Simpler but worse UX (farmer sees a blank screen while waiting).
 * Used for: testing, background tasks, or when streaming isn't needed.
 */
export async function chat(input: ChatInput): Promise<ChatResult> {
  const systemPrompt = buildSystemPrompt(input.systemPrompt, input.responseStyle, input.knowledgeContext);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: buildAnthropicMessages(input),
  });

  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/**
 * Streaming chat call — used in production for live token delivery.
 *
 * Returns an async iterator that yields text chunks as Claude generates them,
 * plus a getUsage() promise that resolves with token counts after the stream ends.
 *
 * Example usage:
 *   const { stream, getUsage } = await chatStream(input);
 *   for await (const chunk of stream) { sendToClient(chunk); }
 *   const { inputTokens, outputTokens } = await getUsage();
 */
export async function chatStream(input: ChatInput): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number }>;
}> {
  const systemPrompt = buildSystemPrompt(input.systemPrompt, input.responseStyle, input.knowledgeContext);

  let inputTokens = 0;
  let outputTokens = 0;
  let resolveUsage: (usage: { inputTokens: number; outputTokens: number }) => void;

  const usagePromise = new Promise<{ inputTokens: number; outputTokens: number }>((resolve) => {
    resolveUsage = resolve;
  });

  const messageStream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: buildAnthropicMessages(input),
  });

  // Async generator that yields each text chunk as Claude produces it.
  // The Anthropic SDK emits many event types (content_block_start, ping, etc.)
  // but we only care about text_delta events — those carry the actual response text.
  const stream = (async function* () {
    for await (const event of messageStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }

    // Token counts are only available after the full stream completes.
    // We resolve the usage promise here so the caller can await it.
    const finalMessage = await messageStream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;
    resolveUsage!({ inputTokens, outputTokens });
  })();

  return {
    stream,
    getUsage: () => usagePromise,
  };
}

/**
 * Generate a short title for a conversation based on the farmer's first message.
 * Uses Haiku (cheapest Claude model) — costs ~$0.001 per title.
 * Falls back to a neutral title if the call fails or returns unusable output.
 */
export async function generateTitle(userMessage: string): Promise<string> {
  const fallbackTitle = "Unclear message";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 40,
      messages: [
        {
          role: "user",
          content: `Generate a concise conversation title from this farmer message.

Rules:
- Output only the title text.
- Use 2 to 10 words.
- No explanation.
- No labels like Title:
- No quotes.
- If the message is just a greeting, return a brief title like Greeting, Random greeting, or Farmer greeting.
- If the message is unclear, meaningless, or too vague to summarize well, return a brief title like Unclear message.

Examples:
- My maize leaves are turning yellow -> Yellow maize leaves
- Best time to plant tomatoes in Accra -> Tomato planting time in Accra
- yo -> Greeting
- yyo -> Unclear message

Farmer message: ${JSON.stringify(userMessage)}`,
        },
      ],
    });

    const title = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!title) return fallbackTitle;

    const normalizedTitle = title.replace(/^Title:\s*/i, "").replace(/^["']|["']$/g, "").trim();
    const lowerTitle = normalizedTitle.toLowerCase();

    if (
      !normalizedTitle ||
      lowerTitle.includes("unable to summarize") ||
      lowerTitle.includes("cannot create a meaningful summary") ||
      lowerTitle.includes("doesn't appear to be") ||
      lowerTitle.includes("does not appear to be") ||
      lowerTitle.startsWith("i cannot") ||
      lowerTitle.startsWith("this message")
    ) {
      return fallbackTitle;
    }

    return normalizedTitle;
  } catch {
    return fallbackTitle;
  }
}

/**
 * MASTRA STREAMING (Phase 6+) — Recommended for tool calling support
 *
 * Uses Mastra Agent with weather tool access. Claude automatically decides when to call tools
 * based on the conversation context (see TOOL-USAGE.md).
 *
 * Returns an async iterator that yields text chunks as Claude generates them,
 * plus a getUsage() promise that resolves with token counts after the stream ends.
 *
 * Example usage:
 *   const { stream, getUsage } = await mastraStream(input);
 *   for await (const chunk of stream) { sendToClient(chunk); }
 *   const { inputTokens, outputTokens } = await getUsage();
 */
export async function mastraStream(
  input: ChatInput & { userLocation?: string; userName?: string }
): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number }>;
}> {
  // Build Mastra agent with weather tool access
  const agent = buildAgent({
    systemPrompt: input.systemPrompt,
    responseStyle: input.responseStyle || undefined,
    knowledgeContext: input.knowledgeContext,
    userContext: {
      location: input.userLocation,
      name: input.userName,
    },
  });

  const normalizeHistoryContent = (content: string) => {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : "[Image attachment unavailable]";
  };

  // Convert conversation history to Mastra ModelMessage format (lowercase roles, string content)
  const contextMessages = input.conversationHistory.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: normalizeHistoryContent(msg.content),
  }));

  let inputTokens = 0;
  let outputTokens = 0;
  let resolveUsage: (usage: { inputTokens: number; outputTokens: number }) => void;

  const usagePromise = new Promise<{ inputTokens: number; outputTokens: number }>((resolve) => {
    resolveUsage = resolve;
  });

  // Use Mastra agent's stream method — pass current user message as string,
  // conversation history as context (ModelMessage[])
  const result = await agent.stream(input.userMessage, {
    context: contextMessages,
  });

  // Async generator that yields text chunks
  const stream = (async function* () {
    for await (const chunk of result.textStream) {
      yield chunk;
    }

    // Get token usage after stream completes
    // Note: Mastra uses AI SDK's usage format
    const usage = await result.usage;
    inputTokens = usage.inputTokens ?? 0;
    outputTokens = usage.outputTokens ?? 0;
    resolveUsage!({ inputTokens, outputTokens });
  })();

  return {
    stream,
    getUsage: () => usagePromise,
  };
}

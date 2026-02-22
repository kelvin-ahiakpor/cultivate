/**
 * Claude AI integration for Cultivate.
 *
 * This module wraps the Anthropic SDK and provides:
 * - chat()        — non-streaming, returns full response (useful for testing/simple cases)
 * - chatStream()  — streaming via async iterator (used in production for live token delivery)
 * - generateTitle() — cheap Haiku call to auto-name conversations
 *
 * The system prompt is assembled from 3 layers:
 * 1. Agent's systemPrompt (set by the agronomist, e.g. "You are a maize farming expert...")
 * 2. Agent's responseStyle (optional, e.g. "concise" or "detailed with examples")
 * 3. Knowledge context from RAG (Phase 3 — relevant document chunks)
 */
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatInput {
  systemPrompt: string;
  responseStyle: string | null;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  knowledgeContext?: string; // RAG chunks injected here in Phase 3
}

export interface ChatResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Build the full system prompt by layering agent config + knowledge context.
 *
 * Example output:
 *   "You are a maize farming expert for Ghana...
 *    Response style: concise. Adjust your tone and format accordingly.
 *    <knowledge_context>...relevant chunks...</knowledge_context>"
 */
function buildSystemPrompt(systemPrompt: string, responseStyle: string | null, knowledgeContext?: string): string {
  let prompt = systemPrompt;

  if (responseStyle) {
    prompt += `\n\nResponse style: ${responseStyle}. Adjust your tone and format accordingly.`;
  }

  if (knowledgeContext) {
    prompt += `\n\n<knowledge_context>\n${knowledgeContext}\n</knowledge_context>\n\nUse the above knowledge context to inform your answers. If the context doesn't contain relevant information, say so honestly rather than making things up.`;
  }

  return prompt;
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
    messages: [
      ...input.conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: input.userMessage },
    ],
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
    messages: [
      ...input.conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: input.userMessage },
    ],
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
 * Falls back to "New conversation" if the call fails for any reason.
 */
export async function generateTitle(userMessage: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Summarize this farmer's question as a short chat title (5 words max, no quotes): "${userMessage}"`,
        },
      ],
    });

    const title = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return title || "New conversation";
  } catch {
    return "New conversation";
  }
}

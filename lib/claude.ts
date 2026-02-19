import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatInput {
  systemPrompt: string;
  responseStyle: string | null;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  knowledgeContext?: string; // RAG chunks — Phase 3
}

export interface ChatResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Build the system prompt from agent config.
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
 * Non-streaming chat call. Returns the full response.
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
 * Streaming chat call. Yields text chunks as they arrive.
 * Returns final token counts after stream completes.
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

  const stream = (async function* () {
    for await (const event of messageStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }

    // After stream completes, get final usage
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
 * Generate a short title for a conversation based on the first message.
 * Uses Haiku for cost efficiency.
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

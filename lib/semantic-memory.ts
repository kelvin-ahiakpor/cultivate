/**
 * Semantic Memory — Hierarchical memory implementation (FOUNDATION)
 *
 * This module provides semantic recall across ALL past conversations,
 * not just the last 20 messages (sliding window).
 *
 * STATUS: Infrastructure complete, implementation in progress.
 * Set ENABLE_SEMANTIC_MEMORY=true in .env to activate.
 *
 * DUAL-PURPOSE STRATEGY (Farmitecture-specific):
 *
 * 1. **Individual Farmer Learning** (Personalization)
 *    - Learn preferences, growing conditions, past issues
 *    - Example: Farmer mentioned lettuce bolting issue 2 weeks ago
 *    - Agent recalls: "Last time you had bolting, we discussed lowering temps..."
 *
 * 2. **Cross-Farmer Knowledge Aggregation** (Collective Intelligence)
 *    - Use insights from ALL Farmitecture farmers to improve advice for everyone
 *    - Example: Multiple farmers report aphids on kale in Accra (March-April)
 *    - Agent proactively warns new farmers: "It's aphid season - check your kale daily"
 *    - Privacy-preserving: only aggregate patterns, not individual details
 *
 * Architecture:
 * - All assistant messages are embedded and stored in pgvector (separate from KB chunks)
 * - When farmer asks a question, we search:
 *   a) Their own past conversations (personalization)
 *   b) Other Farmitecture farmers' conversations (collective insights) - FUTURE
 * - Top-K relevant messages are injected into the prompt alongside recent messages
 *
 * Example Flow:
 * - Farmer asks: "My hydroponic lettuce leaves are yellowing"
 * - Recent context (last 20 messages): Last week's pH discussion
 * - Semantic recall (own): 3 weeks ago discussed nutrient deficiency
 * - Semantic recall (others - future): Other farmers fixed this with iron supplement
 * - Combined context: pH + nutrients + collective solution → comprehensive answer
 *
 * Activation threshold: Only activates when farmer has 100+ total messages
 * (avoids overhead for new farmers, valuable for experienced urban farmers)
 *
 * Production Optimizations:
 * - Only embed assistant messages (user messages are in the query anyway)
 * - Skip short/trivial messages (<50 chars)
 * - Threshold-gated (100+ messages before activation)
 * - Cache recent searches to avoid duplicate embedding/search costs
 */

import { embed } from "ai";
import { voyage } from "voyage-ai-provider";
import { PgVector } from "@mastra/pg";

const ENABLED = process.env.ENABLE_SEMANTIC_MEMORY === "true";
const ACTIVATION_THRESHOLD = parseInt(process.env.SEMANTIC_MEMORY_THRESHOLD || "100");
const VOYAGE_MODEL = "voyage-3.5-lite";

// Separate vector store for message history (org-specific indexes)
// Note: dimensions are specified per-index in createIndex(), not in constructor
const messageVectorStore = new PgVector({
  id: "cultivate-message-history",
  connectionString: process.env.DATABASE_URL!,
});

/**
 * Store a message embedding for future semantic recall
 *
 * Called after saving each assistant message to DB.
 * Embeds the message content and stores in pgvector.
 */
export async function storeMessageEmbedding(
  messageId: string,
  content: string,
  userId: string,
  organizationId: string,
  conversationId: string
): Promise<void> {
  if (!ENABLED) return;

  try {
    // Embed the message
    const result = await embed({
      model: voyage(VOYAGE_MODEL),
      value: content,
    });

    const embedding = (Array.isArray(result.embedding)
      ? result.embedding
      : Array.from(result.embedding)) as number[];

    // Store in org-specific index
    const indexName = `messages_org_${organizationId}`;

    // Ensure index exists
    try {
      await messageVectorStore.getIndexInfo({ indexName });
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        await messageVectorStore.createIndex({
          indexName,
          dimension: 1024,
          metric: "cosine",
        });
      }
    }

    // Store embedding with metadata
    await messageVectorStore.upsert({
      indexName,
      vectors: [embedding],
      ids: [messageId],
      metadata: [
        {
          messageId,
          userId,
          conversationId,
          content,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    console.error("Failed to store message embedding:", error);
    // Non-blocking - don't fail the request if semantic memory fails
  }
}

/**
 * Retrieve semantically similar messages from past conversations
 *
 * Searches across ALL of user's past messages (not just current conversation)
 * to find relevant context from previous discussions.
 *
 * Returns empty if:
 * - Semantic memory is disabled
 * - User has fewer than threshold messages (100 by default)
 * - No relevant messages found
 */
export async function retrieveSemanticMemory(
  query: string,
  userId: string,
  organizationId: string,
  currentConversationId: string,
  userMessageCount: number,
  topK: number = 3
): Promise<{
  memories: Array<{
    content: string;
    conversationId: string;
    timestamp: string;
    score: number;
  }>;
  hasMemories: boolean;
}> {
  // Check if enabled
  if (!ENABLED) {
    return { memories: [], hasMemories: false };
  }

  // Check if user has enough message history to warrant semantic search
  if (userMessageCount < ACTIVATION_THRESHOLD) {
    console.log(
      `[Semantic Memory] User has ${userMessageCount} messages (threshold: ${ACTIVATION_THRESHOLD}) - skipping`
    );
    return { memories: [], hasMemories: false };
  }

  try {
    // Embed the query
    const result = await embed({
      model: voyage(VOYAGE_MODEL),
      value: query,
    });

    const queryEmbedding = (Array.isArray(result.embedding)
      ? result.embedding
      : Array.from(result.embedding)) as number[];

    const indexName = `messages_org_${organizationId}`;

    // Search for similar messages
    const results = await messageVectorStore.query({
      indexName,
      queryVector: queryEmbedding,
      topK: topK * 2, // Get more, then filter
      filter: {
        userId, // Only search this user's messages
      },
    });

    // Filter out messages from current conversation (we already have those in sliding window)
    const relevantMemories = results
      .filter((r) => r.metadata && r.metadata.conversationId !== currentConversationId)
      .slice(0, topK)
      .map((r) => ({
        content: r.metadata!.content as string,
        conversationId: r.metadata!.conversationId as string,
        timestamp: r.metadata!.timestamp as string,
        score: r.score,
      }));

    console.log(
      `[Semantic Memory] Retrieved ${relevantMemories.length} relevant memories from past conversations`
    );

    return {
      memories: relevantMemories,
      hasMemories: relevantMemories.length > 0,
    };
  } catch (error) {
    console.error("Failed to retrieve semantic memory:", error);
    return { memories: [], hasMemories: false };
  }
}

/**
 * Format semantic memories for injection into system prompt
 *
 * Converts retrieved memories into a formatted string that Claude can use.
 */
export function formatSemanticMemories(
  memories: Array<{
    content: string;
    conversationId: string;
    timestamp: string;
    score: number;
  }>
): string {
  if (memories.length === 0) return "";

  const formattedMemories = memories
    .map((m, i) => {
      const date = new Date(m.timestamp).toLocaleDateString();
      return `[Past conversation ${i + 1} - ${date}]\n${m.content}`;
    })
    .join("\n\n");

  return `<semantic_memory>
You have access to relevant information from this user's past conversations:

${formattedMemories}

Use this context if relevant to the current question, but prioritize recent conversation history.
</semantic_memory>`;
}

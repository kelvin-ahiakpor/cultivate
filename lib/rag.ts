/**
 * RAG (Retrieval-Augmented Generation) orchestrator.
 *
 * This module ties together the embedding and vector search steps:
 *   1. Take the farmer's question
 *   2. Embed it as a query vector (Voyage 3.5-lite)
 *   3. Search pgvector for the most similar document chunks
 *   4. Format the results as a context string for Claude's system prompt
 *
 * The context string is injected into Claude's prompt by lib/claude.ts via
 * the `knowledgeContext` parameter. Claude then answers grounded in the
 * actual agronomist-uploaded documents.
 *
 * Book principle: "Start simple, check quality, get complex."
 * This is the simple version — no reranking, no query refinement.
 */
import { embedQuery } from "@/lib/embeddings";
import { searchSimilar } from "@/lib/vector-db";
import { prisma } from "@/lib/prisma";

export interface RAGResult {
  context: string;       // Formatted context string for Claude
  chunks: {
    id: string;
    content: string;
    similarity: number;
    knowledgeBaseId: string;
  }[];
  hasContext: boolean;    // Whether any relevant chunks were found
}

/**
 * Retrieve relevant knowledge context for a farmer's question.
 *
 * @param query - The farmer's message (e.g. "Why are my maize leaves yellow?")
 * @param agentId - The agent handling this conversation
 * @param topK - Number of chunks to retrieve (default: 5)
 *
 * Example:
 *   const rag = await retrieveContext("Why are my maize leaves yellow?", "agent_abc");
 *   // rag.context = "Source 1 (Maize Pest Guide, chunk 3):\nYellow leaves in maize..."
 *   // rag.hasContext = true
 */
export async function retrieveContext(
  query: string,
  agentId: string,
  topK = 5
): Promise<RAGResult> {
  // 1. Find which knowledge bases belong to this agent
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { agentId },
    select: { id: true, title: true },
  });

  if (knowledgeBases.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  const kbIds = knowledgeBases.map((kb) => kb.id);
  const kbTitles = Object.fromEntries(knowledgeBases.map((kb) => [kb.id, kb.title]));

  // 2. Embed the farmer's question
  const queryEmbedding = await embedQuery(query);

  // 3. Search for similar chunks across this agent's knowledge bases
  const results = await searchSimilar(queryEmbedding, kbIds, topK);

  if (results.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  // 4. Format as a context string for Claude
  // Each chunk is labeled with its source document and chunk number
  const contextParts = results.map((chunk, i) => {
    const docTitle = kbTitles[chunk.knowledgeBaseId] || "Unknown document";
    return `Source ${i + 1} (${docTitle}, section ${chunk.chunkIndex + 1}):\n${chunk.content}`;
  });

  return {
    context: contextParts.join("\n\n---\n\n"),
    chunks: results,
    hasContext: true,
  };
}

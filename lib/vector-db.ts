/**
 * pgvector operations for the RAG pipeline.
 *
 * Uses raw SQL via Prisma's $queryRawUnsafe because Prisma doesn't natively
 * support the `vector` type. The document_chunks table has:
 *   - Standard columns managed by Prisma (id, content, chunkIndex, etc.)
 *   - An `embedding` column (vector(512)) managed via raw SQL
 *
 * All queries are scoped by knowledgeBaseId to maintain multi-tenant isolation.
 * The cosine similarity search (<=> operator) finds the most semantically
 * similar chunks to a query embedding.
 */
import { prisma } from "@/lib/prisma";

/**
 * Store a chunk's embedding in pgvector.
 * Called after creating the DocumentChunk record via Prisma.
 */
export async function upsertEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  const vectorStr = `[${embedding.join(",")}]`;
  await prisma.$queryRawUnsafe(
    `UPDATE document_chunks SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    chunkId
  );
}

/**
 * Batch upsert embeddings for multiple chunks.
 * More efficient than calling upsertEmbedding one at a time.
 */
export async function batchUpsertEmbeddings(
  items: { chunkId: string; embedding: number[] }[]
): Promise<void> {
  // Process in batches of 50 to avoid query size limits
  const batchSize = 50;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(
      batch.map((item) => upsertEmbedding(item.chunkId, item.embedding))
    );
  }
}

/**
 * Search for similar chunks using cosine similarity.
 *
 * @param queryEmbedding - The 512-dim vector of the search query
 * @param knowledgeBaseIds - Which knowledge bases to search within
 * @param topK - Number of results to return (default: 5)
 * @returns Chunks sorted by similarity (most similar first)
 *
 * Example:
 *   const results = await searchSimilar(queryVector, ["kb_abc", "kb_def"], 5);
 *   // results = [{ id, content, similarity: 0.92, ... }, ...]
 */
export async function searchSimilar(
  queryEmbedding: number[],
  knowledgeBaseIds: string[],
  topK = 5
): Promise<
  { id: string; content: string; knowledgeBaseId: string; chunkIndex: number; similarity: number }[]
> {
  if (knowledgeBaseIds.length === 0) return [];

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // The <=> operator computes cosine distance (1 - cosine_similarity).
  // We subtract from 1 to get similarity (higher = more similar).
  const results = await prisma.$queryRawUnsafe<
    { id: string; content: string; knowledge_base_id: string; chunk_index: number; similarity: number }[]
  >(
    `SELECT
      id,
      content,
      knowledge_base_id,
      chunk_index,
      1 - (embedding <=> $1::vector) as similarity
    FROM document_chunks
    WHERE knowledge_base_id = ANY($2)
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $3`,
    vectorStr,
    knowledgeBaseIds,
    topK
  );

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    knowledgeBaseId: r.knowledge_base_id,
    chunkIndex: r.chunk_index,
    similarity: r.similarity,
  }));
}

/**
 * Delete all embeddings for a knowledge base (used when deleting a document).
 * The Prisma cascade handles deleting DocumentChunk rows,
 * but this is here if we need explicit cleanup.
 */
export async function deleteEmbeddings(knowledgeBaseId: string): Promise<void> {
  await prisma.$queryRawUnsafe(
    `DELETE FROM document_chunks WHERE knowledge_base_id = $1`,
    knowledgeBaseId
  );
}

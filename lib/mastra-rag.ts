/**
 * Mastra RAG utilities — FULL MASTRA IMPLEMENTATION (March 22, 2026)
 *
 * ✅ USING @mastra/pg PgVector (proper way)
 * Replaces manual pgvector SQL with Mastra's built-in vector store
 *
 * Tech Stack:
 * - @mastra/rag — Document parsing + recursive chunking (500 tokens, 100 overlap)
 * - @mastra/pg — PgVector for automatic vector storage management
 * - voyage-ai-provider — Voyage 3.5-lite embeddings (1024 dims)
 * - ai SDK — embedMany() and embed() functions
 *
 * Pipeline Flow:
 * 1. Upload PDF → Supabase Storage
 * 2. Extract text → unpdf (serverless-safe PDF.js build)
 * 3. Chunk → MDocument.chunk() recursive strategy
 * 4. Embed → Voyage AI (1024-dim vectors)
 * 5. Store → Mastra PgVector (creates tables automatically)
 * 6. Query → vectorStore.query() with cosine similarity
 * 7. Inject → Claude's system prompt with knowledge context
 */

import { MDocument } from "@mastra/rag";
import { PgVector } from "@mastra/pg";
import { embedMany, embed } from "ai";
import { voyage } from "voyage-ai-provider";
import { prisma } from "@/lib/prisma";
import type { KnowledgeBaseType } from "@prisma/client";

// ============================================================================
// CONFIGURATION
// ============================================================================

const VOYAGE_MODEL = "voyage-3.5-lite"; // $0.02/1M tokens, 1024 dims
const CHUNK_OVERLAP = 100; // token overlap between chunks (preserves context at boundaries)
const EMBEDDING_DIMENSION = 1024; // Voyage 3.5-lite default
// Note: No maxSize - Mastra's recursive chunker decides optimal chunk sizes (typically 400-800 tokens)
// This prevents "chunk exceeds limit" errors while maintaining semantic integrity

// Initialize Mastra PgVector
// Note: dimensions are specified per-index in createIndex(), not in constructor
const vectorStore = new PgVector({
  id: "cultivate-vectors",
  connectionString: process.env.DATABASE_URL!,
});

// ============================================================================
// DOCUMENT PARSING
// ============================================================================

/**
 * Extract text from PDF buffer using unpdf.
 *
 * Why unpdf?
 * - Pure JS / PDF.js-based extraction
 * - Works in local Node and Vercel/serverless
 * - Avoids external system binary dependencies like pdftotext
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}

/**
 * Extract text from any supported file type
 */
export async function extractText(
  buffer: Buffer,
  fileType: "pdf" | "docx" | "txt"
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractTextFromPDF(buffer);
    case "docx":
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    case "txt":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// ============================================================================
// CHUNKING
// ============================================================================

export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

interface VectorChunkMetadata {
  knowledgeBaseId?: string;
  fileName?: string;
  content?: string;
  chunkIndex?: number;
  tokenCount?: number;
}

interface KnowledgeBaseRef {
  id: string;
  fileName: string;
  kbType: KnowledgeBaseType;
}

/**
 * Chunk text using Mastra's recursive chunker
 *
 * NO maxSize limit - let Mastra decide optimal chunk boundaries
 * This prevents "chunk size exceeds limit" errors on complex docs
 * Chunks will vary naturally (typically 400-800 tokens) based on semantic boundaries
 */
export async function chunkText(text: string): Promise<Chunk[]> {
  const doc = MDocument.fromText(text);

  const mastraChunks = await doc.chunk({
    strategy: "recursive",
    // No maxSize - let Mastra's chunker decide optimal boundaries
    overlap: CHUNK_OVERLAP,
  });

  return mastraChunks.map((chunk, index) => ({
    content: chunk.text,
    chunkIndex: index,
    tokenCount: Math.ceil(chunk.text.length / 4), // rough estimate
  }));
}

// ============================================================================
// EMBEDDINGS
// ============================================================================

/**
 * Generate embeddings for multiple text chunks (batch)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const result = await embedMany({
    model: voyage(VOYAGE_MODEL),
    values: texts,
  });

  // Ensure embeddings are plain arrays (not Float32Array or other typed arrays)
  return result.embeddings.map(emb => Array.isArray(emb) ? emb : Array.from(emb));
}

/**
 * Generate embedding for a single query text
 */
export async function embedQuery(text: string): Promise<number[]> {
  const result = await embed({
    model: voyage(VOYAGE_MODEL),
    value: text,
  });

  // Ensure embedding is a plain array (not Float32Array or other typed array)
  return Array.isArray(result.embedding) ? result.embedding : Array.from(result.embedding);
}

// ============================================================================
// VECTOR STORAGE (Mastra PgVector)
// ============================================================================

/**
 * Store chunks in Mastra's vector store
 * Creates index if it doesn't exist, then upserts vectors
 */
export async function storeChunks(
  knowledgeBaseId: string,
  organizationId: string,
  fileName: string,
  chunks: Chunk[],
  embeddings: number[][]
): Promise<void> {
  // Use org-specific index name for multi-tenant isolation
  const indexName = `org_${organizationId}`;

  // Ensure index exists before upserting
  try {
    await vectorStore.getIndexInfo({ indexName });
  } catch (error: unknown) {
    // Index doesn't exist - create it
    if (error instanceof Error && error.message.includes("does not exist")) {
      await vectorStore.createIndex({
        indexName,
        dimension: EMBEDDING_DIMENSION,
        metric: "cosine",
      });
    } else {
      throw error;
    }
  }

  // Mastra expects separate arrays: vectors (just embeddings), ids, metadata
  await vectorStore.upsert({
    indexName,
    vectors: embeddings, // Array of number[] - just the raw embeddings
    ids: embeddings.map((_, i) => `${knowledgeBaseId}_chunk_${i}`),
    metadata: chunks.map((chunk) => ({
      knowledgeBaseId,
      fileName,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
    })),
  });
}

/**
 * Delete all chunks for a knowledge base
 */
export async function deleteChunks(
  knowledgeBaseId: string,
  organizationId: string
): Promise<void> {
  const indexName = `org_${organizationId}`;

  // Query to find all chunk IDs for this KB
  const results = await vectorStore.query({
    indexName,
    queryVector: Array(EMBEDDING_DIMENSION).fill(0), // dummy vector
    topK: 1000, // get all chunks
    filter: { knowledgeBaseId },
  });

  if (results.length > 0) {
    const ids = results.map((r) => r.id);
    await vectorStore.deleteVectors({
      indexName,
      ids,
    });
  }
}

// ============================================================================
// RAG SEARCH
// ============================================================================

export interface RAGResult {
  context: string;
  chunks: Array<{
    content: string;
    knowledgeBaseId: string;
    documentName: string;
    score: number;
  }>;
  hasContext: boolean;
}

/**
 * Retrieve relevant context for a user query via RAG
 *
 * Steps:
 * 1. Find knowledge bases for the agent
 * 2. Embed the query
 * 3. Search Mastra vector store for similar chunks
 * 4. Format results as context string
 */
export async function retrieveContext(
  query: string,
  agentId: string,
  organizationId: string,
  topK: number = 10
): Promise<RAGResult> {
  // 1. Find knowledge bases for this agent (via join table)
  const agentKbs = await prisma.agentKnowledgeBase.findMany({
    where: { agentId },
    include: {
      knowledgeBase: {
        select: { id: true, fileName: true, kbType: true },
      },
    },
  });

  if (agentKbs.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  const knowledgeBases: KnowledgeBaseRef[] = agentKbs.map((akb) => akb.knowledgeBase);
  const kbIds = knowledgeBases.map((kb) => kb.id);

  // 2. Embed the query
  const queryEmbedding = await embedQuery(query);

  // 3. Search Mastra vector store (get more results for weighted re-ranking)
  const indexName = `org_${organizationId}`;

  const results = await vectorStore.query({
    indexName,
    queryVector: queryEmbedding,
    topK: topK * 2, // Get more results to re-rank
    filter: {
      knowledgeBaseId: { $in: kbIds },
    },
  });

  if (results.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  // 4. Apply weighted scoring: CORE × 1.5, RELATED × 1.0, GENERAL × 0.7
  console.log("\n🔍 RAG WEIGHTED RETRIEVAL:");
  console.log(`Query embedding search returned ${results.length} results (topK × 2 = ${topK * 2})`);

  const weighted = results.map((r, i) => {
    const metadata = (r.metadata ?? {}) as VectorChunkMetadata;
    const kbId = metadata.knowledgeBaseId;
    const kb = knowledgeBases.find((k) => k.id === kbId);
    const weight =
      kb?.kbType === "CORE" ? 1.5 : kb?.kbType === "RELATED" ? 1.0 : 0.7;
    const originalScore = r.score;
    const weightedScore = r.score * weight;

    if (i < 5) {
      // Log first 5 results before weighting
      console.log(`  [${i + 1}] ${kb?.fileName?.slice(0, 40) || "Unknown"} (${kb?.kbType || "?"}) - Original: ${originalScore.toFixed(4)} → Weighted: ${weightedScore.toFixed(4)} (×${weight})`);
    }

    return { ...r, score: weightedScore, originalScore, kbType: kb?.kbType, fileName: kb?.fileName };
  });

  // 5. Re-sort by weighted score and take topK
  weighted.sort((a, b) => b.score - a.score);
  const topResults = weighted.slice(0, topK);

  console.log(`\n✅ Top ${topK} after weighted re-ranking:`);
  topResults.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.fileName?.slice(0, 40) || "Unknown"} (${r.kbType || "?"}) - Score: ${r.score.toFixed(4)}`);
  });
  console.log("");

  // 6. Format results as context string
  const chunks = topResults
    .filter((r) => r.metadata?.knowledgeBaseId && r.metadata?.content)
    .map((r) => {
      const metadata = r.metadata as VectorChunkMetadata;
      const kb = knowledgeBases.find((kb) => kb.id === metadata.knowledgeBaseId);
      return {
        content: metadata.content as string,
        knowledgeBaseId: metadata.knowledgeBaseId as string,
        documentName: kb?.fileName || "Unknown",
        score: r.score,
      };
    });

  if (chunks.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  const context = chunks
    .map((chunk) => `[Document: ${chunk.documentName}]\n${chunk.content}`)
    .join("\n\n---\n\n");

  return {
    context,
    chunks,
    hasContext: true,
  };
}

// ============================================================================
// COMPLETE PROCESSING PIPELINE
// ============================================================================

/**
 * Full pipeline: parse → chunk → embed → store
 * Used by the document upload endpoint
 */
export async function processAndStoreDocument(
  buffer: Buffer,
  fileType: string,
  knowledgeBaseId: string,
  organizationId: string,
  fileName: string
): Promise<number> {
  // 1. Extract text
  const text = await extractText(buffer, fileType as "pdf" | "docx" | "txt");

  if (!text || text.trim().length === 0) {
    throw new Error("No text content extracted from document");
  }

  // 2. Chunk the text
  const chunks = await chunkText(text);

  if (chunks.length === 0) {
    throw new Error("No chunks created from document");
  }

  // 3. Generate embeddings
  const embeddings = await embedTexts(chunks.map((c) => c.content));

  // 4. Store in vector database
  await storeChunks(knowledgeBaseId, organizationId, fileName, chunks, embeddings);

  return chunks.length;
}

/**
 * Mastra RAG utilities — replaces 5 custom files with battle-tested implementations
 *
 * ✅ MIGRATION COMPLETE (March 13, 2026)
 * Replaced: document-parser.ts, chunker.ts, chunker-simple.ts, embeddings.ts, vector-db.ts, rag.ts
 * With: Single file using Mastra's official utilities
 *
 * Tech Stack:
 * - @mastra/rag v2.1.2 — Document parsing + recursive chunking (500 tokens, 100 overlap)
 * - voyage-ai-provider v3.0.0 — Voyage 3.5-lite embeddings via Vercel AI SDK
 * - ai SDK v6.0.116 — embedMany() and embed() functions
 * - pgvector (Supabase) — 1024-dim vector storage with cosine similarity search
 *
 * Pipeline Flow:
 * 1. Upload PDF → Supabase Storage
 * 2. Extract text → pdftotext (system binary, zero Node heap cost)
 * 3. Chunk → MDocument.chunk() recursive strategy (23 chunks from 8.8KB)
 * 4. Embed → Voyage AI (1024-dim vectors, $0.02/1M tokens)
 * 5. Store → pgvector via raw Prisma SQL
 * 6. Query → Embed farmer's question → cosine similarity search → top 10 chunks
 * 7. Inject → Claude's system prompt with knowledge context
 */

import { MDocument } from "@mastra/rag";
import { embedMany, embed } from "ai";
import { voyage } from "voyage-ai-provider";
import { prisma } from "@/lib/prisma";

// ============================================================================
// CONFIGURATION
// ============================================================================

const VOYAGE_MODEL = "voyage-3.5-lite"; // $0.02/1M tokens, 1024 dims (default)
const CHUNK_SIZE = 500; // tokens per chunk
const CHUNK_OVERLAP = 100; // token overlap between chunks

// Note: We use raw Prisma SQL for vector operations instead of @mastra/pg
// because our schema (document_chunks table) is already set up

// ============================================================================
// DOCUMENT PARSING
// ============================================================================

/**
 * Extract text from PDF buffer using pdftotext (system binary)
 *
 * Why pdftotext instead of JS libraries?
 * - pdf-parse, pdfjs-dist, unpdf all cause Turbopack OOM (4-8GB heap) in dev
 * - pdftotext runs in separate OS process → zero Node.js heap cost
 * - Requires: `brew install poppler` (Mac) or `poppler-utils` (Linux/Vercel)
 *
 * MDocument doesn't have fromPDF, so we extract text first then use fromText
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { writeFile, unlink } = await import("fs/promises");
  const { tmpdir } = await import("os");
  const { join } = await import("path");

  const execFileAsync = promisify(execFile);
  const tmpPath = join(tmpdir(), `cultivate-pdf-${Date.now()}.pdf`);

  try {
    // Write buffer to temp file (pdftotext needs file path, not stdin)
    await writeFile(tmpPath, buffer);
    // Run pdftotext with -layout flag to preserve formatting, output to stdout (-)
    const { stdout } = await execFileAsync("pdftotext", ["-layout", tmpPath, "-"]);
    return stdout;
  } finally {
    // Clean up temp file (ignore errors if already deleted)
    await unlink(tmpPath).catch(() => {});
  }
}

/**
 * Extract text from any supported file type (PDF, DOCX, TXT)
 */
export async function extractText(
  buffer: Buffer,
  fileType: "pdf" | "docx" | "txt"
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractTextFromPDF(buffer);
    case "docx":
      // Use mammoth for DOCX
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

/**
 * Our custom Chunk type that matches our DB schema
 */
export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

/**
 * Chunk text using Mastra's recursive chunker
 * Returns chunks with content, chunkIndex, and tokenCount
 */
export async function chunkText(text: string): Promise<Chunk[]> {
  // Create MDocument from text
  const doc = MDocument.fromText(text);

  // Chunk using Mastra's recursive strategy - returns Chunk[] (Document objects)
  const mastraChunks = await doc.chunk({
    strategy: "recursive",
    maxSize: CHUNK_SIZE,
    overlap: CHUNK_OVERLAP,
  });

  // Map Mastra's Document chunks to our Chunk[] format
  return mastraChunks.map((chunk, index) => ({
    content: chunk.text, // Document extends TextNode which has .text property
    chunkIndex: index,
    tokenCount: Math.ceil(chunk.text.length / 4), // rough estimate: 4 chars ≈ 1 token
  }));
}

// ============================================================================
// EMBEDDINGS
// ============================================================================

/**
 * Generate embeddings for multiple text chunks (batch)
 * Used during document upload
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const result = await embedMany({
    model: voyage(VOYAGE_MODEL),
    values: texts,
  });

  return result.embeddings;
}

/**
 * Generate embedding for a single query text
 * Used during RAG search
 */
export async function embedQuery(text: string): Promise<number[]> {
  const result = await embed({
    model: voyage(VOYAGE_MODEL),
    value: text,
  });

  return result.embedding;
}

// ============================================================================
// VECTOR STORAGE (pgvector)
// ============================================================================

/**
 * Store chunk embeddings in pgvector
 * Uses raw Prisma SQL since @mastra/pg expects different schema
 */
export async function storeEmbeddings(
  items: Array<{ chunkId: string; embedding: number[] }>
): Promise<void> {
  for (const { chunkId, embedding } of items) {
    await prisma.$executeRaw`
      UPDATE document_chunks
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${chunkId}
    `;
  }
}

/**
 * Batch store embeddings (50 at a time)
 */
export async function batchStoreEmbeddings(
  items: Array<{ chunkId: string; embedding: number[] }>
): Promise<void> {
  const batchSize = 50;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await storeEmbeddings(batch);
  }
}

/**
 * Delete embeddings for a knowledge base
 */
export async function deleteEmbeddings(knowledgeBaseId: string): Promise<void> {
  await prisma.documentChunk.deleteMany({
    where: { knowledgeBaseId },
  });
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
  }>;
  hasContext: boolean;
}

/**
 * Retrieve relevant context for a user query via RAG
 *
 * Steps:
 * 1. Find knowledge bases for the agent
 * 2. Embed the query
 * 3. Search pgvector for similar chunks
 * 4. Format results as context string
 */
export async function retrieveContext(
  query: string,
  agentId: string,
  topK: number = 10
): Promise<RAGResult> {
  // 1. Find knowledge bases for this agent
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { agentId },
    select: { id: true, fileName: true },
  });

  if (knowledgeBases.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  const kbIds = knowledgeBases.map((kb) => kb.id);

  // 2. Embed the query
  const queryEmbedding = await embedQuery(query);

  // 3. Search pgvector for similar chunks using cosine similarity
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      knowledgeBaseId: string;
      similarity: number;
    }>
  >`
    SELECT
      dc.id,
      dc.content,
      dc."knowledgeBaseId",
      1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM document_chunks dc
    WHERE dc."knowledgeBaseId" = ANY(${kbIds})
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${topK}
  `;

  if (results.length === 0) {
    return { context: "", chunks: [], hasContext: false };
  }

  // 4. Format as context string
  const chunks = results.map((r) => {
    const kb = knowledgeBases.find((kb) => kb.id === r.knowledgeBaseId);
    return {
      content: r.content,
      knowledgeBaseId: r.knowledgeBaseId,
      documentName: kb?.fileName || "Unknown",
    };
  });

  const context = chunks
    .map((chunk) => `[Document: ${chunk.documentName}]\n${chunk.content}`)
    .join("\n\n---\n\n");

  return {
    context,
    chunks,
    hasContext: true,
  };
}

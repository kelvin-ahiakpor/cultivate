#!/usr/bin/env tsx
/**
 * Standalone script for processing documents.
 *
 * Runs as a completely separate Node process (not a worker thread).
 * Invoked via: npx tsx lib/workers/process-document-script.ts <knowledgeBaseId> <filePath> <fileType>
 *
 * This avoids loading Next.js/Turbopack context entirely.
 *
 * NOW USES MASTRA RAG UTILITIES:
 * - MDocument.fromPDF() for document parsing
 * - createDocumentChunker() for recursive chunking
 * - voyage-ai-provider for embeddings
 */
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { extractText, chunkText, embedTexts, batchStoreEmbeddings } from "@/lib/mastra-rag";

async function main() {
  const [knowledgeBaseId, filePath, fileTypeRaw] = process.argv.slice(2);

  if (!knowledgeBaseId || !filePath || !fileTypeRaw) {
    console.error("Usage: tsx process-document-script.ts <knowledgeBaseId> <filePath> <fileType>");
    process.exit(1);
  }

  // Validate fileType
  const fileType = fileTypeRaw.toLowerCase() as "pdf" | "docx" | "txt";
  if (!["pdf", "docx", "txt"].includes(fileType)) {
    console.error(`Invalid fileType: ${fileTypeRaw}. Must be pdf, docx, or txt.`);
    process.exit(1);
  }

  try {
    console.log(`Step 1: Reading file... Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    const buffer = await readFile(filePath);
    console.log(`Step 1 done. Buffer size: ${buffer.length} bytes. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    console.log(`Step 2: Extracting text...`);
    const text = await extractText(buffer, fileType);
    console.log(`Step 2 done. Text length: ${text.length} chars. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    if (text.trim().length === 0) {
      console.warn(`Document ${knowledgeBaseId} produced no text`);
      process.exit(0);
    }

    console.log(`Step 3: Chunking text...`);
    const chunks = await chunkText(text);
    console.log(`Step 3 done. Created ${chunks.length} chunks. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    console.log(`Step 4: Creating chunk records in DB...`);
    // Use createMany for single batch insert instead of Promise.all
    // Note: This avoids Supabase Session Pooler connection limit in dev.
    // In Vercel production with better server resources, Promise.all might be faster.
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        knowledgeBaseId,
      })),
    });

    // Fetch the created chunks to get their IDs for embeddings
    const dbChunks = await prisma.documentChunk.findMany({
      where: { knowledgeBaseId },
      orderBy: { chunkIndex: 'asc' },
    });
    console.log(`Step 4 done. ${dbChunks.length} chunks in DB. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    console.log(`Step 5: Generating embeddings...`);
    const texts = chunks.map((c) => c.content);
    const embeddings = await embedTexts(texts);
    console.log(`Step 5 done. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    // 6. Store embeddings in pgvector
    const items = dbChunks.map((dbChunk, i) => ({
      chunkId: dbChunk.id,
      embedding: embeddings[i],
    }));
    await batchStoreEmbeddings(items);

    // 7. Update knowledge base with chunk count
    await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { chunkCount: chunks.length },
    });

    console.log(`✅ Processed document ${knowledgeBaseId}: ${chunks.length} chunks embedded`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to process document ${knowledgeBaseId}:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

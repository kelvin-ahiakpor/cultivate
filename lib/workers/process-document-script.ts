#!/usr/bin/env tsx
/**
 * Standalone script for processing documents.
 *
 * Runs as a completely separate Node process (not a worker thread).
 * Invoked via: npx tsx lib/workers/process-document-script.ts <knowledgeBaseId> <filePath> <fileType>
 *
 * This avoids loading Next.js/Turbopack context entirely.
 *
 * NOW USES MASTRA PGVECTOR (March 22, 2026):
 * - @mastra/rag for parsing + chunking
 * - @mastra/pg PgVector for vector storage
 * - voyage-ai for embeddings
 */
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { processAndStoreDocument } from "@/lib/mastra-rag";

async function main() {
  const [knowledgeBaseId, filePath, fileTypeRaw] = process.argv.slice(2);

  if (!knowledgeBaseId || !filePath || !fileTypeRaw) {
    console.error("Usage: tsx process-document-script.ts <knowledgeBaseId> <filePath> <fileType>");
    process.exit(1);
  }

  // Validate fileType
  const fileType = fileTypeRaw.toLowerCase();
  if (!["pdf", "docx", "txt"].includes(fileType)) {
    console.error(`Invalid fileType: ${fileTypeRaw}. Must be pdf, docx, or txt.`);
    process.exit(1);
  }

  try {
    console.log(`Step 1: Fetching knowledge base record...`);
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      select: { id: true, fileName: true, organizationId: true },
    });

    if (!kb) {
      console.error(`Knowledge base ${knowledgeBaseId} not found`);
      process.exit(1);
    }

    console.log(`Step 2: Reading file... Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    const buffer = await readFile(filePath);
    console.log(`Step 2 done. Buffer size: ${buffer.length} bytes. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    console.log(`Step 3: Processing document (parse → chunk → embed → store)...`);
    const chunkCount = await processAndStoreDocument(
      buffer,
      fileType,
      kb.id,
      kb.organizationId,
      kb.fileName
    );
    console.log(`Step 3 done. Created ${chunkCount} chunks. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    console.log(`Step 4: Updating knowledge base with chunk count...`);
    await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { chunkCount },
    });

    console.log(`✅ Processed document ${knowledgeBaseId}: ${chunkCount} chunks embedded in Mastra PgVector`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to process document ${knowledgeBaseId}:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

/**
 * Worker thread for processing knowledge base documents.
 *
 * This runs in a separate Node.js process with its own heap, completely
 * isolated from the main Next.js server and Turbopack's memory usage.
 *
 * Why a worker?
 * - Turbopack in dev consumes ~4GB of heap compiling routes
 * - Processing large PDFs (chunking + embedding) needs significant memory
 * - Running both in the same process causes OOM crashes
 * - Workers get their own heap (default 512MB, configurable)
 *
 * Communication:
 * - Main thread sends: { knowledgeBaseId, bufferData, fileType }
 * - Worker posts back: { success: true } or { success: false, error: string }
 */
import { parentPort, workerData } from "worker_threads";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/document-parser";
import { chunkText } from "@/lib/chunker";
import { embed } from "@/lib/embeddings";
import { batchUpsertEmbeddings } from "@/lib/vector-db";

interface WorkerInput {
  knowledgeBaseId: string;
  bufferData: number[]; // Buffer serialized as array of bytes
  fileType: string;
}

async function processDocument(
  knowledgeBaseId: string,
  buffer: Buffer,
  fileType: string
): Promise<void> {
  // 1. Extract text
  const text = await extractText(buffer, fileType);

  if (text.trim().length === 0) {
    console.warn(`Document ${knowledgeBaseId} produced no text`);
    return;
  }

  // 2. Chunk the text
  const chunks = chunkText(text);

  // 3. Create chunk records in DB
  const dbChunks = await Promise.all(
    chunks.map((chunk) =>
      prisma.documentChunk.create({
        data: {
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          knowledgeBaseId,
        },
      })
    )
  );

  // 4. Generate embeddings (batch — Voyage supports up to 128 at once)
  const texts = chunks.map((c) => c.content);
  const embeddings = await embed(texts);

  // 5. Store embeddings in pgvector
  const items = dbChunks.map((dbChunk, i) => ({
    chunkId: dbChunk.id,
    embedding: embeddings[i],
  }));
  await batchUpsertEmbeddings(items);

  // 6. Update knowledge base with chunk count
  await prisma.knowledgeBase.update({
    where: { id: knowledgeBaseId },
    data: { chunkCount: chunks.length },
  });

  console.log(`Processed document ${knowledgeBaseId}: ${chunks.length} chunks embedded`);
}

// Main worker logic
(async () => {
  try {
    const { knowledgeBaseId, bufferData, fileType } = workerData as WorkerInput;

    // Reconstruct Buffer from serialized array
    const buffer = Buffer.from(bufferData);

    await processDocument(knowledgeBaseId, buffer, fileType);

    parentPort?.postMessage({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Worker processDocument error:", errorMessage);
    parentPort?.postMessage({ success: false, error: errorMessage });
  } finally {
    // Disconnect Prisma before worker exits
    await prisma.$disconnect();
  }
})();

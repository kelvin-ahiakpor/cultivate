import { prisma } from "@/lib/prisma";
import { processAndStoreDocument } from "@/lib/mastra-rag";

type SupportedFileType = "pdf" | "docx" | "txt";

interface ProcessKnowledgeBaseDocumentInput {
  knowledgeBaseId: string;
  buffer: Buffer;
  fileType: SupportedFileType;
  organizationId: string;
  fileName: string;
}

/**
 * Shared KB processing pipeline.
 *
 * Local dev keeps using a spawned child process to isolate heap usage from Turbopack.
 * Production/Vercel can call this directly inside a post-response task (`after()`),
 * which keeps the work tied to the function lifecycle instead of orphaning it.
 */
export async function processKnowledgeBaseDocument({
  knowledgeBaseId,
  buffer,
  fileType,
  organizationId,
  fileName,
}: ProcessKnowledgeBaseDocumentInput): Promise<number> {
  try {
    const chunkCount = await processAndStoreDocument(
      buffer,
      fileType,
      knowledgeBaseId,
      organizationId,
      fileName
    );

    await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { chunkCount },
    });

    return chunkCount;
  } catch (error) {
    await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { chunkCount: -1 },
    }).catch((updateError) => {
      console.error(`❌ Failed to mark document ${knowledgeBaseId} as failed:`, updateError);
    });

    throw error;
  }
}

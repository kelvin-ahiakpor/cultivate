/**
 * Knowledge Base Upload API.
 *
 * POST /api/knowledge-bases/upload
 *
 * Accepts a FormData upload with:
 *   - file: PDF, DOCX, or TXT (max 25MB)
 *   - title: Human-readable document name
 *   - agentId: Which agent this knowledge belongs to
 *
 * Processing pipeline:
 *   1. Validate file type and size
 *   2. Upload to Supabase Storage
 *   3. Create KnowledgeBase DB record
 *   4. Extract text from the document
 *   5. Chunk the text (500 tokens, 100 overlap)
 *   6. Embed each chunk via Voyage 3.5-lite
 *   7. Store chunks + embeddings in pgvector
 *   8. Update KnowledgeBase with chunk count
 *
 * Steps 4-8 run after the initial response so the agronomist
 * doesn't wait for the full pipeline to complete.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";
import { uploadFile } from "@/lib/supabase-storage";
import { extractText } from "@/lib/document-parser";
import { chunkText } from "@/lib/chunker";
import { embed } from "@/lib/embeddings";
import { batchUpsertEmbeddings } from "@/lib/vector-db";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const agentId = formData.get("agentId") as string | null;

    // Validate inputs
    if (!file || !title || !agentId) {
      return apiError("file, title, and agentId are required", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("File size exceeds 25MB limit", 400);
    }

    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      return apiError("Unsupported file type. Use PDF, DOCX, or TXT.", 400);
    }

    // Verify agent belongs to user's org
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.organizationId !== session!.user.organizationId) {
      return apiError("Agent not found", 404);
    }

    const orgId = session!.user.organizationId;

    // 1. Create KB record first (so we have an ID for the storage path)
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        title,
        fileName: file.name,
        fileUrl: "", // Will update after upload
        fileType,
        organizationId: orgId,
        agronomistId: session!.user.id,
        agentId,
      },
    });

    // 2. Upload file to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadFile(buffer, file.name, file.type, orgId, knowledgeBase.id);

    await prisma.knowledgeBase.update({
      where: { id: knowledgeBase.id },
      data: { fileUrl },
    });

    // 3. Process the document (extract → chunk → embed → store)
    // This runs in the background after we return the response
    processDocument(knowledgeBase.id, buffer, fileType).catch((err) => {
      console.error(`Failed to process document ${knowledgeBase.id}:`, err);
    });

    return apiSuccess(
      {
        ...knowledgeBase,
        fileUrl,
        message: "Document uploaded. Processing in background.",
      },
      201
    );
  } catch (err) {
    console.error("POST /api/knowledge-bases/upload error:", err);
    return apiError("Failed to upload document", 500);
  }
}

/**
 * Background processing: extract text, chunk, embed, store vectors.
 *
 * Runs after the HTTP response is sent so the agronomist doesn't wait.
 * If this fails, the document still exists in storage and DB — it just
 * won't have embeddings until reprocessed.
 */
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

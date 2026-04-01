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
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";
import { uploadFile } from "@/lib/supabase-storage";

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
    const kbType = formData.get("kbType") as string || "RELATED";
    const contentType = formData.get("contentType") as string || null;
    const sourceType = formData.get("sourceType") as string || "PDF_UPLOAD";
    const description = formData.get("description") as string || null;

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
        kbType: kbType as any,
        contentType: contentType as any,
        sourceType: sourceType as any,
        description,
        organizationId: orgId,
        agronomistId: session!.user.id,
      },
    });

    // 2. Create primary agent assignment
    await prisma.agentKnowledgeBase.create({
      data: {
        agentId,
        knowledgeBaseId: knowledgeBase.id,
        isPrimary: true,
      },
    });

    // 3. Upload file to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadFile(buffer, file.name, file.type, orgId, knowledgeBase.id);

    await prisma.knowledgeBase.update({
      where: { id: knowledgeBase.id },
      data: { fileUrl },
    });

    // 4. Process the document in a separate Node process (extract → chunk → embed → store)
    // This runs completely isolated from Turbopack's memory usage
    const tmpPath = join(tmpdir(), `cultivate-upload-${knowledgeBase.id}.${fileType}`);
    await writeFile(tmpPath, buffer);

    const scriptPath = join(process.cwd(), "lib", "workers", "process-document-script.ts");
    const childProcess = spawn("npx", ["tsx", scriptPath, knowledgeBase.id, tmpPath, fileType], {
      stdio: "pipe",
      detached: false,
    });

    // Capture output for debugging
    childProcess.stdout.on("data", (data) => {
      console.log(`[Document ${knowledgeBase.id}]:`, data.toString().trim());
    });

    childProcess.stderr.on("data", (data) => {
      console.error(`[Document ${knowledgeBase.id} ERROR]:`, data.toString().trim());
    });

    childProcess.on("exit", async (code) => {
      // Clean up temp file
      await unlink(tmpPath).catch(() => {});

      if (code === 0) {
        console.log(`✅ Document ${knowledgeBase.id} processed successfully`);
      } else {
        console.error(`❌ Document processing failed with exit code ${code}`);
      }
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


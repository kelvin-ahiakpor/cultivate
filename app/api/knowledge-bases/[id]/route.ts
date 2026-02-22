import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";
import { deleteFile } from "@/lib/supabase-storage";
import { deleteEmbeddings } from "@/lib/vector-db";

// GET /api/knowledge-bases/:id — Get document details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  try {
    const doc = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true } },
        agronomist: { select: { id: true, name: true } },
      },
    });

    if (!doc) return apiError("Document not found", 404);

    if (doc.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(doc);
  } catch (err) {
    console.error("GET /api/knowledge-bases/[id] error:", err);
    return apiError("Failed to fetch document", 500);
  }
}

// DELETE /api/knowledge-bases/:id — Delete document + file from storage + vector embeddings
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  try {
    const doc = await prisma.knowledgeBase.findUnique({ where: { id } });

    if (!doc) return apiError("Document not found", 404);

    if (doc.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    // 1. Delete vector embeddings from pgvector (before Prisma cascade removes chunk rows)
    await deleteEmbeddings(id);

    // 2. Delete file from Supabase Storage (non-blocking — won't fail the request)
    await deleteFile(doc.organizationId, id, doc.fileName);

    // 3. Delete DB record (cascades to DocumentChunk rows via Prisma)
    await prisma.knowledgeBase.delete({ where: { id } });

    return apiSuccess({ message: "Document deleted" });
  } catch (err) {
    console.error("DELETE /api/knowledge-bases/[id] error:", err);
    return apiError("Failed to delete document", 500);
  }
}

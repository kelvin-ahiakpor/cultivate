import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

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

// DELETE /api/knowledge-bases/:id — Delete document + file + (future: vector embeddings)
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

    // Phase 3 will add: delete from Supabase Storage + delete vector embeddings
    await prisma.knowledgeBase.delete({ where: { id } });

    return apiSuccess({ message: "Document deleted" });
  } catch (err) {
    console.error("DELETE /api/knowledge-bases/[id] error:", err);
    return apiError("Failed to delete document", 500);
  }
}

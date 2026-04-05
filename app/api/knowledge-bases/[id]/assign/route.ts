import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
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
    const body = await request.json();
    const agentId = typeof body?.agentId === "string" ? body.agentId : "";

    if (!agentId) {
      return apiError("agentId is required", 400);
    }

    const doc = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, organizationId: true },
    });

    if (!doc) {
      return apiError("Document not found", 404);
    }

    if (doc.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    if (!agent || agent.organizationId !== session!.user.organizationId) {
      return apiError("Agent not found", 404);
    }

    const existingAssignment = await prisma.agentKnowledgeBase.findUnique({
      where: {
        agentId_knowledgeBaseId: {
          agentId,
          knowledgeBaseId: id,
        },
      },
    });

    if (existingAssignment) {
      return apiSuccess({ message: "Document already assigned to this agent" });
    }

    await prisma.agentKnowledgeBase.create({
      data: {
        agentId,
        knowledgeBaseId: id,
        isPrimary: false,
      },
    });

    return apiSuccess({ message: "Document assigned to agent" }, 201);
  } catch (err) {
    return await handleApiError("POST /api/knowledge-bases/[id]/assign", err, "Failed to assign document");
  }
}

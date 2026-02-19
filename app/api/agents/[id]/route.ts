import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// GET /api/agents/:id — Get single agent with full details
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
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            conversations: true,
            knowledgeBases: true,
            flaggedQueries: true,
          },
        },
        agronomist: {
          select: { id: true, name: true, email: true },
        },
        knowledgeBases: {
          select: { id: true, title: true, fileName: true, fileType: true, chunkCount: true },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!agent) {
      return apiError("Agent not found", 404);
    }

    if (agent.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(agent);
  } catch (err) {
    console.error("GET /api/agents/[id] error:", err);
    return apiError("Failed to fetch agent", 500);
  }
}

// PUT /api/agents/:id — Update agent fields
export async function PUT(
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
    const existing = await prisma.agent.findUnique({ where: { id } });

    if (!existing) {
      return apiError("Agent not found", 404);
    }

    if (existing.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const { name, systemPrompt, responseStyle, confidenceThreshold } = body;

    if (confidenceThreshold !== undefined && (confidenceThreshold < 0 || confidenceThreshold > 1)) {
      return apiError("Confidence threshold must be between 0 and 1", 400);
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(responseStyle !== undefined && { responseStyle }),
        ...(confidenceThreshold !== undefined && { confidenceThreshold }),
        version: { increment: 1 },
      },
      include: {
        agronomist: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return apiSuccess(agent);
  } catch (err) {
    console.error("PUT /api/agents/[id] error:", err);
    return apiError("Failed to update agent", 500);
  }
}

// DELETE /api/agents/:id — Delete agent
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
    const existing = await prisma.agent.findUnique({
      where: { id },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    if (!existing) {
      return apiError("Agent not found", 404);
    }

    if (existing.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    await prisma.agent.delete({ where: { id } });

    return apiSuccess({ message: "Agent deleted" });
  } catch (err) {
    console.error("DELETE /api/agents/[id] error:", err);
    return apiError("Failed to delete agent", 500);
  }
}

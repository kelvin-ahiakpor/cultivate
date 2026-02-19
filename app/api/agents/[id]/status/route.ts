import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// PATCH /api/agents/:id/status — Toggle isActive
export async function PATCH(
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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return apiError("isActive must be a boolean", 400);
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: { isActive },
    });

    return apiSuccess(agent);
  } catch (err) {
    console.error("PATCH /api/agents/[id]/status error:", err);
    return apiError("Failed to update agent status", 500);
  }
}

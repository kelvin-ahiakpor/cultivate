import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// GET /api/flagged-queries/:id — Full flagged query with conversation context
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
    const flaggedQuery = await prisma.flaggedQuery.findUnique({
      where: { id },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            confidenceScore: true,
            sourcesCited: true,
            createdAt: true,
            conversation: {
              select: {
                id: true,
                title: true,
                farmer: { select: { id: true, name: true } },
                messages: {
                  orderBy: { createdAt: "asc" },
                  select: {
                    id: true,
                    content: true,
                    role: true,
                    confidenceScore: true,
                    createdAt: true,
                    sender: { select: { id: true, name: true, role: true } },
                  },
                },
              },
            },
          },
        },
        agent: { select: { id: true, name: true, confidenceThreshold: true } },
        agronomist: { select: { id: true, name: true } },
      },
    });

    if (!flaggedQuery) return apiError("Flagged query not found", 404);

    // Verify org access via agent
    const agent = await prisma.agent.findUnique({
      where: { id: flaggedQuery.agentId },
      select: { organizationId: true },
    });

    if (agent?.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(flaggedQuery);
  } catch (err) {
    console.error("GET /api/flagged-queries/[id] error:", err);
    return apiError("Failed to fetch flagged query", 500);
  }
}

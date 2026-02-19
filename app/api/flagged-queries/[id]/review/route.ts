import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// PATCH /api/flagged-queries/:id/review — Verify or correct a flagged query
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
    const existing = await prisma.flaggedQuery.findUnique({
      where: { id },
      include: { agent: { select: { organizationId: true } } },
    });

    if (!existing) return apiError("Flagged query not found", 404);

    if (existing.agent.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    if (existing.status !== "PENDING") {
      return apiError("This query has already been reviewed", 400);
    }

    const body = await request.json();
    const { status, agronomistResponse, verificationNotes } = body;

    if (!status || !["VERIFIED", "CORRECTED"].includes(status)) {
      return apiError("Status must be VERIFIED or CORRECTED", 400);
    }

    if (status === "CORRECTED" && !agronomistResponse) {
      return apiError("Corrected queries require an agronomist response", 400);
    }

    const flaggedQuery = await prisma.flaggedQuery.update({
      where: { id },
      data: {
        status,
        agronomistResponse: agronomistResponse || null,
        verificationNotes: verificationNotes || null,
        reviewedAt: new Date(),
      },
      include: {
        message: { select: { id: true, content: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(flaggedQuery);
  } catch (err) {
    console.error("PATCH /api/flagged-queries/[id]/review error:", err);
    return apiError("Failed to review flagged query", 500);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// PATCH /api/flagged-queries/:id/revoke — Revoke a review (back to PENDING)
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

    // Can only revoke reviewed queries (VERIFIED or CORRECTED)
    if (existing.status === "PENDING") {
      return apiError("Cannot revoke a pending query", 400);
    }

    // Save to audit history before revoking
    await prisma.reviewHistory.create({
      data: {
        flaggedQueryId: id,
        agronomistId: session!.user.id,
        action: "REVOKED",
        statusBefore: existing.status,
        statusAfter: "PENDING",
        agronomistResponse: existing.agronomistResponse,
        verificationNotes: existing.verificationNotes,
      },
    });

    // Now clear the review and set back to PENDING
    const flaggedQuery = await prisma.flaggedQuery.update({
      where: { id },
      data: {
        status: "PENDING",
        agronomistResponse: null,
        verificationNotes: null,
        reviewedAt: null,
      },
      include: {
        message: { select: { id: true, content: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(flaggedQuery);
  } catch (err) {
    console.error("PATCH /api/flagged-queries/[id]/revoke error:", err);
    return apiError("Failed to revoke review", 500);
  }
}

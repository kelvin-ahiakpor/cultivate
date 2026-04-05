import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { FlaggedQueryStatus } from "@prisma/client";

// GET /api/flagged-queries — List flagged queries for the org
export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as FlaggedQueryStatus | null;
  const agentId = searchParams.get("agentId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = {
      agent: { organizationId: session!.user.organizationId },
    };

    if (status) {
      where.status = status;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    const flaggedQueries = await prisma.flaggedQuery.findMany({
      where,
      select: {
        id: true,
        status: true,
        farmerReason: true,
        farmerUpdates: true,
        agronomistResponse: true,
        verificationNotes: true,
        reviewedAt: true,
        createdAt: true,
        message: {
          select: {
            id: true,
            content: true,
            confidenceScore: true,
            createdAt: true,
            conversation: {
              select: {
                id: true,
                title: true,
                farmer: { select: { id: true, name: true } },
                messages: {
                  where: { role: "USER" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { content: true },
                },
              },
            },
          },
        },
        agent: { select: { id: true, name: true, confidenceThreshold: true } },
        agronomist: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    const total = await prisma.flaggedQuery.count({ where });

    return apiSuccess({
      flaggedQueries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return await handleApiError("GET /api/flagged-queries", err, "Failed to fetch flagged queries");
  }
}

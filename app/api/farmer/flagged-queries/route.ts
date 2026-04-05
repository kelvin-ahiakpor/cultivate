import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { FlaggedQueryStatus } from "@prisma/client";

// GET /api/farmer/flagged-queries — List flagged queries for the current farmer
export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "FARMER", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as FlaggedQueryStatus | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = {
      message: {
        conversation: {
          farmerId: session!.user.id,
        },
      },
    };

    if (status) {
      where.status = status;
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
            conversation: {
              select: {
                id: true,
                title: true,
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
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    });
    const total = await prisma.flaggedQuery.count({ where });

    return apiSuccess({
      flaggedQueries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return await handleApiError("GET /api/farmer/flagged-queries", err, "Failed to fetch flagged queries");
  }
}

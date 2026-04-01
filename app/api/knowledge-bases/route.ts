import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// GET /api/knowledge-bases — List knowledge base documents for the org
export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const agentId = searchParams.get("agentId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = {
      organizationId: session!.user.organizationId,
    };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    // Filter by agent needs to check the join table
    let kbIds: string[] | undefined;
    if (agentId) {
      const agentKbs = await prisma.agentKnowledgeBase.findMany({
        where: { agentId },
        select: { knowledgeBaseId: true },
      });
      kbIds = agentKbs.map((akb) => akb.knowledgeBaseId);
      if (kbIds.length === 0) {
        // No KBs for this agent - return empty
        return apiSuccess({
          documents: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      where.id = { in: kbIds };
    }

    const [documents, total] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where,
        include: {
          agents: {
            include: {
              agent: { select: { id: true, name: true } },
            },
            orderBy: { isPrimary: "desc" }, // Primary first
          },
          agronomist: { select: { id: true, name: true } },
        },
        orderBy: { uploadedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.knowledgeBase.count({ where }),
    ]);

    return apiSuccess({
      documents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/knowledge-bases error:", err);
    return apiError("Failed to fetch knowledge bases", 500);
  }
}

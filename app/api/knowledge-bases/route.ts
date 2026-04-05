import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getReferencedInChatsCounts(
  knowledgeBaseIds: string[],
  organizationId: string
) {
  if (knowledgeBaseIds.length === 0) return new Map<string, number>();

  const rows = await prisma.$queryRaw<Array<{ knowledgeBaseId: string; count: bigint | number }>>(
    Prisma.sql`
      SELECT
        cited.kb_id AS "knowledgeBaseId",
        COUNT(DISTINCT m."conversationId") AS count
      FROM "messages" m
      INNER JOIN "conversations" c ON c."id" = m."conversationId"
      INNER JOIN "agents" a ON a."id" = c."agentId"
      CROSS JOIN LATERAL unnest(m."sourcesCited") AS cited(kb_id)
      WHERE m."role" = CAST('ASSISTANT' AS "MessageRole")
        AND a."organizationId" = ${organizationId}
        AND cited.kb_id IN (${Prisma.join(knowledgeBaseIds)})
      GROUP BY cited.kb_id
    `
  );

  return new Map(
    rows.map((row) => [row.knowledgeBaseId, Number(row.count)])
  );
}

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

    const orgId = session!.user.organizationId;

    const documents = await prisma.knowledgeBase.findMany({
      where,
      include: {
        agents: {
          include: {
            agent: { select: { id: true, name: true } },
          },
          orderBy: { isPrimary: "desc" },
        },
        agronomist: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: "desc" },
      skip,
      take: limit,
    });
    const total = await prisma.knowledgeBase.count({ where });

    const referenceCounts = await getReferencedInChatsCounts(
      documents.map((doc) => doc.id),
      orgId
    );

    const documentsWithReferences = documents.map((doc) => ({
      ...doc,
      referencedInChats: referenceCounts.get(doc.id) ?? 0,
    }));

    return apiSuccess({
      documents: documentsWithReferences,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return await handleApiError("GET /api/knowledge-bases", err, "Failed to fetch knowledge bases");
  }
}

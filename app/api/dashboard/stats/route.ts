/**
 * Dashboard Stats API.
 *
 * GET /api/dashboard/stats
 *
 * Returns the three key numbers shown on the agronomist dashboard overview:
 *   - activeAgents:  count of agents with isActive = true for this org
 *   - knowledgeDocs: count of knowledge base documents for this org
 *   - pendingFlags:  count of flagged queries with status = PENDING for this org
 *
 * These power the stat cards on the overview page (currently hardcoded as 5, 18, 4).
 * Phase 5 will replace those hardcoded values with a SWR call to this endpoint.
 */
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const orgId = session!.user.organizationId;

  try {
    // Run all three counts in parallel — they're independent queries
    const activeAgents = await prisma.agent.count({
      where: { organizationId: orgId, isActive: true },
    });
    const knowledgeDocs = await prisma.knowledgeBase.count({
      where: { organizationId: orgId },
    });
    const pendingFlags = await prisma.flaggedQuery.count({
      where: {
        status: "PENDING",
        agent: { organizationId: orgId },
      },
    });

    return apiSuccess({ activeAgents, knowledgeDocs, pendingFlags });
  } catch (err) {
    return await handleApiError("GET /api/dashboard/stats", err, "Failed to fetch dashboard stats");
  }
}

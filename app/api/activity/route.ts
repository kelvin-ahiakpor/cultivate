/**
 * Activity Feed API.
 *
 * GET /api/activity?days=7&limit=20
 *
 * Returns a merged, time-sorted activity feed for the agronomist dashboard.
 * No new database table — queries existing tables and combines results.
 *
 * Activity types:
 *   - "flagged_created"   — a new query was flagged (low confidence)
 *   - "flagged_verified"  — agronomist verified an AI response as correct
 *   - "flagged_corrected" — agronomist corrected an AI response
 *   - "conversation_started" — a farmer started a new conversation
 *   - "agent_created"     — a new agent was created
 *   - "knowledge_uploaded" — a knowledge base document was uploaded
 *
 * Each item has: { type, description, agentName?, metadata?, timestamp }
 *
 * The overview page currently shows hardcoded mock activity items.
 * Phase 5 will replace those with a SWR call to this endpoint.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

interface ActivityItem {
  type: string;
  description: string;
  agentName: string | null;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const orgId = session!.user.organizationId;
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");
  const limit = parseInt(searchParams.get("limit") || "20");

  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // Run all queries in parallel — they're independent
    const [flaggedQueries, conversations, agents, knowledgeBases] = await Promise.all([
      // Flagged queries: new flags + reviewed flags
      prisma.flaggedQuery.findMany({
        where: {
          agent: { organizationId: orgId },
          OR: [
            { createdAt: { gte: since } },
            { reviewedAt: { gte: since } },
          ],
        },
        include: {
          message: {
            select: { content: true },
          },
          agent: {
            select: { name: true },
          },
          agronomist: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // New conversations started
      prisma.conversation.findMany({
        where: {
          createdAt: { gte: since },
          agent: { organizationId: orgId },
        },
        include: {
          farmer: { select: { name: true } },
          agent: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // New agents created
      prisma.agent.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: since },
        },
        include: {
          _count: { select: { knowledgeBases: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Knowledge bases uploaded
      prisma.knowledgeBase.findMany({
        where: {
          organizationId: orgId,
          uploadedAt: { gte: since },
        },
        include: {
          agent: { select: { name: true } },
          agronomist: { select: { name: true } },
        },
        orderBy: { uploadedAt: "desc" },
      }),
    ]);

    // Merge all activity into a single sorted list
    const activities: ActivityItem[] = [];

    // Flagged queries — can generate multiple activity types
    for (const fq of flaggedQueries) {
      const preview = fq.message.content.slice(0, 80);

      // "Created" event
      if (fq.createdAt >= since) {
        activities.push({
          type: "flagged_created",
          description: `New flagged query about "${preview}"`,
          agentName: fq.agent.name,
          metadata: {
            flaggedQueryId: fq.id,
            confidenceScore: fq.message.content ? undefined : undefined, // score is on the message, not fq
          },
          timestamp: fq.createdAt,
        });
      }

      // "Reviewed" event (verified or corrected)
      if (fq.reviewedAt && fq.reviewedAt >= since) {
        const action = fq.status === "VERIFIED" ? "verified" : "corrected";
        activities.push({
          type: `flagged_${action}`,
          description: `${fq.agronomist.name} ${action} a response about "${preview}"`,
          agentName: fq.agent.name,
          metadata: { flaggedQueryId: fq.id },
          timestamp: fq.reviewedAt,
        });
      }
    }

    // Conversations started
    for (const conv of conversations) {
      activities.push({
        type: "conversation_started",
        description: `${conv.farmer.name} started a new conversation${conv.title ? ` about ${conv.title}` : ""}`,
        agentName: conv.agent.name,
        metadata: { conversationId: conv.id },
        timestamp: conv.createdAt,
      });
    }

    // Agents created
    for (const agent of agents) {
      activities.push({
        type: "agent_created",
        description: `${agent.name} agent was created`,
        agentName: agent.name,
        metadata: {
          agentId: agent.id,
          knowledgeBaseCount: agent._count.knowledgeBases,
        },
        timestamp: agent.createdAt,
      });
    }

    // Knowledge bases uploaded
    for (const kb of knowledgeBases) {
      activities.push({
        type: "knowledge_uploaded",
        description: `${kb.agronomist.name} uploaded "${kb.title}"`,
        agentName: kb.agent.name,
        metadata: {
          knowledgeBaseId: kb.id,
          fileName: kb.fileName,
          fileType: kb.fileType,
        },
        timestamp: kb.uploadedAt,
      });
    }

    // Sort by timestamp (newest first) and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limited = activities.slice(0, limit);

    return apiSuccess({ activities: limited, total: activities.length });
  } catch (err) {
    console.error("GET /api/activity error:", err);
    return apiError("Failed to fetch activity feed", 500);
  }
}

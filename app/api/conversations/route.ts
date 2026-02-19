import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// GET /api/conversations — List conversations
// FARMER: only their own. AGRONOMIST/ADMIN: all in their org.
export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const agentId = searchParams.get("agentId");
  const skip = (page - 1) * limit;

  const user = session!.user;

  try {
    const where: Record<string, unknown> = {
      agent: { organizationId: user.organizationId },
    };

    // Farmers only see their own conversations
    if (user.role === "FARMER") {
      where.farmerId = user.id;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true } },
          farmer: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    // Flatten lastMessage
    const formatted = conversations.map((c) => ({
      ...c,
      lastMessage: c.messages[0] || null,
      messages: undefined,
    }));

    return apiSuccess({
      conversations: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/conversations error:", err);
    return apiError("Failed to fetch conversations", 500);
  }
}

// POST /api/conversations — Create a new conversation
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "FARMER", "ADMIN")) {
    return apiError("Only farmers can start conversations", 403);
  }

  try {
    const body = await request.json();
    const { agentId, title } = body;

    if (!agentId) {
      return apiError("agentId is required", 400);
    }

    // Verify agent exists, is active, and belongs to an org the farmer is in
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });

    if (!agent) {
      return apiError("Agent not found", 404);
    }

    if (!agent.isActive) {
      return apiError("Agent is not currently active", 400);
    }

    if (agent.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: title || null,
        farmerId: session!.user.id,
        agentId,
      },
      include: {
        agent: { select: { id: true, name: true } },
        farmer: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(conversation, 201);
  } catch (err) {
    console.error("POST /api/conversations error:", err);
    return apiError("Failed to create conversation", 500);
  }
}

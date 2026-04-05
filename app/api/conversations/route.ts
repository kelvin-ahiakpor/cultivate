import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

function normalizeConversationTitle(title: string | null | undefined) {
  if (!title) return title ?? null;
  return title.replace(/^#+\s*/, "").trim();
}

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

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        farmer: { select: { id: true, name: true } },
        farmerSystem: { select: { id: true, name: true } },
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
    });
    const total = await prisma.conversation.count({ where });

    // Flatten lastMessage
    const formatted = conversations.map((c) => ({
      ...c,
      title: normalizeConversationTitle(c.title),
      lastMessage: c.messages[0] || null,
      messages: undefined,
    }));

    return apiSuccess({
      conversations: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return await handleApiError("GET /api/conversations", err, "Failed to fetch conversations");
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
    const { agentId, title, farmerSystemId } = body;
    const normalizedTitle = normalizeConversationTitle(title);

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

    let validFarmerSystemId: string | null = null;
    if (farmerSystemId) {
      const system = await prisma.farmerSystem.findFirst({
        where: {
          id: farmerSystemId,
          farmerId: session!.user.id,
          organizationId: session!.user.organizationId,
        },
        select: { id: true },
      });

      if (!system) {
        return apiError("System not found", 404);
      }

      validFarmerSystemId = system.id;
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: normalizedTitle,
        farmerId: session!.user.id,
        agentId,
        farmerSystemId: validFarmerSystemId,
      },
      include: {
        agent: { select: { id: true, name: true } },
        farmer: { select: { id: true, name: true } },
        farmerSystem: { select: { id: true, name: true } },
      },
    });

    return apiSuccess({
      ...conversation,
      title: normalizeConversationTitle(conversation.title),
    }, 201);
  } catch (err) {
    return await handleApiError("POST /api/conversations", err, "Failed to create conversation");
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

// GET /api/agents — List agents for the user's org
export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const where = {
      organizationId: session!.user.organizationId,
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          _count: {
            select: {
              conversations: true,
              knowledgeBases: true,
              flaggedQueries: true,
            },
          },
          agronomist: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.agent.count({ where }),
    ]);

    return apiSuccess({
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/agents error:", err);
    return apiError("Failed to fetch agents", 500);
  }
}

// POST /api/agents — Create a new agent
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  try {
    const body = await request.json();
    const { name, systemPrompt, responseStyle, confidenceThreshold } = body;

    if (!name || !systemPrompt) {
      return apiError("Name and system prompt are required", 400);
    }

    const threshold = confidenceThreshold ?? 0.7;
    if (threshold < 0 || threshold > 1) {
      return apiError("Confidence threshold must be between 0 and 1", 400);
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        systemPrompt,
        responseStyle: responseStyle || null,
        confidenceThreshold: threshold,
        agronomistId: session!.user.id,
        organizationId: session!.user.organizationId,
      },
      include: {
        agronomist: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return apiSuccess(agent, 201);
  } catch (err) {
    console.error("POST /api/agents error:", err);
    return apiError("Failed to create agent", 500);
  }
}

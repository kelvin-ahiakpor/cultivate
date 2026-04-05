import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError, apiSuccess } from "@/lib/api-utils";

async function getConversationForFarmer(conversationId: string, userId: string, organizationId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      farmerId: userId,
      agent: { organizationId },
    },
    select: {
      id: true,
      farmerSystemId: true,
      farmerSystem: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = session!.user;
  if (user.role !== "FARMER" && user.role !== "ADMIN") {
    return apiError("Only farmers can manage chat systems", 403);
  }

  const { id } = await params;
  const conversation = await getConversationForFarmer(id, user.id, user.organizationId);
  if (!conversation) return apiError("Conversation not found", 404);

  const body = await request.json();
  const { farmerSystemId } = body;

  if (!farmerSystemId || typeof farmerSystemId !== "string") {
    return apiError("farmerSystemId is required", 400);
  }

  const system = await prisma.farmerSystem.findFirst({
    where: {
      id: farmerSystemId,
      farmerId: user.id,
      organizationId: user.organizationId,
    },
    select: { id: true, name: true },
  });

  if (!system) return apiError("System not found", 404);

  const updated = await prisma.conversation.update({
    where: { id },
    data: { farmerSystemId: system.id },
    include: {
      farmerSystem: { select: { id: true, name: true } },
    },
  });

  return apiSuccess({
    message: "Chat added to system",
    farmerSystem: updated.farmerSystem,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = session!.user;
  if (user.role !== "FARMER" && user.role !== "ADMIN") {
    return apiError("Only farmers can manage chat systems", 403);
  }

  const { id } = await params;
  const conversation = await getConversationForFarmer(id, user.id, user.organizationId);
  if (!conversation) return apiError("Conversation not found", 404);

  const updated = await prisma.conversation.update({
    where: { id },
    data: { farmerSystemId: null },
  });

  return apiSuccess({
    message: "Chat removed from system",
    conversationId: updated.id,
  });
}

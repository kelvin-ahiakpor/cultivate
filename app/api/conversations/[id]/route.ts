import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError, apiSuccess } from "@/lib/api-utils";

// Helper: check if user can access this conversation
async function getConversationWithAuth(id: string, userId: string, organizationId: string, role: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      agent: { select: { id: true, name: true, organizationId: true } },
      farmer: { select: { id: true, name: true } },
    },
  });

  if (!conversation) return { conversation: null, error: "not_found" };

  // Farmers can only access their own conversations
  if (role === "FARMER" && conversation.farmerId !== userId) {
    return { conversation: null, error: "forbidden" };
  }

  // Agronomists/admins can access conversations in their org
  if (role !== "FARMER" && conversation.agent.organizationId !== organizationId) {
    return { conversation: null, error: "forbidden" };
  }

  return { conversation, error: null };
}

// GET /api/conversations/:id — Full conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const user = session!.user;

  const result = await getConversationWithAuth(id, user.id, user.organizationId, user.role);

  if (result.error === "not_found") return apiError("Conversation not found", 404);
  if (result.error === "forbidden") return apiError("Forbidden", 403);

  return apiSuccess(result.conversation);
}

// PUT /api/conversations/:id — Rename conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const user = session!.user;

  const result = await getConversationWithAuth(id, user.id, user.organizationId, user.role);

  if (result.error === "not_found") return apiError("Conversation not found", 404);
  if (result.error === "forbidden") return apiError("Forbidden", 403);

  try {
    const body = await request.json();
    const { title } = body;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { title },
    });

    return apiSuccess(conversation);
  } catch (err) {
    console.error("PUT /api/conversations/[id] error:", err);
    return apiError("Failed to update conversation", 500);
  }
}

// DELETE /api/conversations/:id — Delete conversation + all messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const user = session!.user;

  const result = await getConversationWithAuth(id, user.id, user.organizationId, user.role);

  if (result.error === "not_found") return apiError("Conversation not found", 404);
  if (result.error === "forbidden") return apiError("Forbidden", 403);

  try {
    await prisma.conversation.delete({ where: { id } });
    return apiSuccess({ message: "Conversation deleted" });
  } catch (err) {
    console.error("DELETE /api/conversations/[id] error:", err);
    return apiError("Failed to delete conversation", 500);
  }
}

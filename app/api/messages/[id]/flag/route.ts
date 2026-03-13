import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";

/**
 * POST /api/messages/:id/flag
 *
 * Manually flag a message for agronomist review.
 * Farmers can flag responses they think are incorrect or need expert verification.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "FARMER", "ADMIN")) {
    return apiError("Only farmers can flag messages", 403);
  }

  const { id: messageId } = await params;
  const body = await request.json().catch(() => ({}));
  const { reason } = body;

  try {
    // Get the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            agent: {
              select: {
                id: true,
                organizationId: true,
                agronomistId: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return apiError("Message not found", 404);
    }

    // Verify the farmer owns this conversation
    if (message.conversation.farmerId !== session!.user.id && session!.user.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    // Only flag assistant messages
    if (message.role !== "ASSISTANT") {
      return apiError("Can only flag assistant messages", 400);
    }

    // Check if already flagged
    const existingFlag = await prisma.flaggedQuery.findUnique({
      where: { messageId },
    });

    if (existingFlag) {
      return apiError("Message already flagged", 400);
    }

    // Create the flagged query
    const flaggedQuery = await prisma.flaggedQuery.create({
      data: {
        messageId,
        agentId: message.conversation.agent.id,
        agronomistId: message.conversation.agent.agronomistId,
        farmerReason: reason || null,
      },
    });

    return apiSuccess({
      message: "Message flagged for review",
      flaggedQuery,
    });
  } catch (err) {
    console.error("POST /api/messages/[id]/flag error:", err);
    return apiError("Failed to flag message", 500);
  }
}

/**
 * PATCH /api/messages/:id/flag
 *
 * Add an update to an existing flag.
 * Farmers can add additional context or corrections to their original flag.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "FARMER", "ADMIN")) {
    return apiError("Only farmers can update flags", 403);
  }

  const { id: messageId } = await params;
  const body = await request.json().catch(() => ({}));
  const { update } = body;

  if (!update || !update.trim()) {
    return apiError("Update text is required", 400);
  }

  try {
    // Get the flag and verify ownership
    const flag = await prisma.flaggedQuery.findUnique({
      where: { messageId },
      include: {
        message: {
          include: {
            conversation: true,
          },
        },
      },
    });

    if (!flag) {
      return apiError("Message is not flagged", 404);
    }

    // Verify the farmer owns this conversation
    if (flag.message.conversation.farmerId !== session!.user.id && session!.user.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    // Append update with timestamp
    const timestamp = new Date().toISOString();
    const newUpdate = `[${timestamp}] ${update}`;
    const updatedText = flag.farmerUpdates
      ? `${flag.farmerUpdates}\n\n${newUpdate}`
      : newUpdate;

    const updatedFlag = await prisma.flaggedQuery.update({
      where: { messageId },
      data: {
        farmerUpdates: updatedText,
      },
    });

    return apiSuccess({
      message: "Flag updated",
      flaggedQuery: updatedFlag,
    });
  } catch (err) {
    console.error("PATCH /api/messages/[id]/flag error:", err);
    return apiError("Failed to update flag", 500);
  }
}

/**
 * DELETE /api/messages/:id/flag
 *
 * Unflag a message (remove from review queue).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "FARMER", "ADMIN")) {
    return apiError("Only farmers can unflag messages", 403);
  }

  const { id: messageId } = await params;

  try {
    // Get the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return apiError("Message not found", 404);
    }

    // Verify the farmer owns this conversation
    if (message.conversation.farmerId !== session!.user.id && session!.user.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    // Delete the flag if it exists
    const deletedFlag = await prisma.flaggedQuery.deleteMany({
      where: { messageId },
    });

    if (deletedFlag.count === 0) {
      return apiError("Message was not flagged", 404);
    }

    return apiSuccess({
      message: "Flag removed",
    });
  } catch (err) {
    console.error("DELETE /api/messages/[id]/flag error:", err);
    return apiError("Failed to remove flag", 500);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError, handleApiError } from "@/lib/api-utils";
import { createSignedChatImageUrl } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const user = session!.user;

  try {
    const attachment = await prisma.messageAttachment.findUnique({
      where: { id },
      select: {
        id: true,
        fileUrl: true,
        storagePath: true,
        message: {
          select: {
            conversation: {
              select: {
                farmerId: true,
                agent: {
                  select: {
                    agronomistId: true,
                    organizationId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) return apiError("Attachment not found", 404);

    const conversation = attachment.message.conversation;
    const canAccess = user.role === "FARMER"
      ? conversation.farmerId === user.id
      : user.role === "ADMIN"
        ? conversation.agent.organizationId === user.organizationId
        : conversation.agent.agronomistId === user.id;

    if (!canAccess) return apiError("Forbidden", 403);

    if (!attachment.storagePath) {
      return NextResponse.redirect(attachment.fileUrl, { status: 302 });
    }

    const signedUrl = await createSignedChatImageUrl(attachment.storagePath, 600);
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    return await handleApiError(
      "GET /api/message-attachments/[id]",
      err,
      "Failed to load attachment"
    );
  }
}

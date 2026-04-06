import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError, apiSuccess } from "@/lib/api-utils";

// POST /api/push/subscribe — save a push subscription for the current user
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { endpoint, keys } = body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return apiError("Invalid subscription payload", 400);
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: session!.user.id },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: session!.user.id },
    });
    return apiSuccess({ subscribed: true });
  } catch (err) {
    console.error("POST /api/push/subscribe error:", err);
    return apiError("Failed to save subscription", 500);
  }
}

// DELETE /api/push/subscribe — remove a push subscription
export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { endpoint } = body ?? {};

  if (!endpoint) return apiError("Missing endpoint", 400);

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session!.user.id },
    });
    return apiSuccess({ unsubscribed: true });
  } catch (err) {
    console.error("DELETE /api/push/subscribe error:", err);
    return apiError("Failed to remove subscription", 500);
  }
}

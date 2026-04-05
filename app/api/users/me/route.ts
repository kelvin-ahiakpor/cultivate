import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/users/me
 * Update the authenticated user's profile fields (name, etc.)
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(apiError("Name must be a non-empty string", 400), { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session!.user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(apiSuccess({ user: updatedUser }));
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(apiError("Failed to update user", 500), { status: 500 });
  }
}

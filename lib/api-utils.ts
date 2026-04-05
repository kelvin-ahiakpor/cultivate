import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { recoverFromDatabaseError } from "@/lib/prisma";

/**
 * Get the authenticated session. Returns null if not logged in.
 */
export async function getAuthSession() {
  const session = await auth();
  return session;
}

/**
 * Require authentication. Returns the session or a 401 response.
 */
export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user) {
    return { session: null, error: apiError("Unauthorized", 401) };
  }
  return { session, error: null };
}

/**
 * Check if user has one of the required roles.
 */
export function hasRole(userRole: UserRole, ...allowedRoles: UserRole[]) {
  return allowedRoles.includes(userRole);
}

/**
 * Standard JSON error response.
 */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard JSON success response.
 */
export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function handleApiError(
  context: string,
  error: unknown,
  fallbackMessage: string
) {
  console.error(`${context}:`, error);

  if (await recoverFromDatabaseError(error)) {
    return apiError("Database is busy right now. Please retry in a moment.", 503);
  }

  return apiError(fallbackMessage, 500);
}

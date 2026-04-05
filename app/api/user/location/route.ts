import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/user/location
 * Update the authenticated user's profile fields used in settings
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, location, gpsCoordinates } = body;

    if (name !== null && name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json(apiError("Invalid name format", 400), { status: 400 });
      }

      if (name.trim().length === 0) {
        return NextResponse.json(apiError("Name cannot be empty", 400), { status: 400 });
      }
    }

    // Validate input
    if (location !== null && location !== undefined && typeof location !== "string") {
      return NextResponse.json(apiError("Invalid location format", 400), { status: 400 });
    }

    if (gpsCoordinates !== null && gpsCoordinates !== undefined) {
      if (typeof gpsCoordinates !== "string") {
        return NextResponse.json(apiError("Invalid GPS coordinates format", 400), { status: 400 });
      }

      // Basic validation: should be in "lat,lon" format
      if (gpsCoordinates.trim() !== "") {
        const parts = gpsCoordinates.split(",");
        if (parts.length !== 2) {
          return NextResponse.json(apiError("GPS coordinates must be in 'lat,lon' format", 400), { status: 400 });
        }

        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          return NextResponse.json(apiError("Invalid GPS coordinates (lat: -90 to 90, lon: -180 to 180)", 400), { status: 400 });
        }
      }
    }

    // Update user location
    const updatedUser = await prisma.user.update({
      where: { id: session!.user.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        location: location?.trim() || null,
        gpsCoordinates: gpsCoordinates?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        location: true,
        gpsCoordinates: true,
      },
    });

    return NextResponse.json(
      apiSuccess({
        user: updatedUser,
      })
    );
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json(apiError("Failed to update location", 500), { status: 500 });
  }
}

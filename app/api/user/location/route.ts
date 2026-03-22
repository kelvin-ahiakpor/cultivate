import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/user/location
 * Update the authenticated user's location and GPS coordinates
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { location, gpsCoordinates } = body;

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
        location: location?.trim() || null,
        gpsCoordinates: gpsCoordinates?.trim() || null,
      },
      select: {
        id: true,
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

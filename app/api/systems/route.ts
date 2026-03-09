import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/systems — fetch the current farmer's systems
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const systems = await prisma.farmerSystem.findMany({
    where: { farmerId: session.user.id },
    orderBy: { purchaseDate: "desc" },
  });

  return NextResponse.json({ data: { systems } });
}

// POST /api/systems — farmer self-registers a system, or admin registers on behalf
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, type, description, purchaseDate, installationDate, warrantyUntil, specifications, farmerId } = body;

  if (!name || !type || !description || !purchaseDate) {
    return NextResponse.json({ error: "Missing required fields: name, type, description, purchaseDate" }, { status: 400 });
  }

  // Admins can register for another farmer; farmers register for themselves
  const targetFarmerId =
    (session.user.role === "ADMIN" || session.user.role === "AGRONOMIST") && farmerId
      ? farmerId
      : session.user.id;

  const system = await prisma.farmerSystem.create({
    data: {
      name,
      type,
      description,
      purchaseDate: new Date(purchaseDate),
      installationDate: installationDate ? new Date(installationDate) : null,
      warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
      specifications: specifications ?? undefined,
      farmerId: targetFarmerId,
      organizationId: session.user.organizationId,
    },
  });

  return NextResponse.json({ data: { system } }, { status: 201 });
}

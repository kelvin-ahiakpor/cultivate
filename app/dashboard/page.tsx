import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

const VALID_DASHBOARD_VIEWS = ["overview", "agents", "knowledge", "flagged", "chats", "analytics", "agent-edit", "settings"] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string; agent?: string; c?: string }> }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "AGRONOMIST" && session.user.role !== "ADMIN") {
    redirect("/chat");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      location: true,
      gpsCoordinates: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const rawView = params.view;
  const initialView = (VALID_DASHBOARD_VIEWS as readonly string[]).includes(rawView || "")
    ? rawView!
    : "overview";

  return (
    <DashboardClient
      user={{
        id: user.id,
        name: user.name || "Agronomist",
        email: user.email || "",
        role: user.role || "AGRONOMIST",
        location: user.location,
        gpsCoordinates: user.gpsCoordinates,
      }}
      initialView={initialView}
      initialAgentId={params.agent || null}
      initialChatId={params.c || null}
    />
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

const VALID_DASHBOARD_VIEWS = ["overview", "agents", "knowledge", "flagged", "chats", "analytics", "agent-edit"] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string; agent?: string }> }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "AGRONOMIST" && session.user.role !== "ADMIN") {
    redirect("/chat");
  }

  const params = await searchParams;
  const rawView = params.view;
  const initialView = (VALID_DASHBOARD_VIEWS as readonly string[]).includes(rawView || "")
    ? rawView!
    : "overview";

  return (
    <DashboardClient
      user={{
        name: session.user.name || "Agronomist",
        email: session.user.email || "",
        role: session.user.role || "AGRONOMIST",
      }}
      initialView={initialView}
      initialAgentId={params.agent || null}
    />
  );
}

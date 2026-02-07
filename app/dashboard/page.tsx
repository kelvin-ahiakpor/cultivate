import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "AGRONOMIST" && session.user.role !== "ADMIN") {
    redirect("/chat");
  }

  return (
    <DashboardClient
      user={{
        name: session.user.name || "Agronomist",
        email: session.user.email || "",
        role: session.user.role || "AGRONOMIST",
      }}
    />
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChatPageClient from "./chat-client";

export default async function ChatPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "FARMER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <ChatPageClient
      user={{
        name: session.user.name || "User",
        email: session.user.email || "",
        role: session.user.role || "FARMER",
      }}
    />
  );
}

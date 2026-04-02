import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatPageClient from "./chat-client";

const VALID_CHAT_VIEWS = ["chat", "chats", "systems", "settings"] as const;
type ChatView = typeof VALID_CHAT_VIEWS[number];

export default async function ChatPage({ searchParams }: { searchParams: { view?: string; c?: string } }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "FARMER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch full user data including location fields
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

  const rawView = searchParams.view;
  const initialView = (VALID_CHAT_VIEWS as readonly string[]).includes(rawView || "")
    ? (rawView as ChatView)
    : "chat";
  const initialConversationId = searchParams.c || null;

  return (
    <ChatPageClient
      user={{
        id: user.id,
        name: user.name || "User",
        email: user.email || "",
        role: user.role || "FARMER",
        location: user.location,
        gpsCoordinates: user.gpsCoordinates,
      }}
      initialView={initialView}
      initialConversationId={initialConversationId}
    />
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatPageClient from "./chat-client";

export default async function ChatPage() {
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
    />
  );
}

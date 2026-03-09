import ChatPageClient from "@/app/chat/chat-client";

export default function DemoChatPage() {
  // Demo mode: bypass auth, use hardcoded farmer user
  return (
    <ChatPageClient
      user={{
        name: "Demo Farmer",
        email: "demo-farmer@example.com",
        role: "FARMER",
      }}
      demoMode={true}
    />  );
}

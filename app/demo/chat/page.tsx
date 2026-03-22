import ChatPageClient from "@/app/chat/chat-client";

export default function DemoChatPage() {
  // Demo mode: bypass auth, use hardcoded farmer user
  return (
    <ChatPageClient
      user={{
        id: "demo-farmer-id",
        name: "Demo Farmer",
        email: "demo-farmer@example.com",
        role: "FARMER",
        location: "Accra, Ghana",
        gpsCoordinates: "5.6037,-0.1870",
      }}
      demoMode={true}
    />  );
}

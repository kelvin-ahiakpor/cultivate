import DashboardClient from "@/app/dashboard/dashboard-client";

export default function DemoDashboardPage() {
  // Demo mode: bypass auth, use hardcoded agronomist user
  return (
    <DashboardClient
      user={{
        id: "demo",
        name: "Demo Agronomist",
        email: "demo@farmitecture.com",
        role: "AGRONOMIST",
        location: "Accra, Ghana",
        gpsCoordinates: "5.6037,-0.1870",
      }}
      demoMode={true}
    />
  );
}

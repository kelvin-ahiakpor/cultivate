import DashboardClient from "@/app/dashboard/dashboard-client";

export default function DemoDashboardPage() {
  // Demo mode: bypass auth, use hardcoded agronomist user
  return (
    <DashboardClient
      user={{
        name: "Demo Agronomist",
        email: "demo@farmitecture.com",
        role: "AGRONOMIST",
      }}
    />
  );
}

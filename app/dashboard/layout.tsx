import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#1E1E1E",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-[#1E1E1E]">{children}</div>;
}

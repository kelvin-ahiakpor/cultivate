import type { Metadata } from "next";
import { Rubik, Playfair_Display } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

// Playfair Display as substitute for Recoleta (stylish serif for hero)
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Cultivate - AI-Powered Agricultural Extension",
  description: "Expert farming advice, anytime. AI agents trained by agronomists to deliver personalized agricultural guidance to farmers across Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${rubik.variable} ${playfair.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

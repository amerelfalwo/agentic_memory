import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MemoryProvider } from "../context/MemoryContext";
import { AppHeader } from "../components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic Memory AI Engine | CoALA Architecture",
  description: "Enterprise Cognitive Memory Architecture with LangGraph and Weaviate",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F6F0] text-[#242A25]">
        <MemoryProvider>
          <AppHeader />
          <main className="flex-1 flex flex-col">{children}</main>
        </MemoryProvider>
      </body>
    </html>
  );
}

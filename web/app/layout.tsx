import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NagarSetu · Grievance Router",
  description:
    "NagarSetu — a 311-style grievance router for Indian cities. Report civic issues; an AI agent classifies, routes and drafts the formal complaint.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Nav />
        <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
        <footer className="border-t border-[var(--border)]/60 py-8 text-center text-xs text-[var(--muted-foreground)]">
          NagarSetu · built with Next.js, Google ADK & Gemini
        </footer>
      </body>
    </html>
  );
}

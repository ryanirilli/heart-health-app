import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rhythm",
    template: "%s | Rhythm",
  },
  description:
    "A simple way to observe your habits, health, and rhythms over time. Track the patterns that shape your days.",
  keywords: [
    "health tracking",
    "habit tracker",
    "wellness",
    "daily rhythms",
    "activity tracking",
  ],
  authors: [{ name: "Rhythm" }],
  creator: "Rhythm",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://rhythmtracker.com"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Rhythm",
    title: "Rhythm — Track the patterns that shape your days",
    description:
      "A simple way to observe your habits, health, and rhythms over time.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 600,
        alt: "Rhythm - Track your daily patterns",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rhythm — Track the patterns that shape your days",
    description:
      "A simple way to observe your habits, health, and rhythms over time.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <QueryProvider>
          <TooltipProvider
            delayDuration={100}
            skipDelayDuration={0}
            disableHoverableContent
          >
            {children}
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

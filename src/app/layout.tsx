import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rhythm",
    template: "%s | Rhythm",
  },
  description:
    "A free, beautiful way to track habits, set goals, and see your progress at a glance simply.",
  keywords: [
    "health tracking",
    "habit tracker",
    "goal setting",
    "wellness",
    "daily rhythms",
    "activity tracking",
  ],
  authors: [{ name: "Rhythm" }],
  creator: "Rhythm",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.rhythmtracker.com"
  ),
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
    shortcut: { url: "/icon.svg", type: "image/svg+xml" },
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.rhythmtracker.com",
    siteName: "Rhythm",
    title: "Less noise. More beats.",
    description:
      "A free, beautiful way to track habits, set goals, and see your progress at a glance simply.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Less noise. More beats.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Less noise. More beats.",
    description:
      "A free, beautiful way to track habits, set goals, and see your progress at a glance simply.",
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
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
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

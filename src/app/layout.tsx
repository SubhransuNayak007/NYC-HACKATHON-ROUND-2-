import type { Metadata, Viewport } from "next";
import { Anton, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ChatWithUsWidget } from "@/frontend/components/landing/ChatWithUsWidget";
import { SmoothScrollProvider } from "@/frontend/components/providers/SmoothScrollProvider";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "QuickReply · Intelligent Auto-Replies for Every Comment & DM",
  description:
    "QuickReply answers every comment and DM with the real price from your own catalog — then schedules your posts across every platform and keeps the whole conversation in one inbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`h-full antialiased light-mode ${plusJakartaSans.variable} ${anton.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* Apply saved theme synchronously before first paint to eliminate FOUC */}
        <script
          id="theme-init-script"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#F5F6F0] text-[#161616]">
        <SmoothScrollProvider>
          {children}
          <ChatWithUsWidget />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import CustomCursor from "@/frontend/components/ui/CustomCursor";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ChatWithUsWidget } from "@/frontend/components/landing/ChatWithUsWidget";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Outfit:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#F5F6F0] text-[#161616]">
        {/* Apply saved theme before first paint */}
        <script
          id="theme-init-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <CustomCursor />
        <div id="wave-overlay" className="wave-overlay" aria-hidden="true">
          <div className="wave-overlay__water" />
          <div className="wave-overlay__edge" />
        </div>
        {children}
        <ChatWithUsWidget />
      </body>
    </html>
  );
}

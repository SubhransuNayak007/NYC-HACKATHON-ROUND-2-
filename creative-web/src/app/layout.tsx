import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { injectCSSVariables } from "@/lib/css-variables";

// Initialize CSS variables on client
if (typeof window !== 'undefined') {
  injectCSSVariables('light');
}

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  variableWeight: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  variableWeight: true,
});

export const metadata: Metadata = {
  title: "Creative Web - Design System Playground",
  description: "Award-winning creative web techniques: WebGL, GSAP, Variable Fonts, Micro-interactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--color-bg-base)] text-[var(--color-fg-primary)]">
        {children}
      </body>
    </html>
  );
}
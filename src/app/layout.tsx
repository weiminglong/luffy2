import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { MadeBySurfBadge } from "@/components/ui/MadeBySurfBadge";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tempo Benchmark Dashboard",
  description:
    "Real-time on-chain analytics and cross-chain cost benchmarks for Tempo. Powered by Surf.",
  openGraph: {
    title: "Tempo Benchmark Dashboard",
    description:
      "Real-time on-chain analytics for Tempo, benchmarked against Ethereum, Base, and Arbitrum.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <MadeBySurfBadge />
      </body>
    </html>
  );
}

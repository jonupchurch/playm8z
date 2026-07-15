import type { Metadata } from "next";
import { Sora, Space_Mono } from "next/font/google";
import { SiteHeader } from "@/components/nav/site-header";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "playm8z — assemble your party",
  description:
    "Find people to play with. Post a game, browse open parties, and join the conversation.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

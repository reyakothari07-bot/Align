import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Align — creators × brands",
  description: "Align matches Instagram creators (1K–12K followers) with brands for paid and barter collaborations.",
};

export const viewport: Viewport = {
  themeColor: "#7535ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preload" href="/fonts/plus-jakarta-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

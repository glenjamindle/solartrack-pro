import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
};

export const metadata: Metadata = {
  title: "SolarTrack Pro - Solar Construction Production & QC Platform",
  description: "Production-ready, mobile-first PWA for utility-scale and C&I solar EPC companies to track construction progress, QC inspections, forecasting, and reporting.",
  keywords: ["Solar", "Construction", "EPC", "Production", "QC", "Inspection", "PWA", "Project Management"],
  authors: [{ name: "SolarTrack Pro" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SolarTrack Pro",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "SolarTrack Pro",
    description: "Solar Construction Production & QC Platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}

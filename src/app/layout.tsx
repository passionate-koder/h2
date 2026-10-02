import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CookieConsent } from "@/components/cookie-consent";
import { AccountProvider } from '@/components/account-provider';
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: {
    default: "Buildora — Accelerate Innovation",
    template: "%s | Buildora",
  },
  description:
    "Corporate innovation programs, hackathons, hiring challenges, and AI capability building.",
  applicationName: "Buildora",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
    apple: "/android-chrome-512x512.png",
  },
  openGraph: {
    title: "Buildora — Accelerate Innovation",
    siteName: "Buildora",
    description: "Corporate innovation programs, hackathons, hiring challenges, and AI capability building.",
    images: [{ url: "/android-chrome-512x512.png", width: 512, height: 512, alt: "Buildora" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Buildora — Accelerate Innovation",
    description: "Corporate innovation programs, hackathons, hiring challenges, and AI capability building.",
    images: ["/android-chrome-512x512.png"],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="__variable_c22fe1 __variable_8b3a0b">
      <head>
        <link rel="stylesheet" href="/site.css" />
      </head>
      <body className="font-sans antialiased">
        <a href="#page-content" className="skip-link">
          Skip to content
        </a>
        <AccountProvider><SiteHeader />
        {children}
        <CookieConsent />
        </AccountProvider>
      </body>
    </html>
  );
}

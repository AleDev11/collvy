import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const siteUrl = process.env.AUTH_URL ?? "https://collvy.com"
const description = "Kanban boards, team docs, and task planning — all in one place. Open source and self-hostable."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Collvy — Your team's workspace",
    template: "%s · Collvy",
  },
  description,
  keywords: ["kanban", "project management", "team docs", "task planner", "open source", "self-hosted"],
  authors: [{ name: "Collvy" }],
  creator: "Collvy",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Collvy",
    title: "Collvy — Your team's workspace",
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Collvy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Collvy — Your team's workspace",
    description,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

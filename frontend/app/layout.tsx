import type React from "react"
import type { Metadata } from "next"
import { Instrument_Serif, Manrope } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "./auth-context"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "Summit",
  description:
    "AI-powered volunteer matching, automated opportunity discovery, and local impact mapping for students and nonprofits.",
  generator: "v0.app",
  icons: {
    icon: [{ url: "/assets/images/summit.svg", type: "image/svg+xml" }],
    shortcut: ["/assets/images/summit.svg"],
    apple: [{ url: "/assets/images/summit.svg" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${instrumentSerif.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:wght@400&display=swap" />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

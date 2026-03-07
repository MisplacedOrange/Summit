"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function Header() {
  const pathname = usePathname()
  const isHomePage = pathname === "/"
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    if (!isHomePage) return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Check initial position

    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomePage])

  // Determine header styles based on page and scroll state
  const isTransparent = isHomePage && !isScrolled
  const isGlassmorphism = isHomePage && isScrolled

  return (
    <header
      className={`w-full z-50 transition-all duration-300 ${
        isHomePage ? "fixed top-0 left-0 right-0" : "sticky top-0"
      } ${
        isTransparent
          ? "bg-transparent border-b border-transparent"
          : isGlassmorphism
          ? "bg-white/70 backdrop-blur-md border-b border-white/20"
          : "bg-[#f7f5f3] border-b border-[#37322f]/6"
      }`}
    >
      <div className="max-w-[1060px] mx-auto px-4">
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/assets/images/summit.svg"
                alt="Summit Logo"
                width={24}
                height={24}
                className={`transition-all duration-300 ${
                  isTransparent ? "brightness-0 invert" : ""
                }`}
              />
              <span
                className={`font-semibold text-lg transition-colors duration-300 ${
                  isTransparent ? "text-white" : "text-[#37322f]"
                }`}
              >
                Summit
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/features"
                className={`text-sm font-medium transition-colors duration-300 ${
                  isTransparent
                    ? "text-white hover:text-white/80"
                    : "text-[#37322f] hover:text-[#37322f]/80"
                }`}
              >
                Features
              </Link>
              <Link
                href="/docs"
                className={`text-sm font-medium transition-colors duration-300 ${
                  isTransparent
                    ? "text-white hover:text-white/80"
                    : "text-[#37322f] hover:text-[#37322f]/80"
                }`}
              >
                Technical Details
              </Link>
              <Link
                href="/roadmap"
                className={`text-sm font-medium transition-colors duration-300 ${
                  isTransparent
                    ? "text-white hover:text-white/80"
                    : "text-[#37322f] hover:text-[#37322f]/80"
                }`}
              >
                Roadmap
              </Link>
            </div>
          </div>
          <Button
            variant="ghost"
            className={`transition-colors duration-300 ${
              isTransparent
                ? "text-white hover:bg-white/10"
                : "text-[#37322f] hover:bg-[#37322f]/5"
            }`}
          >
            Log in
          </Button>
        </nav>
      </div>
    </header>
  )
}

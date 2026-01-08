"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function Navigation() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pt-4 px-4 w-full max-w-full">
      <div
        className={`rounded-full border border-teal-200/60 bg-white/95 backdrop-blur-2xl shadow-xl transition-all duration-500 mx-auto px-6 py-3 flex items-center justify-between animate-fade-down ${
          scrollY > 100 ? "max-w-md" : "max-w-4xl"
        }`}
        style={{
          boxShadow: "0 8px 32px rgba(20, 184, 166, 0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <Image src="/landingpage/logo.png" alt="nexd.pm" width={1584} height={392} className="h-6 w-auto" />
        </div>

        {scrollY <= 100 && (
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("problem")}
              className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
            >
              Problem
            </button>
            <button
              onClick={() => scrollToSection("solution")}
              className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
            >
              Solution
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("views")}
              className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
            >
              Views
            </button>
            <a href="/blog" className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors">
              Blog
            </a>
          </div>
        )}

        <Button
          size="sm"
          onClick={() => scrollToSection("waitlist")}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-6 h-9"
        >
          <span className="hidden sm:inline">Join Our Waitlist</span>
          <span className="sm:hidden">Join</span>
        </Button>
      </div>
    </nav>
  )
}
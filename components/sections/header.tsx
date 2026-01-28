"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  const [scrollY, setScrollY] = useState(0)
  const [showLinks, setShowLinks] = useState(true)

  const isCompact = scrollY > 100
  const hasMounted = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    // Set initial scroll position on mount
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    // On initial mount, sync the link visibility without a delay
    if (!hasMounted.current) {
      setShowLinks(!isCompact)
      hasMounted.current = true
      return
    }

    // When becoming compact, hide links immediately
    if (isCompact) {
      setShowLinks(false)
    } else {
      // When becoming expanded, show links after the container's animation
      const timer = setTimeout(() => {
        setShowLinks(true)
      }, 500) // This must match the `duration-500` class

      // Clean up the timer if the user scrolls back down before it fires
      return () => clearTimeout(timer)
    }
  }, [isCompact])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    } else {
      // If on a different page, navigate to the homepage section
      window.location.href = `/#${id}`
    }
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
          <Link href="/">
            <Image src="/landingpage/logo.png" alt="nexd.pm" width={1584} height={424} className="h-8 w-auto" />
          </Link>
        </div>

        {showLinks && (
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#problem" className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors">
              Problem
            </Link>
            <Link
              href="/#solution"
              className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
            >
              Solution
            </Link>
            <Link
              href="/#features"
              className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/demo"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors bg-teal-100/50 rounded-full px-4 py-1.5"
            >
              Demo
            </Link>
            <Link href="/#views" className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors">
              Views
            </Link>
            <Link href="/blog" className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors">
              Blog
            </Link>
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
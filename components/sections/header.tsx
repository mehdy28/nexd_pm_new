"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  const scrollToWaitlist = () => {
    const heroSection = document.querySelector("section")
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" })
      // Focus on the name input after scrolling
      setTimeout(() => {
        const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement
        if (nameInput) {
          nameInput.focus()
        }
      }, 500)
    }
  }

  return (
    <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
              <Link href="/" className="flex items-center">
                <Image
                  src="/nexd-logo-horizontal.png"
                  alt="NEXD.PM Logo"
                  width={160}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
      <nav className="hidden md:flex items-center gap-6">
        <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
          Features
        </Link>
        <Link href="#ai-prompts" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
          AI Prompts
        </Link>
        <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
          Blog
        </Link>
        <Link href="#about" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
          About
        </Link>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={scrollToWaitlist}>
          Join Waitlist
        </Button>
      </nav>
    </header>
  )
}

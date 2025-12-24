//components/sections/header.tsx
"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import React from "react"

export function Header() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const href = e.currentTarget.href
    const targetId = href.replace(/.*#/, "")
    const elem = document.getElementById(targetId)
    if (elem) {
      elem.scrollIntoView({
        behavior: "smooth",
      })
    }
  }

  const handleWaitlistScroll = () => {
    const waitlistSection = document.getElementById("join-waitlist");
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        const nameInput = waitlistSection.querySelector('input[type="text"], input[name="name"]') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }, 500); // Delay to allow for scroll animation
    }
  };


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
        <a href="#features" onClick={handleScroll} className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
          Features
        </a>
        <a href="#ai-prompts" onClick={handleScroll} className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
          AI Prompts
        </a>
        <a href="#community" onClick={handleScroll} className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
          Community
        </a>
        <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
          Blog
        </Link>
        <Button size="sm" 
                 className="rounded-full bg-blue-600 px-8  py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                
        onClick={handleWaitlistScroll}>
          Join Waitlist
        </Button>
      </nav>
    </header>
  )
}
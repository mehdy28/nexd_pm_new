// //components/sections/header.tsx
// "use client"

// import { Button } from "@/components/ui/button"
// import Image from "next/image"
// import Link from "next/link"
// import React from "react"

// export function Header() {
//   const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
//     e.preventDefault()
//     const href = e.currentTarget.href
//     const targetId = href.replace(/.*#/, "")
//     const elem = document.getElementById(targetId)
//     if (elem) {
//       elem.scrollIntoView({
//         behavior: "smooth",
//       })
//     }
//   }

//   const handleWaitlistScroll = () => {
//     const waitlistSection = document.getElementById("join-waitlist");
//     if (waitlistSection) {
//       waitlistSection.scrollIntoView({ behavior: "smooth" });
//       setTimeout(() => {
//         const nameInput = waitlistSection.querySelector('input[type="text"], input[name="name"]') as HTMLInputElement;
//         if (nameInput) {
//           nameInput.focus();
//         }
//       }, 500); // Delay to allow for scroll animation
//     }
//   };


//   return (
//     <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
//       <Link href="/" className="flex items-center">
//         <Image
//           src="/nexd-logo-horizontal.png"
//           alt="NEXD.PM Logo"
//           width={160}
//           height={40}
//           className="h-10 w-auto"
//         />
//       </Link>
//       <nav className="hidden md:flex items-center gap-6">
//         <a href="#features" onClick={handleScroll} className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
//           Features
//         </a>
//         <a href="#ai-prompts" onClick={handleScroll} className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
//           AI Prompts
//         </a>
//         <a href="#community" onClick={handleScroll} className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
//           Community
//         </a>
//         <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
//           Blog
//         </Link>
//         <Button size="sm" 
//                  className="rounded-full bg-blue-600 px-8  py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                
//         onClick={handleWaitlistScroll}>
//           Join Waitlist
//         </Button>
//       </nav>
//     </header>
//   )
// }








"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
            <Image src="/landingpage/logo.png" alt="nexd.pm" width={160} height={68} className="h-8 w-auto" />
          </Link>
        </div>

        {scrollY <= 100 && (
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
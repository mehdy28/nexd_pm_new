//app/page.tsx
"use client"
import { Header } from "@/components/sections/header"
import { Hero } from "@/components/sections/hero"
import { EarlyAccess } from "@/components/sections/early-access"
import { WaitlistCTA } from "@/components/sections/waitlist-cta"
import { Footer } from "@/components/sections/footer"
import { NewAllInOneHub } from "@/components/sections/1all-in-one-hub"
import { TheSolution } from "@/components/sections/the-solution"



export default function WaitlistLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1">
        <section id="hero">
          <Hero />
        </section>
        <section id="features">
          <NewAllInOneHub />
        </section>
        <section id="ai-prompts">
          <TheSolution />
        </section>
        <section id="community">
          <EarlyAccess />
        </section>
        <section id="join-waitlist">
          <WaitlistCTA />
        </section>
      </main>
      <Footer />
    </div>
  )
}
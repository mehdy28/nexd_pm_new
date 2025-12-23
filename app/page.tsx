"use client"
import { Header } from "@/components/sections/header"
import { Hero } from "@/components/sections/hero"
import { HowItWorks } from "@/components/sections/how-it-works"
import { AIFeatures } from "@/components/sections/ai-features"
import { Features } from "@/components/sections/features"
import { EarlyAccess } from "@/components/sections/early-access"
import { WaitlistCTA } from "@/components/sections/waitlist-cta"
import { Footer } from "@/components/sections/footer"
import { AllInOneHub } from "@/components/sections/all-in-one-hub"
import { NewAllInOneHub } from "@/components/sections/1all-in-one-hub"
import { TheSolution } from "@/components/sections/the-solution"



export default function WaitlistLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1">

        <Hero />
        <NewAllInOneHub />
        <TheSolution />


        <EarlyAccess />
        <WaitlistCTA />
      </main>
      <Footer />
    </div>
  )
}

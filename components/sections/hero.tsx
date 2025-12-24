"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, CheckCircle } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { isValidEmail, isValidName } from "@/lib/waitlist"
import { useEarlyAccess } from "@/hooks/useEarlyAccess"

export function Hero() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const { joinWaitlist, mutationLoading, mutationError } = useEarlyAccess()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!isValidName(name)) {
      setError("Please enter a valid name (at least 2 characters)")
      return
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    const response = await joinWaitlist({ name, email })

    if (response.success) {
      setIsSubmitted(true)
      setName("")
      setEmail("")
    } else {
      setError(
        response.error ||
          mutationError?.message ||
          "Something went wrong. Please try again.",
      )
    }
  }

  return (
    <section
      className="w-full pt-4 pb-8 md:pt-6 md:pb-16 lg:pt-8 lg:pb-20 
bg-[#f0f2f7]
    "
    >
      <div className="container px-1 md:px-1 mx-auto overflow-visible   ">
        <div className="grid lg:grid-cols-2 gap-3 items-center  ">
          {/* Left Content */}
          <div className="space-y-8  ">
            {/* Launch Badge */}
            {/* <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 px-4 py-2 w-fit">
              <Sparkles className="w-4 h-4 mr-2" />
              Coming Soon: Revolutionary Ai Project Management
            </Badge> */}

            {/* Enhanced Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                The First Ai-Powered{" "}
                <span className="bg-blue-600  bg-clip-text text-transparent">
                  Project Management
                </span>{" "}
                Solution
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Be among the first to experience project management with{" "}
                <strong>built-in Ai prompt management</strong>. Join our
                exclusive waitlist and get early access when we launch.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                Context-aware Ai prompts
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                Complete project suite
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                Team collaboration
              </div>
            </div>

            {/* Waitlist Form */}
            <div className="space-y-4">
              <div className="min-h-48 sm:min-h-36">
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="flex-1"
                        disabled={mutationLoading}
                      />
                      <Input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1"
                        disabled={mutationLoading}
                      />
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <Button
                      type="submit"
                      size="lg"
                      className="rounded-full bg-blue-600 px-8  py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      disabled={mutationLoading}
                    >
                      {mutationLoading ? "Joining..." : "Join Waitlist"}
                      {!mutationLoading && (
                        <ArrowRight className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm">
                    <p className="text-green-800 font-medium">
                      🎉 You're on the list!
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      We'll notify you when NEXD.PM launches.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Content - Product Screenshot */}
          <div className="h-full ">
            <Image
              src="/landing/hero1.png"
              alt="NEXD.PM Project Page showcasing the Prompt Lab and dynamic variables."
              width={1400}
              height={900}
              priority
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Mail, Users, Zap } from "lucide-react"
import { useState } from "react"
import { submitToWaitlist, isValidEmail, isValidName } from "@/lib/waitlist"

export function WaitlistCTA() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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

    setIsLoading(true)

    try {
      const response = await submitToWaitlist({ name, email })

      if (response.success) {
        setIsSubmitted(true)
        setName("")
        setEmail("")
      } else {
        setError(response.message)
      }
    } catch (error) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToHeroForm = () => {
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
    <section className="w-full py-12 md:py-24 lg:py-32 bg-[#f0f2f7]">
      <div className="container px-4 md:px-6 mx-auto text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4">

                  <span className="text-lg font-semibold text-gray-900">Limited Spots Available</span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900  sm:text-4xl">
              Ready to Transform Your Project Management?
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of forward-thinking teams waiting for the future of project management. Be the first to
              experience AI-powered productivity.
            </p>
          </div>

          {/* Waitlist Form */}
          <div className="max-w-md mx-auto">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-10 bg-white/90 border-white/20 text-gray-900 placeholder:text-gray-500"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-white/90 border-white/20 text-gray-900 placeholder:text-gray-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                {error && <p className="text-red-200 text-sm">{error}</p>}
                <Button
                  type="submit"
                  size="lg"
 className="rounded-full bg-blue-600 px-8  py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
                   w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Waitlist"}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
                <div className="text-white">
                  <h3 className="text-lg font-semibold mb-2">🎉 Welcome to the Future!</h3>
                  <p className="text-teal-100">
                    You're now on our exclusive waitlist. We'll keep you updated on our progress and notify you the
                    moment NEXD.PM launches.
                  </p>
                </div>
              </div>
            )}
          </div>



          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto text-teal-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm text-gray-600 ">Early access priority</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm text-gray-600 ">Exclusive launch discount</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm text-gray-600">Product updates & insights</span>
            </div>
          </div>


        </div>
      </div>
    </section>
  )
}

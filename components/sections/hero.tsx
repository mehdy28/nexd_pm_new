"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Brain, ArrowRight, CheckCircle, Sparkles, Users } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { submitToWaitlist, isValidEmail, isValidName } from "@/lib/waitlist"

export function Hero() {
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

  return (
    <section className="w-full pt-4 pb-8 md:pt-6 md:pb-16 lg:pt-8 lg:pb-20 bg-gradient-to-br from-teal-50 via-white to-gray-50">
      <div className="container px-4 md:px-6 mx-auto overflow-visible">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Launch Badge */}
            <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 px-4 py-2 w-fit">
              <Sparkles className="w-4 h-4 mr-2" />
              Coming Soon: Revolutionary AI Project Management
            </Badge>

            {/* Enhanced Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                The First AI-Powered{" "}
                <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
                  Project Management
                </span>{" "}
                Platform
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Be among the first to experience project management with <strong>built-in AI prompt management</strong>.
                Join our exclusive waitlist and get early access when we launch.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                Context-aware AI prompts
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
                      disabled={isLoading}
                    />
                    <Input
                      type="email"
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1"
                      disabled={isLoading}
                    />
                  </div>
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-base font-medium w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? "Joining..." : "Join Waitlist"}
                    {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </form>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
                  <p className="text-green-800 font-medium">🎉 You're on the list!</p>
                  <p className="text-green-600 text-sm mt-1">We'll notify you when NEXD.PM launches.</p>
                </div>
              )}

              <p className="text-sm text-gray-500">✓ Early access • ✓ Exclusive features • ✓ No spam, ever</p>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-gray-600 ml-1">2,500+ people already joined</span>
              </div>
            </div>
          </div>

          {/* Right Content - Enhanced Product Screenshot */}
          <div className="relative">
            <div className="relative overflow-visible bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm text-gray-500">nexd.pm/projects/web-development</div>
                </div>
              </div>

              {/* Enhanced Dashboard */}
              <div className="p-0 bg-white overflow-hidden">
                <div className="relative">
                  <Image
                    src="/nexd-interface.png"
                    alt="NEXD.PM Interface Preview"
                    width={1200}
                    height={600}
                    className="w-full h-auto object-cover object-top"
                    style={{ maxHeight: "500px" }}
                  />

                  {/* Overlay gradient to blend with the floating card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
                </div>
              </div>

              {/* Floating AI Prompt Card */}
              <div className="absolute -bottom-12 -right-6 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-xs z-30">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">AI Suggestion</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  "Based on your web development project, here's a prompt for creating user stories..."
                </p>
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  Use This Prompt
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

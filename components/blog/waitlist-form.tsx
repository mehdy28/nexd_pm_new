"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Mail, Sparkles, Users, Zap } from "lucide-react"
import { useState } from "react"
import { submitToWaitlist, isValidEmail, isValidName } from "@/lib/waitlist"

interface WaitlistFormProps {
  variant?: "sidebar" | "full" | "inline"
}

export function WaitlistForm({ variant = "full" }: WaitlistFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isValidName(name)) {
      setError("Please enter a valid name")
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

  if (variant === "sidebar") {
    return (
      <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <Sparkles className="w-8 h-8 text-teal-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Join the Revolution</h3>
            <p className="text-sm text-gray-600">Get early access to NEXD.PM and transform your project management.</p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="text-sm"
              />
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="text-sm"
              />
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <Button
                type="submit"
                size="sm"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-green-800 font-medium text-sm">🎉 You're in!</p>
              <p className="text-green-600 text-xs mt-1">We'll notify you when we launch.</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (variant === "inline") {
    return (
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Get Started?</h3>
          <p className="text-gray-600">
            Join thousands of teams already on the waitlist for NEXD.PM's revolutionary AI-powered project management.
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="flex-1"
              />
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="flex-1"
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Joining..." : "Join Waitlist"}
              {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-green-800 font-medium">🎉 Welcome to the future!</p>
            <p className="text-green-600 text-sm mt-1">You're now on our exclusive waitlist.</p>
          </div>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <Card className="bg-gradient-to-r from-teal-600 to-teal-700 text-white border-0">
      <CardContent className="p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">Transform Your Project Management Today</h3>
          <p className="text-teal-100 mb-8 text-lg">
            Join thousands of forward-thinking teams waiting for the future of AI-powered project management.
          </p>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/90 border-white/20 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                <div className="relative flex-1">
                  <Input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/90 border-white/20 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>
              {error && <p className="text-red-200 text-sm mb-3">{error}</p>}
              <Button
                type="submit"
                size="lg"
                className="bg-white text-teal-600 hover:bg-gray-100 px-8 py-3 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Waitlist"}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          ) : (
            <div className="mb-6">
              <p className="text-white font-medium text-lg">🎉 Welcome to the Future!</p>
              <p className="text-teal-100 mt-1">You're now on our exclusive waitlist.</p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 text-teal-100">
            <div className="flex items-center gap-2 justify-center">
              <Users className="w-4 h-4" />
              <span className="text-sm">Early access priority</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Exclusive features</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Product updates</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import type React from "react"
import Image from "next/image"
import { useState } from "react"
import { isValidEmail, isValidName } from "@/lib/waitlist"
import { useEarlyAccess } from "@/hooks/useEarlyAccess"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  Sparkles,
  Users,
  Zap,
  Mail,
  AlertTriangle,
} from "lucide-react"

interface WaitlistFormProps {
  variant?: "sidebar" | "full" | "inline" | "cta" | "modal"
  onSubmitted?: () => void
}

export function WaitlistForm({
  variant = "full",
  onSubmitted,
}: WaitlistFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [isSubmissionError, setIsSubmissionError] = useState(false)
  const [error, setError] = useState("")

  const { joinWaitlist, mutationLoading, mutationError } = useEarlyAccess()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsDuplicate(false)
    setIsSubmissionError(false)

    if (!isValidName(name)) {
      setError("Please enter a valid name")
      return
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    const response = await joinWaitlist({ name, email })

    const handleSuccess = () => {
      setName("")
      setEmail("")
      // Set flag in localStorage on success/duplicate
      localStorage.setItem("nexd-early-access-submitted", "true")
      if (onSubmitted) {
        setTimeout(() => {
          onSubmitted()
        }, 2000) // 2-second delay
      }
    }

    if (response.success) {
      setIsSubmitted(true)
      handleSuccess()
    } else {
      const errorMessage = response.error || mutationError?.message || ""
      if (errorMessage.includes("already on the waitlist")) {
        setIsDuplicate(true)
        handleSuccess()
      } else {
        setIsSubmissionError(true)
        setName("")
        setEmail("")
      }
    }
  }

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Card className="w-full max-w-md m-4 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl transition-colors">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Image
                  src="/landingpage/logo.png"
                  alt="nexd.pm"
                  width={400}
                  height={107}
                  className="h-10 w-auto"
                />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Get Early Access to the Demo
              </h3>
              <p className="text-slate-600 dark:text-neutral-400">
                Join the waitlist to unlock the interactive demo and be first
                to know when we launch.
              </p>
            </div>

            {isSubmitted ? (
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-teal-800 dark:text-teal-400">
                  🎉 You're on the list!
                </p>
                <p className="text-lg text-slate-600 dark:text-neutral-400 mt-2">
                  Thanks for your excitement! The demo will now load.
                </p>
              </div>
            ) : isDuplicate ? (
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-500">
                  👋 You're already in!
                </p>
                <p className="text-lg text-slate-600 dark:text-neutral-400 mt-2">
                  We've got your info. The demo will now load.
                </p>
              </div>
            ) : isSubmissionError ? (
              <div className="text-center">
                <p className="text-red-800 dark:text-red-400 font-medium">
                  <AlertTriangle className="w-5 h-5 inline-block mr-2" />
                  Oops! An error occurred.
                </p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                  Something went wrong. Please refresh and try again.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={mutationLoading}
                  className="w-full rounded-full h-12 px-5 border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500"
                />
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={mutationLoading}
                  className="w-full rounded-full h-12 px-5 border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500"
                />

                {error && (
                  <p className="text-red-600 dark:text-red-400 text-sm text-center !mt-3">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full h-12 font-semibold"
                  disabled={mutationLoading}
                >
                  {mutationLoading ? "Joining..." : "Unlock Demo"}
                  {!mutationLoading && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (variant === "cta") {
    return (
      <section id="waitlist" className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-r from-teal-400/30 to-cyan-400/30 rounded-full blur-[120px] animate-pulse-slow" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="mb-12 flex justify-center">
            <div className="relative">
              <Image
                src="/landingpage/logo.png"
                alt="nexd.pm"
                width={1584}
                height={424}
                className="h-32 w-auto animate-fade-in-scale"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/30 to-cyan-400/30 blur-2xl animate-pulse-glow" />
            </div>
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white mb-6 text-balance">
            This is the Nexd-Level Prompt Management.
          </h2>

          <p className="text-xl md:text-2xl text-slate-600 dark:text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            The waitlist is now open for teams who want to build, not just
            prompt.
          </p>

          {isSubmitted ? (
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-800 dark:text-teal-400">
                🎉 You're on the list!
              </p>
              <p className="text-lg text-slate-600 dark:text-neutral-400 mt-2">
                We'll reach out when we're ready to launch. Thanks for your
                excitement!
              </p>
            </div>
          ) : isDuplicate ? (
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-500">
                👋 You're already in!
              </p>
              <p className="text-lg text-slate-600 dark:text-neutral-400 mt-2">
                We've got your info. We'll be in touch soon.
              </p>
            </div>
          ) : isSubmissionError ? (
            <div className="text-center">
              <p className="text-2xl font-bold text-red-800 dark:text-red-400">
                <AlertTriangle className="w-7 h-7 inline-block mr-2" />
                Oops! An error occurred.
              </p>
              <p className="text-lg text-slate-600 dark:text-neutral-400 mt-2">
                Something went wrong. Please refresh and try again.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={mutationLoading}
                    className="flex-1 h-12 px-6 text-base border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500 rounded-full"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={mutationLoading}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8 h-12 font-semibold whitespace-nowrap"
                  >
                    {mutationLoading ? "Joining..." : "Join Waitlist"}
                  </Button>
                </div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={mutationLoading}
                  className="h-12 px-6 text-base border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500 rounded-full"
                />
              </div>
              {error && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-3 text-center">
                  {error}
                </p>
              )}
            </form>
          )}

          <p className="text-sm text-slate-500 dark:text-neutral-500 mt-6">
            No spam. We'll only reach out when we're ready to launch.
          </p>
        </div>
      </section>
    )
  }

  if (variant === "sidebar") {
    return (
      <Card className="bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-2xl transition-colors">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <Sparkles className="w-8 h-8 text-teal-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              Join the Revolution
            </h3>
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              Get early access to NEXD.PM and transform your project management.
            </p>
          </div>

          {isSubmitted ? (
            <div className="text-center">
              <p className="text-teal-800 dark:text-teal-400 font-medium text-sm">🎉 You're in!</p>
              <p className="text-teal-600 dark:text-teal-300 text-xs mt-1">
                We'll notify you when we launch.
              </p>
            </div>
          ) : isDuplicate ? (
            <div className="text-center">
              <p className="text-yellow-800 dark:text-yellow-500 font-medium text-sm">
                👋 Already in!
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                You're on the list. We'll be in touch.
              </p>
            </div>
          ) : isSubmissionError ? (
            <div className="text-center">
              <p className="text-red-800 dark:text-red-400 font-medium text-sm">
                <AlertTriangle className="w-4 h-4 inline-block mr-1.5" />
                Oops! An error occurred.
              </p>
              <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                Please try again later.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={mutationLoading}
                className="text-sm rounded-full border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500 h-10 px-4"
              />
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mutationLoading}
                className="text-sm rounded-full border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500 h-10 px-4"
              />
              {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}
              <Button
                type="submit"
                size="sm"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold h-10"
                disabled={mutationLoading}
              >
                {mutationLoading ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    )
  }

  if (variant === "inline") {
    return (
      <div className="bg-gradient-to-r from-teal-50/50 to-cyan-50/50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-2xl p-6 border border-slate-200 dark:border-neutral-800">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Ready to Get Started?
          </h3>
          <p className="text-slate-600 dark:text-neutral-400">
            Join thousands of teams already on the waitlist for NEXD.PM.
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center">
            <p className="text-teal-800 dark:text-teal-400 font-medium">
              🎉 Welcome to the future!
            </p>
            <p className="text-teal-600 dark:text-teal-300 text-sm mt-1">
              You're now on our exclusive waitlist.
            </p>
          </div>
        ) : isDuplicate ? (
          <div className="text-center">
            <p className="text-yellow-800 dark:text-yellow-500 font-medium">
              👋 You're already on the list!
            </p>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
              Thanks for your enthusiasm.
            </p>
          </div>
        ) : isSubmissionError ? (
          <div className="text-center">
            <p className="text-red-800 dark:text-red-400 font-medium">
              <AlertTriangle className="w-5 h-5 inline-block mr-2" />
              Oops! An error occurred.
            </p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">
              Something went wrong. Please refresh and try again.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={mutationLoading}
                className="flex-1 rounded-full h-12 px-5 border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500"
              />
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mutationLoading}
                className="flex-1 rounded-full h-12 px-5 border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:border-teal-500"
              />
            </div>
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm mb-3 text-center">{error}</p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full h-12 font-semibold"
              disabled={mutationLoading}
            >
              {mutationLoading ? "Joining..." : "Join Waitlist"}
              {!mutationLoading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>
        )}
      </div>
    )
  }

  // Full variant (Maintains teal background for consistency, no changes needed for black mode specifically here as it uses teal bg)
  return (
    <Card className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white border-0 rounded-2xl">
      <CardContent className="p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-bold mb-4">
            Transform Your Project Management Today
          </h3>
          <p className="text-teal-100 mb-8 text-lg">
            Join thousands of forward-thinking teams waiting for the future of
            AI-powered project management.
          </p>

          {isSubmitted ? (
            <div className="mb-6">
              <p className="text-white font-semibold text-lg">
                🎉 Welcome to the Future!
              </p>
              <p className="text-teal-100 mt-1">
                You're now on our exclusive waitlist.
              </p>
            </div>
          ) : isDuplicate ? (
            <div className="mb-6">
              <p className="text-white font-semibold text-lg">
                👋 You're already on the list!
              </p>
              <p className="text-teal-100 mt-1">
                Thanks for your enthusiasm. We'll be in touch soon.
              </p>
            </div>
          ) : isSubmissionError ? (
            <div className="mb-6">
              <p className="text-red-200 font-semibold text-lg">
                <AlertTriangle className="w-6 h-6 inline-block mr-2" />
                Oops! An error occurred.
              </p>
              <p className="text-teal-100 mt-1">
                Something went wrong. Please try again later.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={mutationLoading}
                  className="flex-1 bg-white/90 border-2 border-white/30 focus:border-white text-slate-900 placeholder:text-slate-500 rounded-full h-12 px-5"
                />
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={mutationLoading}
                  className="flex-1 bg-white/90 border-2 border-white/30 focus:border-white text-slate-900 placeholder:text-slate-500 rounded-full h-12 px-5"
                />
              </div>
              {error && <p className="text-red-200 text-sm mb-3">{error}</p>}
              <Button
                type="submit"
                size="lg"
                className="bg-white text-teal-600 hover:bg-slate-100 px-8 text-base font-semibold rounded-full h-12"
                disabled={mutationLoading}
              >
                {mutationLoading ? "Joining..." : "Get Early Access"}
                {!mutationLoading && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </form>
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
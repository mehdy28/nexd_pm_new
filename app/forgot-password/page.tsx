"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await sendPasswordResetEmail(auth, email)
      setIsSubmitted(true)
    } catch (error: any) {
      setError(error.message || "Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white shadow-md mb-4 mx-auto">
            <Image src="/logo.png" alt="NEXD.PM" width={32} height={32} className="rounded" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Check your email</h1>
          <p className="text-sm text-slate-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white shadow-md mb-4">
            <Image src="/logo.png" alt="NEXD.PM" width={32} height={32} className="rounded" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Forgot password?</h1>
          <p className="text-sm text-slate-600 mt-1 text-center">Enter your email and we'll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

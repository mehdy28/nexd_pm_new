"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/useAuth"; // your custom auth hook

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login, currentUser } = useAuth() // <-- login from hook
  const router = useRouter()
  const { toast } = useToast()


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
  
    try {
      await login(email, password);
  
      const hasWorkspace =
        (currentUser?.ownedWorkspaces?.length ?? 0) > 0 ||
        (currentUser?.workspaceMembers?.length ?? 0) > 0;
  
      if (hasWorkspace) router.push("/workspace");
      else router.push("/setup");
    } catch (err: any) {
      setError(err.message || "Login failed");
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex min-h-screen">
      {/* Left side */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-slate-800 p-8">
        <Image src="/nexd-logo-horizontal.png" alt="NEXD.PM" width={250} height={80} className="object-contain" />
        <h2 className="mt-6 text-xl font-medium text-white text-center">Your all-in-one project management solution.</h2>
      </div>

      {/* Right side */}
      <div className="flex items-center justify-center w-full lg:w-1/2 bg-white p-2">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-600 mt-1">Sign in to your account</p>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

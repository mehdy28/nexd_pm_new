"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation"; // Import useRouter
import Link from "next/link";

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter(); // Initialize the router

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate an API call for password recovery
    setTimeout(() => {
      setLoading(false);
      if (email.includes("@")) {
        setRecoverySent(true);
      } else {
        setError("Invalid email address.");
      }
    }, 1500); // Simulate API call delay

  };

  // const handleReturnToLogin = () => {
  //   router.push("/login"); // Replace "/login" with your actual login route
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <Mail className="w-10 h-10 text-teal-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Reset Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recoverySent ? (
            <div className="text-center">
              <p className="text-slate-600">
                We've sent a password reset link to <span className="font-medium">{email}</span>.
                Please check your inbox and follow the instructions to reset your password.
              </p>
              {/*<Button onClick={handleReturnToLogin} className="mt-4 bg-teal-500 hover:bg-teal-600 text-lg py-3 w-full">
                Return to Login
              </Button>*/}
              <p className="mt-4">
                <Link href="/login" className="text-teal-500 hover:text-teal-600">
                  Return to Login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-lg py-3" disabled={loading}>
                {loading ? "Sending..." : "Reset Password"}
              </Button>
              <p className="mt-2 text-center">
                <Link href="/login" className="text-teal-500 hover:text-teal-600">
                  Return to Login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import type React from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, Info } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const { register, loading, error: authError } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const invitationToken = searchParams.get('invitation_token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match" });
      return;
    }
    if (!formData.agreeToTerms) {
      toast({ variant: "destructive", title: "Please agree to the terms and conditions" });
      return;
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        invitationToken
      );
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err.message || "An unexpected error occurred.",
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-slate-800 p-8">
        <Link href="/" passHref>
          <div className="cursor-pointer">
            <Image src="/logo1.png" alt="NEXD.PM" width={350} height={180} className="object-contain" />
          </div>
        </Link>
        <h2 className="mt-6 text-xl font-medium text-white text-center">Your all-in-one project management solution.</h2>
      </div>

      <div className="flex items-center justify-center w-full lg:w-1/2 bg-white p-2">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
            <p className="text-sm text-slate-600 mt-1">Get started with your free account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {invitationToken && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>You have an invitation!</AlertTitle>
                    <AlertDescription>
                    Complete your registration to join your new workspace.
                    </AlertDescription>
                </Alert>
            )}

            {authError && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{authError}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" placeholder="John" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} required 
                //disabled={loading} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} required 
                //disabled={loading} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required 
              //disabled={loading} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} required 
                //disabled={loading}
                 />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} 
                //disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} required 
                //disabled={loading} 
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                //disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                </Button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="relative">
                <input id="terms" type="checkbox" checked={formData.agreeToTerms} onChange={(e) => handleInputChange("agreeToTerms", e.target.checked)} className="sr-only" required 
                //disabled={loading} 
                />
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer ${formData.agreeToTerms ? "bg-primary border-primary" : "border-slate-300 hover:border-slate-400"}`} onClick={() => !loading && handleInputChange("agreeToTerms", !formData.agreeToTerms)}>
                  {formData.agreeToTerms && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>
              <Label htmlFor="terms" className="text-sm text-slate-600 leading-4">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:text-primary/80">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>
              </Label>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white"
             //disabled={loading}
             >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href={invitationToken ? `/login?invitation_token=${invitationToken}` : "/login"} className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

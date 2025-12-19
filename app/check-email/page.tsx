"use client";

import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner"; // Assuming you use sonner or similar for feedback

export default function CheckEmailPage() {
  const { logout, currentUser, resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!currentUser?.email) return;
    
    setIsResending(true);
    const result = await resendVerificationEmail(currentUser.email);
    setIsResending(false);

    if (result.success) {
      toast.success("Verification email resent!");
    } else {
      toast.error(result.error || "Failed to resend email.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {/* Changed max-w-md to max-w-2xl for a wider container */}
      <div className="w-full max-w-2xl space-y-8 rounded-xl bg-white p-12 shadow-sm text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <Mail className="h-16 w-16 text-primary" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Check your email
          </h1>
          <p className="text-lg text-slate-600">
            We sent a verification link to <span className="font-semibold text-slate-900">{currentUser?.email}</span>. 
            Please verify your email to continue.
          </p>
        </div>

        <div className="space-y-6 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Did not receive the email? Check your spam folder or{" "}
            <button 
              onClick={handleResend}
              disabled={isResending}
              className="text-primary font-medium hover:underline disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
              click here to resend the email
            </button>
          </p>
          
          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              className="text-slate-500" 
              onClick={() => logout()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@apollo/client";
import { VERIFY_EMAIL } from "@/graphql/mutations/register";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const [verifyEmail] = useMutation(VERIFY_EMAIL);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const performVerification = async () => {
      try {
        await verifyEmail({ variables: { token } });
        setStatus("success");
      } catch (err) {
        setStatus("error");
      }
    };

    performVerification();
  }, [token, verifyEmail]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Verifying your email...</h1>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-bold text-slate-900">Email Verified!</h1>
            <p className="text-slate-600">Your email has been successfully verified. You can now access the login page.</p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to Login Page
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">Verification Failed</h1>
            <p className="text-slate-600">The link is invalid or has expired. Please try registering again or contact support.</p>
            <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
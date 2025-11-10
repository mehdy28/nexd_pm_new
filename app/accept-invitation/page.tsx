"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCEPT_WORKSPACE_INVITATION } from "@/graphql/operations/members";
import { useAuth } from "@/hooks/useAuth";

type Status = 'loading' | 'success' | 'error' | 'redirecting';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { currentUser, loading: authLoading } = useAuth(); 
  
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState("Verifying your invitation...");

  const [acceptInvitation, { loading: mutationLoading }] = useMutation(ACCEPT_WORKSPACE_INVITATION);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage("Invalid invitation link. No token provided.");
      return;
    }
    
    if (!currentUser) {
        setStatus('redirecting');
        setMessage("Please sign up or log in to accept your invitation.");
        router.push(`/register?invitation_token=${token}`);
        return;
    }

    const handleAccept = async () => {
      try {
        const { data } = await acceptInvitation({
          variables: { token },
        });

        if (data?.acceptWorkspaceInvitation) {
          setStatus('success');
          setMessage("Invitation accepted! You're now a member of the workspace. Redirecting...");
          setTimeout(() => {
            router.push('/workspace'); 
          }, 2000);
        } else {
            throw new Error("Failed to process invitation.");
        }
      } catch (err: any) {
        setStatus('error');
        if (err.message.includes("invalid or has expired")) {
            setMessage("This invitation is invalid or has expired.");
        } else if (err.message.includes("another email address")) {
            setMessage("This invitation is for a different email address. Please log in with the correct account.");
        } else {
            setMessage(err.message || "An unknown error occurred while accepting the invitation.");
        }
      }
    };

    handleAccept();
    
  }, [token, currentUser, authLoading, router, acceptInvitation]);


  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Success!</p>
            <p className="text-muted-foreground">{message}</p>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Invitation Error</p>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </div>
        );
      case 'loading':
      case 'redirecting':
      default:
        return (
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Please wait</p>
            <p className="text-muted-foreground">{message}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
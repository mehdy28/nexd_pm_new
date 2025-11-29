import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LoadingPlaceholder({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh_-_4rem)] w-full bg-background text-muted-foreground">
      <Loader2 className="h-16 w-16 animate-spin text-[#4ab5ae]" />
      <p className="mt-6 text-xl">{message}</p>
    </div>
  )
}

interface ErrorPlaceholderProps {
  error: Error
  onRetry?: () => void
}

export function ErrorPlaceholder({ error, onRetry }: ErrorPlaceholderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh_-_4rem)] w-full bg-background p-4"
      role="alert"
    >
      <div className="flex flex-col items-center gap-6 rounded-lg border border-destructive/50 bg-destructive/10 p-12 max-w-lg text-center">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h3 className="text-2xl font-semibold text-destructive">Oops, something went wrong.</h3>
        <p className="text-base text-muted-foreground">
          {"We couldn't load the required data. Please try again later."}
        </p>
        
        <Button 
          variant="destructive" 
          onClick={() => onRetry ? onRetry() : window.location.reload()} 
          className="mt-4 h-10 px-6"
        >
          Try Again
        </Button>
        
      </div>
    </div>
  )
}
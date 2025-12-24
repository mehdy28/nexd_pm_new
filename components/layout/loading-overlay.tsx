"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function LoadingOverlay() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()


  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 300)
    return () => {
        clearTimeout(timer);
    }
  }, [pathname])

  if (!isLoading) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  )
}
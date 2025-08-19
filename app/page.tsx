"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem("user")

    if (!user) {
      router.push("/login")
      return
    }

    const hasCompletedSetup = localStorage.getItem("hasCompletedSetup")
    if (!hasCompletedSetup) {
      router.push("/setup")
      return
    }

    router.push("/workspace")
  }, [router])

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  )
}

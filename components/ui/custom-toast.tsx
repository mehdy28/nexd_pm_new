"use client"

import React, { useEffect } from "react"
import { X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error"

interface CustomToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function CustomToast({ message, type, onClose, duration = 4000 }: CustomToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const isError = type === "error"
  const displayMessage = isError ? "Something went wrong" : message

  return (
    <div className="fixed bottom-10 pl-15 z-[100] animate-in slide-in-from-bottom-10 duration-500 ease-out">
      <div 
        className={cn(
          "flex items-center gap-4 min-w-[400px] max-w-[500px] bg-white p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-slate-100 border-l-[8px]",
          isError ? "border-l-red-500" : "border-l-[#4ab5ae]"
        )}
      >
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full",
          isError ? "bg-red-50" : "bg-teal-50"
        )}>
          {isError ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-[#4ab5ae]" />
          )}
        </div>
        
        <div className="flex-1 space-y-0.5">
          <p className={cn(
            "text-base font-bold tracking-tight",
            isError ? "text-red-700" : "text-[#3a8f8a]"
          )}>
            {isError ? "System Alert" : "Success"}
          </p>
          <p className="text-slate-600 text-sm font-medium leading-relaxed">
            {displayMessage}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

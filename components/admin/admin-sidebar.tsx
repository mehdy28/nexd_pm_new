"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
// Updated imports to use only the required Lucide icons (Dashboard, Support, Users, Logout)
import { LayoutGrid, MessageCircle, Users, LogOut } from "lucide-react" 
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"

// Navigation items definition based on request
const adminNavigation = [
  { name: "Dashboard", href: "/admin-dashboard", Icon: LayoutGrid },
  { name: "Customer Support", href: "/admin-support", Icon: MessageCircle },
  { name: "User Management", href: "/users", Icon: Users },
]


function IconButton({
  children,
  label,
  href,
  isActive,
  onClick,
}: {
  children: React.ReactNode
  label: string
  href?: string
  isActive?: boolean
  onClick?: () => void
}) {
  const className = cn(
    "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 group relative",
    isActive
      ? "bg-[#4ab5ae] text-red shadow-medium scale-105"
      : "text-[#4ab5ae] hover:bg-[#4ab5ae] hover:text-white hover:scale-105 shadow-soft"
  )

  const content = (
    <>
      {children}
      <span className="absolute left-full ml-3 px-2 py-1 bg-white text-[#19222d] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 group-hover:bg-[#4ab5ae] group-hover:text-white">
        {label}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button onClick={onClick} aria-label={label} title={label} className={className}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href!} aria-label={label} title={label} className={className}>
      {content}
    </Link>
  )
}

// Renamed and updated the exported function
export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth() 

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  // Removed getUserInitial

  return (
    <aside className="fixed inset-y-0 left-0 w-20 bg-[#19222d] border-r border-gray-700 shadow-strong z-30 flex flex-col items-center py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent shadow-medium hover:shadow-strong transition-all duration-200 hover:scale-105 overflow-hidden">
        <Image src="/square_logo.png" alt="NEXD.PM" width={42} height={42} className="object-contain" />
      </div>

      <nav className="mt-8 flex flex-col gap-4">
        {adminNavigation.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = item.Icon

          return (
            <IconButton 
              key={item.name}
              label={item.name} 
              href={item.href} 
              isActive={isActive}
            >
              <IconComponent 
                className={cn(
                  "h-5 w-5", 
                  isActive ? "text-white" : "text-[#4ab5ae]"
                )} 
              />
            </IconButton>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <IconButton label="Logout" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-[#4ab5ae]" />
        </IconButton>
      </div>
    </aside>
  )
}
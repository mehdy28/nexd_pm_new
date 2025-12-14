"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ListChecks, SquareKanban, CalendarDays, FileText, Layers3, Gauge, BarChart3, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

type TabItem = {
  label: string
  href: string
  Icon: React.ComponentType<{ className?: string }>
}

const TABS: readonly TabItem[] = [
  // Keep Overview if you still need it elsewhere; otherwise you can remove it.
  // { label: "Overview", href: "#", Icon: LayoutGrid },
  { label: "List", href: "/list", Icon: ListChecks },
  { label: "Board", href: "/board", Icon: SquareKanban },
  { label: "Gantt", href: "#", Icon: BarChart3 },
  { label: "Calendar", href: "#", Icon: CalendarDays },
  { label: "Documents", href: "#", Icon: FileText },
  { label: "Whiteboards", href: "#", Icon: Layers3 },
  { label: "Prompts", href: "/prompts", Icon: Lightbulb },
  { label: "Dashboard", href: "#", Icon: Gauge },
] as const

export function ProjectTabs() {
  const pathname = usePathname()

  // Determine the active tab from the pathname
  const active = pathname?.startsWith("/board")
    ? "Board"
    : pathname?.startsWith("/list")
      ? "List"
      : pathname?.startsWith("/prompts")
        ? "Prompts"
        : pathname?.startsWith("/gantt")
          ? "Gantt"
          : undefined

  return (
    <div className="w-full">
      {/* Tabs bar with bottom border like in the screenshot */}
      <div className="w-full border-b border-slate-200">
        <nav aria-label="Primary" className="flex items-center gap-6 py-2" role="tablist">
          {TABS.map(({ label, href, Icon }) => {
            const isActive = label === active
            const Comp: any = href === "#" ? "button" : Link
            return (
              <Comp
                key={label}
                href={href as any}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "relative inline-flex items-center gap-2 px-0 pb-2 text-sm",
                  "text-slate-600 hover:text-slate-900",
                  isActive && "text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {/* active underline */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute left-0 right-0 -bottom-px h-0.5 rounded-full",
                    isActive ? "bg-primary" : "bg-transparent",
                  )}
                />
              </Comp>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

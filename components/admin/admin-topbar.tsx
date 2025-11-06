"use client"

import { Search, Lock, Share2 } from "lucide-react"
import { useTopbar } from "../layout/topbar-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function AdminTopbar() {
  const { title, tabs, activeKey, setActiveKey, showShare } = useTopbar()

  return (
    <header className="fixed left-20 right-0 top-0 h-25 bg-background/80 glass-effect border-b border-border z-25">
      <div className="flex flex-col h-full px-6">
        <div className="flex items-center justify-between gap-6 h-10 pt-3">
        <h1 className="text-xl font-semibold text-gray-900">NEXD.PM Admin Dashboard</h1>

          <div className="flex shrink-0 items-center gap-3">
            {showShare && (
            <Button variant="ghost" size="sm" className="text-gray-700">
            Admin User
          </Button>
            )}
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 pl-9 rounded-xl border-border bg-card shadow-soft focus:shadow-medium transition-all duration-200"
                placeholder="Search..."
                aria-label="Search"
              />
            </div>
          </div>
        </div>

        {tabs.length > 0 && (
          <div className="flex items-center pb-4  pt-4 "> {/* Added py-4 for padding top and bottom */}
            <nav aria-label="Primary" role="tablist" className="flex items-center gap-6">
              {tabs.map((t) => {
                const isActive = activeKey === t.key
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setActiveKey(t.key)}
                    className={cn(
                      "relative inline-flex items-center gap-2 px-1 text-sm font-medium transition-all duration-200",
                      "text-muted-foreground hover:text-foreground focus-visible:outline-none rounded-md",
                      "focus-visible:ring-2 focus-visible:ring-primary/20",
                      isActive && "text-primary",
                    )}
                  >
                    {t.icon}
                    <span className="whitespace-nowrap">{t.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 -bottom-1 h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}






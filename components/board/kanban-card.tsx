"use client"

import { useEffect, useRef, useState } from "react"
import type { Card } from "./kanban-types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function KanbanCard({
  card,
  onOpen,
  onFinishInline,
  onStartInline,
}: {
  card: Card
  onOpen: () => void
  onFinishInline: (patch: Partial<Card>) => void
  onStartInline: () => void
}) {
  const [title, setTitle] = useState(card.title)
  const [desc, setDesc] = useState(card.description ?? "")
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (card.editing) titleRef.current?.focus()
  }, [card.editing])

  const assignee = card.assignee
  const assigneeInitials = `${assignee?.firstName?.[0] || ""}${assignee?.lastName?.[0] || ""}`.trim().toUpperCase() || "NA"

  if (card.editing) {
    return (
      <div className="bg-card rounded-xl border shadow-medium p-4 transition-all duration-200">
        <Input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Card title"
          className="mb-3 h-9 border-0 bg-muted/50 focus:bg-background"
          onKeyDown={e => {
            if (e.key === "Enter") onFinishInline({ title: title.trim() || "Untitled", description: desc })
            if (e.key === "Escape") onFinishInline({})
          }}
          onBlur={() => onFinishInline({ title: title.trim() || "Untitled", description: desc })}
        />
        <Textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)"
          className="min-h-[70px] border-0 bg-muted/50 focus:bg-background resize-none"
          onBlur={() => onFinishInline({ title: title.trim() || "Untitled", description: desc })}
        />
      </div>
    )
  }

  return (
    <div
      className="w-full bg-card text-left rounded-xl border shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 p-4 group"
      onClick={onOpen}
      aria-label={`Open ${card.title}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={badgeClass(card.priority)}>{card.priority || "LOW"}</span>
        <div className="text-xs text-muted-foreground font-medium">{card.points ? `${card.points} SP` : ""}</div>
      </div>

      <div className="text-sm font-semibold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors">
        {card.title}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <Avatar className="h-6 w-6 border-2 border-background shadow-sm">
          <AvatarImage src={assignee?.avatar || undefined} />
          <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
            {assigneeInitials}
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground font-medium flex-1">{card.endDate || "No due date"}</span>
        {/* <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onStartInline()
          }}
        >
          Edit
        </Button> */}
      </div>
    </div>
  )
}

function badgeClass(priority?: Card["priority"]) {
  if (priority === "HIGH")
    return "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
  if (priority === "MEDIUM")
    return "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
  return "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
}
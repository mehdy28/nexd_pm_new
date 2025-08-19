"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import type { Doc } from "./types"
import { Input } from "@/components/ui/input"
import { FileText, File, Trash2, Edit2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function DocumentList({
  docs,
  selectedId,
  onSelect,
  onRename,
  onDelete,
}: {
  docs: Doc[]
  selectedId?: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])

  // Assume docs are already filtered/sorted upstream
  const items = useMemo(() => docs, [docs])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable list only (header removed per request) */}
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-3">
        {items.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">No documents. Create one or upload a PDF.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((d) => {
              const isActive = selectedId === d.id
              const isEditing = editingId === d.id
              const isPdf = d.type === "pdf"
              const Icon = isPdf ? File : FileText
              return (
                <li
                  key={d.id}
                  className={cn(
                    "group rounded-lg border p-3 hover:bg-slate-50 transition",
                    "min-h-[82px] flex items-start gap-3",
                    isActive && "border-emerald-300 bg-emerald-50/50",
                  )}
                >
                  <button className="flex flex-1 flex-col text-left" onClick={() => onSelect(d.id)} title={d.title}>
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 text-slate-500" />
                      {isEditing ? (
                        <Input
                          ref={inputRef}
                          defaultValue={d.title}
                          className="h-8"
                          onBlur={(e) => {
                            const v = e.target.value.trim() || (isPdf ? "PDF Document" : "Untitled")
                            onRename(d.id, v)
                            setEditingId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
                            if (e.key === "Escape") setEditingId(null)
                          }}
                        />
                      ) : (
                        <div className="line-clamp-1 text-sm font-medium">{d.title}</div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {timeAgo(d.updatedAt)}</span>
                    </div>
                  </button>

                  <div className="ml-1 flex items-center gap-1">
                    <button
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      onClick={() => setEditingId(d.id)}
                      aria-label="Rename"
                      title="Rename"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      onClick={() => onDelete(d.id)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

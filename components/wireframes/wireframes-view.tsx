"use client"

import { useEffect, useMemo, useState } from "react"
// import Link from "next/link" // Remove this import if not used elsewhere for navigation
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, PencilLine, ArrowLeft, ArrowRight, LayoutGrid, Rows } from "lucide-react"
import { wireframesStore, type Wireframe } from "./store"
import { cn } from "@/lib/utils"

// Import WireframeEditorComponent
import WireframeEditorComponent from "@/components/wireframes/wireframe-editor"

type SortKey = "updatedAt" | "title"
type SortDir = "desc" | "asc"
type ViewMode = "grid" | "list"

export function WireframesView({ projectId }: { projectId?: string }) {
  const [items, setItems] = useState<Wireframe[]>([])
  const [q, setQ] = useState("")
  const [hasPreviewOnly, setHasPreviewOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [pageSize, setPageSize] = useState<number>(12)
  const [page, setPage] = useState<number>(1)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [view, setView] = useState<ViewMode>("grid")

  // NEW: State to manage the active editor
  const [editingWireframeId, setEditingWireframeId] = useState<string | null>(null)

  function refresh() {
    setItems(wireframesStore.list(projectId))
  }
  useEffect(() => {
    refresh()
  }, [projectId])

  // Reset page on filters or sorting
  useEffect(() => {
    setPage(1)
  }, [q, hasPreviewOnly, sortKey, sortDir, pageSize, projectId])

  const filteredSorted = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = items
    if (projectId) {
      arr = arr.filter((w) => w.projectId === projectId)
    }
    if (query) {
      arr = arr.filter((w) => w.title.toLowerCase().includes(query))
    }
    if (hasPreviewOnly) {
      arr = arr.filter((w) => !!w.previewDataUrl)
    }
    const sorted = [...arr].sort((a, b) => {
      let va: any = a[sortKey]
      let vb: any = b[sortKey]
      if (sortKey === "title") {
        va = String(va || "").toLowerCase()
        vb = String(vb || "").toLowerCase()
        if (va < vb) return sortDir === "asc" ? -1 : 1
        if (va > vb) return sortDir === "asc" ? 1 : -1
        return 0
      }
      // updatedAt numeric
      return sortDir === "asc" ? va - vb : vb - va
    })
    return sorted
  }, [items, projectId, q, hasPreviewOnly, sortKey, sortDir])

  const total = filteredSorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = filteredSorted.slice(start, end)

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])
  const allOnPageSelected = useMemo(
    () => pageItems.length > 0 && pageItems.every((w) => selected[w.id]),
    [pageItems, selected],
  )

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }))
  }
  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      const next = { ...selected }
      for (const w of pageItems) delete next[w.id]
      setSelected(next)
      return
    }
    const next = { ...selected }
    for (const w of pageItems) next[w.id] = true
    setSelected(next)
  }

  function createNew() {
    const wf = wireframesStore.create("Untitled Wireframe", projectId)
    refresh()
    // Open the new wireframe directly in the editor
    setEditingWireframeId(wf.id)
  }

  function rename(id: string) {
    const cur = items.find((w) => w.id === id)
    const next = prompt("Rename wireframe", cur?.title || "Untitled Wireframe")
    if (next !== null) {
      wireframesStore.update(id, { title: next.trim() || "Untitled Wireframe" })
      refresh()
    }
  }

  function remove(id: string) {
    if (!confirm("Delete this wireframe? This cannot be undone.")) return
    wireframesStore.remove(id)
    setSelected((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    refresh()
    // If the deleted wireframe was being edited, close the editor
    if (editingWireframeId === id) {
      setEditingWireframeId(null)
    }
  }

  function bulkDelete() {
    if (selectedCount === 0) return
    if (!confirm(`Delete ${selectedCount} selected wireframe(s)? This cannot be undone.`)) return
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k)
    ids.forEach((id) => wireframesStore.remove(id))
    setSelected({})
    refresh()
    // If the currently edited wireframe was part of the bulk delete, close the editor
    if (editingWireframeId && ids.includes(editingWireframeId)) {
      setEditingWireframeId(null)
    }
  }

  function exportSelected() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k)
    const data = items.filter((w) => ids.includes(w.id))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `wireframes-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // NEW: Render the WireframeEditorComponent if editingWireframeId is set
  if (editingWireframeId) {
    // The onBack prop should reset editingWireframeId to null to go back to the list/grid view
    return <WireframeEditorComponent wireframeId={editingWireframeId} onBack={() => setEditingWireframeId(null)} />
  }

  return (
    <div className="page-scroller p-4">
      <div className="saas-card p-4">
        {/* Controls */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 sm:w-[280px]"
              placeholder="Search wireframes..."
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sort</span>
              <Select
                value={`${sortKey}:${sortDir}`}
                onValueChange={(v) => {
                  const [k, d] = v.split(":") as [SortKey, SortDir]
                  setSortKey(k)
                  setSortDir(d)
                }}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt:desc">Recent first</SelectItem>
                  <SelectItem value="updatedAt:asc">Oldest first</SelectItem>
                  <SelectItem value="title:asc">Title A-Z</SelectItem>
                  <SelectItem value="title:desc">Title Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="hasPreview" checked={hasPreviewOnly} onCheckedChange={(v) => setHasPreviewOnly(!!v)} />
              <label htmlFor="hasPreview" className="text-sm text-slate-700">
                With preview only
              </label>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                className={cn("h-9", view === "grid" ? "btn-primary" : "")}
                onClick={() => setView("grid")}
                title="Grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                className={cn("h-9", view === "list" ? "btn-primary" : "")}
                onClick={() => setView("list")}
                title="List"
              >
                <Rows className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-start gap-2 md:justify-end">
            {selectedCount > 0 && (
              <>
                <Button variant="outline" className="h-9 bg-transparent" onClick={exportSelected}>
                  Export ({selectedCount})
                </Button>
                <Button variant="destructive" className="h-9" onClick={bulkDelete}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete selected
                </Button>
              </>
            )}
            <Button className="h-9 btn-primary" onClick={createNew}>
              <Plus className="mr-1 h-4 w-4" />
              New wireframe
            </Button>
          </div>
        </div>

        {/* Content */}
        {total === 0 ? (
          <div className="grid place-items-center rounded-md border border-dashed p-10 text-sm text-slate-500">
            No wireframes yet. Click “New wireframe” to get started.
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((w) => (
              <article key={w.id} className="group relative overflow-hidden rounded-lg border">
                <div className="absolute left-2 top-2 z-10">
                  <Checkbox
                    checked={!!selected[w.id]}
                    onCheckedChange={(v) => toggleSelect(w.id, !!v)}
                    aria-label="Select wireframe"
                  />
                </div>

                {/* MODIFIED: Replaced Link with a div that calls setEditingWireframeId */}
                <div
                  onClick={() => setEditingWireframeId(w.id)}
                  title="Open wireframe"
                  className="block cursor-pointer" // Added cursor-pointer for better UX
                >
                  <div className="aspect-[16/10] w-full bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        w.previewDataUrl ||
                        "/placeholder.svg?height=200&width=320&query=wireframe%20preview%20grid" ||
                        "/placeholder.svg"
                      }
                      alt={`${w.title} preview`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{w.title}</div>
                    <div className="text-xs text-slate-500">Updated {timeAgo(w.updatedAt)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => rename(w.id)} title="Rename">
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => remove(w.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="w-10 px-2 py-2">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(v) => toggleSelectAllPage(!!v)}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Preview</th>
                  <th className="px-2 py-2">Updated</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((w) => (
                  <tr key={w.id} className="border-t">
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={!!selected[w.id]}
                        onCheckedChange={(v) => toggleSelect(w.id, !!v)}
                        aria-label={`Select ${w.title}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {/* MODIFIED: Replaced Link with a Button that calls setEditingWireframeId */}
                        <Button
                          variant="link" // Use link variant for similar styling
                          className="p-0 h-auto text-emerald-700 hover:underline"
                          onClick={() => setEditingWireframeId(w.id)}
                        >
                          {w.title}
                        </Button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {w.previewDataUrl ? (
                        <div className="h-10 w-16 overflow-hidden rounded border bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={w.previewDataUrl || "/placeholder.svg"}
                            alt={`${w.title} preview`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{timeAgo(w.updatedAt)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {/* MODIFIED: Replaced Link with a Button that calls setEditingWireframeId */}
                        <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => setEditingWireframeId(w.id)}>
                          Open
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => rename(w.id)}>
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => remove(w.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: Pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Showing {Math.min(total, start + 1)}–{Math.min(total, end)} of {total}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number.parseInt(v))}>
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="40">40</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="h-8 bg-transparent"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[80px] text-center text-sm">
              Page {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-8 bg-transparent"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              title="Next"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
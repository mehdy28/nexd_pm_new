// components/wireframes/WireframesView.tsx

"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, PencilLine, ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import WireframeEditorComponent from "@/components/wireframes/wireframe-editor"
import { useProjectWireframes } from "@/hooks/useWireframes" // Adjust path as necessary

export function WireframesView({ projectId }: { projectId?: string }) {
  const { wireframes, loading, error, refetch, createWireframe, updateWireframe, deleteWireframe } =
    useProjectWireframes(projectId || "")

  const [q, setQ] = useState("")
  const [pageSize, setPageSize] = useState<number>(12)
  const [page, setPage] = useState<number>(1)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [editingWireframeId, setEditingWireframeId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null) // For modal: string for single, array for bulk

  useEffect(() => {
    if (projectId) {
      refetch()
    }
  }, [projectId, refetch])

  useEffect(() => {
    setPage(1)
  }, [q, pageSize, projectId, wireframes])

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = wireframes
    if (query) {
      arr = arr.filter(w => w.title.toLowerCase().includes(query))
    }
    // Default sort by most recently updated
    return [...arr].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [wireframes, q])

  const total = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = filteredItems.slice(start, end)

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }, [])

  const handleCreateNew = useCallback(async () => {
    if (!projectId) return
    try {
      const newWireframe = await createWireframe("Untitled Wireframe", { nodes: [], edges: [] })
      if (newWireframe) {
        setEditingWireframeId(newWireframe.id)
      }
    } catch (err) {
      console.error("Failed to create new wireframe:", err)
    }
  }, [projectId, createWireframe])

  const handleRename = useCallback(
    async (id: string, currentTitle: string) => {
      const nextTitle = prompt("Rename wireframe", currentTitle)
      if (nextTitle && nextTitle.trim() && nextTitle.trim() !== currentTitle) {
        try {
          await updateWireframe(id, { title: nextTitle.trim() })
        } catch (err) {
          console.error("Failed to rename wireframe:", err)
        }
      }
    },
    [updateWireframe],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    try {
      const idsToDelete = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget]
      await Promise.all(idsToDelete.map(id => deleteWireframe(id)))

      setSelected({})
      if (editingWireframeId && idsToDelete.includes(editingWireframeId)) {
        setEditingWireframeId(null)
      }
    } catch (err) {
      console.error("Failed to delete wireframe(s):", err)
      // Optionally, show an error toast to the user
    } finally {
      setDeleteTarget(null) // Close the modal
    }
  }, [deleteTarget, deleteWireframe, editingWireframeId])

  const handleBulkDelete = useCallback(() => {
    if (selectedCount === 0) return
    const idsToDelete = Object.keys(selected).filter(id => selected[id])
    setDeleteTarget(idsToDelete)
  }, [selectedCount, selected])

  const handleExportSelected = useCallback(() => {
    const idsToExport = Object.keys(selected).filter(id => selected[id])
    const dataToExport = wireframes.filter(w => idsToExport.includes(w.id))
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `wireframes-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [selected, wireframes])

  if (editingWireframeId) {
    return (
      <WireframeEditorComponent
        wireframeId={editingWireframeId}
        onBack={() => {
          setEditingWireframeId(null)
          refetch()
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid h-full place-items-center text-red-600">
        Error loading wireframes: {error.message}
      </div>
    )
  }

  const deleteModalDescription =
    deleteTarget && Array.isArray(deleteTarget)
      ? `You are about to permanently delete ${deleteTarget.length} wireframes. This action cannot be undone.`
      : "You are about to permanently delete this wireframe. This action cannot be undone."

  return (
    <>
      <div className="flex h-full flex-col p-4">
        <div className="saas-card flex flex-1 flex-col overflow-hidden p-4">
          {/* Controls */}
          <div className="mb-4 shrink-0 border-b pb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                className="h-9 sm:w-[280px]"
                placeholder="Search wireframes..."
              />
              <div className="flex items-center justify-start gap-2 md:justify-end">
                {selectedCount > 0 && (
                  <>
                    <Button variant="outline" className="h-9 bg-transparent" onClick={handleExportSelected}>
                      Export ({selectedCount})
                    </Button>
                    <Button variant="destructive" className="h-9" onClick={handleBulkDelete}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete selected
                    </Button>
                  </>
                )}
                <Button className="h-9 btn-primary" onClick={handleCreateNew}>
                  <Plus className="mr-1 h-4 w-4" />
                  New wireframe
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {total === 0 ? (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                <div>
                  <p>No wireframes found.</p>
                  <p className="mt-1">Click “New wireframe” to get started.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pageItems.map(w => (
                  <article key={w.id} className="group relative overflow-hidden rounded-lg border">
                    <div className="absolute left-2 top-2 z-10">
                      <Checkbox
                        checked={!!selected[w.id]}
                        onCheckedChange={v => toggleSelect(w.id, !!v)}
                        aria-label="Select wireframe"
                      />
                    </div>
                    <div
                      onClick={() => setEditingWireframeId(w.id)}
                      title="Open wireframe"
                      className="block cursor-pointer"
                    >
                      <div className="aspect-[16/10] w-full bg-slate-50">
                        <img
                          src={w.thumbnail || "/placeholder.svg"}
                          alt={`${w.title} preview`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{w.title}</div>
                        <div className="text-xs text-slate-500">
                          Updated {timeAgo(new Date(w.updatedAt).getTime())}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => handleRename(w.id, w.title)}
                          title="Rename"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(w.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Pagination */}
          <div className="mt-4 shrink-0 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Showing {Math.min(total, start + 1)}–{Math.min(total, end)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number.parseInt(v))}>
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
                  onClick={() => setPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Next"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
            <AlertDialogDescription>{deleteModalDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
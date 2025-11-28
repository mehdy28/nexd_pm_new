"use client"

import { useEffect, useState, useCallback, KeyboardEvent, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, PencilLine, ArrowLeft, ArrowRight, Loader2, Grid } from "lucide-react"
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
import { usePersonalWireframes } from "@/hooks/personal/usePersonalWireframes"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { templates, Template } from "@/lib/whiteBoard/whiteBoard-templates"
import { WireframeTemplatesModal } from "../modals/WireframeTemplatesModal"
import { exportToCanvas } from "@excalidraw/excalidraw"
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import { AppState } from "@excalidraw/excalidraw/types"

const WireframePreview = ({
  data,
  title,
}: {
  data: { elements: ExcalidrawElement[]; appState: Partial<AppState> }
  title: string
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    const generatePreview = async () => {
      if (!isMounted || !containerRef.current) return

      if (!data || !data.elements || data.elements.length === 0) {
        setImageUrl("/placeholder.svg")
        return
      }

      try {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width === 0 || height === 0) {
          setTimeout(generatePreview, 100)
          return
        }

        const canvas = await exportToCanvas({
          elements: data.elements,
          appState: {
            viewBackgroundColor: "transparent",
            exportPadding: 20,
          },
          files: null,
        })

        if (isMounted) {
          setImageUrl(canvas.toDataURL("image/png"))
        }
      } catch (error) {
        console.error("Failed to generate wireframe preview:", error)
        if (isMounted) {
          setImageUrl("/placeholder.svg")
        }
      }
    }

    generatePreview()

    return () => {
      isMounted = false
    }
  }, [data, title])

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      {imageUrl ? (
        <img src={imageUrl} alt={`${title} preview`} className="max-h-full max-w-full object-contain" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}
    </div>
  )
}

const WireframeListView = ({
  onEdit,
  onCreate,
}: {
  onEdit: (id: string) => void
  onCreate: (id: string) => void
}) => {
  const {
    wireframes: pageItems,
    totalCount,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetch,
    createWireframe,
    updateWireframe,
    deleteWireframe,
    deleteManyPersonalWireframes,
  } = usePersonalWireframes()

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null)
  const [renamingWireframeId, setRenamingWireframeId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)

  useEffect(() => {
    setSelected({})
  }, [page, pageSize, search, pageItems])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(startItem + pageSize - 1, totalCount)
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }, [])

  const handleCreateNew = useCallback(async () => {
    try {
      const newWireframe = await createWireframe("Untitled Wireframe", { elements: [], appState: {} })
      if (newWireframe) {
        onCreate(newWireframe.id)
      }
    } catch (err) {
      console.error("Failed to create new wireframe:", err)
    }
  }, [createWireframe, onCreate])

  const handleSelectTemplate = useCallback(
    async (template: Template) => {
      setIsCreatingTemplate(true)
      try {
        const response = await fetch(template.path)
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.statusText}`)
        }
        const templateData = await response.json()
        const newWireframe = await createWireframe(template.name, templateData)
        if (newWireframe) {
          setIsTemplatesModalOpen(false)
          onCreate(newWireframe.id)
        }
      } catch (err) {
        console.error("Failed to create wireframe from template:", err)
      } finally {
        setIsCreatingTemplate(false)
      }
    },
    [createWireframe, onCreate],
  )

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenamingWireframeId(id)
    setEditingTitle(currentTitle)
  }, [])

  const handleConfirmRename = useCallback(async () => {
    if (!renamingWireframeId) return
    const originalWireframe = pageItems.find(w => w.id === renamingWireframeId)
    const newTitle = editingTitle.trim()
    if (originalWireframe && newTitle && newTitle !== originalWireframe.title) {
      try {
        await updateWireframe(renamingWireframeId, { title: newTitle })
      } catch (err) {
        console.error("Failed to rename wireframe:", err)
      }
    }
    setRenamingWireframeId(null)
    setEditingTitle("")
  }, [renamingWireframeId, editingTitle, updateWireframe, pageItems])

  const handleRenameInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleConfirmRename()
      else if (e.key === "Escape") {
        setRenamingWireframeId(null)
        setEditingTitle("")
      }
    },
    [handleConfirmRename],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const idsToDelete = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget]
      
      if (idsToDelete.length > 1) {
        await deleteManyPersonalWireframes(idsToDelete)
      } else {
        await deleteWireframe(idsToDelete[0])
      }
      
      setSelected({})
    } catch (err) {
      console.error("Failed to delete wireframe(s):", err)
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteWireframe, deleteManyPersonalWireframes])

  const handleBulkDelete = useCallback(() => {
    const idsToDelete = Object.keys(selected).filter(id => selected[id])
    if (idsToDelete.length > 0) setDeleteTarget(idsToDelete)
  }, [selected])

  const handleExportSelected = useCallback(async () => {
    const idsToExport = Object.keys(selected).filter(id => selected[id])
    const itemsToExport = pageItems.filter(w => idsToExport.includes(w.id))

    // Iterate sequentially to avoid browser blocking multiple simultaneous downloads
    for (const item of itemsToExport) {
      if (!item.data || !item.data.elements || item.data.elements.length === 0) continue

      try {
        const canvas = await exportToCanvas({
          elements: item.data.elements,
          appState: {
            ...item.data.appState,
            viewBackgroundColor: item.data.appState.viewBackgroundColor || "transparent",
            exportPadding: 20,
          },
          files: null,
        })

        const url = canvas.toDataURL("image/png")
        const a = document.createElement("a")
        a.href = url
        // Sanitize filename
        const safeTitle = item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()
        a.download = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (err) {
        console.error(`Failed to export wireframe: ${item.title}`, err)
      }
    }
  }, [selected, pageItems])

  if (loading && pageItems.length === 0) {
    return <LoadingPlaceholder message="Loading your wireframes..." />
  }

  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetch} />
  }

  const deleteModalDescription =
    deleteTarget && Array.isArray(deleteTarget)
      ? `You are about to permanently delete ${deleteTarget.length} wireframes. This action cannot be undone.`
      : "You are about to permanently delete this wireframe. This action cannot be undone."

  return (
    <>
      <div className="p-2">
        <div className="saas-card p-6">
          <section className="mb-6 border-b pb-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">Start from a template</h2>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {templates.slice(0, 3).map(template => (
                  <div
                    key={template.name}
                    role="button"
                    aria-disabled={isCreatingTemplate}
                    tabIndex={isCreatingTemplate ? -1 : 0}
                    onClick={() => !isCreatingTemplate && handleSelectTemplate(template)}
                    onKeyDown={e => {
                      if (!isCreatingTemplate && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        handleSelectTemplate(template)
                      }
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border text-left outline-none transition-all hover:border-[#4ab5ae] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#4ab5ae] focus-visible:ring-offset-2 [&[aria-disabled='true']]:cursor-wait [&[aria-disabled='true']]:opacity-50"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-white p-2">
                      <img
                        src={template.previewImage}
                        alt={`${template.name} preview`}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="border-t p-3">
                      <h3 className="truncate text-sm font-medium">{template.name}</h3>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white text-slate-500 transition-all hover:border-[#4ab5ae] hover:text-[#4ab5ae]"
                >
                  <Grid className="mb-1 h-6 w-6" />
                  <span className="text-sm font-medium">View All</span>
                </button>
              </div>

              {isCreatingTemplate && (
                <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-[#4ab5ae]" />
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Your wireframes</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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
                  <Button
                    className="h-9 btn-primary bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                    onClick={handleCreateNew}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    New wireframe
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative min-h-[200px]">
              {loading && !pageItems.length && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-white/50">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {pageItems.length > 0 ? (
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
                      <div onClick={() => onEdit(w.id)} title="Open wireframe" className="block cursor-pointer">
                        <div className="aspect-[16/10] w-full bg-white p-2">
                          <WireframePreview data={w.data} title={w.title} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0 flex-1">
                          {renamingWireframeId === w.id ? (
                            <Input
                              autoFocus
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={handleConfirmRename}
                              onKeyDown={handleRenameInputKeyDown}
                              className="h-7 text-sm"
                            />
                          ) : (
                            <div className="truncate text-sm font-medium">{w.title}</div>
                          )}
                          <div className="text-xs text-slate-500">
                            Updated {timeAgo(new Date(w.updatedAt).getTime())}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => handleStartRename(w.id, w.title)}
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
              ) : !loading ? (
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                  <div>
                    <p>No wireframes found.</p>
                    <p className="mt-1">Click “New wireframe” to get started.</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Showing {startItem}–{endItem} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="8"
                        className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]"
                      >
                        8
                      </SelectItem>
                      <SelectItem
                        value="12"
                        className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]"
                      >
                        12
                      </SelectItem>
                      <SelectItem
                        value="20"
                        className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]"
                      >
                        20
                      </SelectItem>
                      <SelectItem
                        value="40"
                        className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]"
                      >
                        40
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="h-8 bg-transparent"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    title="Previous"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[80px] text-center text-sm">
                    Page {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 bg-transparent"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    title="Next"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <WireframeTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        isCreating={isCreatingTemplate}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
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

export function PersonalWireframesView() {
  const [editingWireframeId, setEditingWireframeId] = useState<string | null>(null)

  const handleEditorBack = useCallback(() => {
    setEditingWireframeId(null)
  }, [])

  if (editingWireframeId) {
    return <WireframeEditorComponent wireframeId={editingWireframeId} onBack={handleEditorBack} />
  }

  return <WireframeListView onEdit={setEditingWireframeId} onCreate={setEditingWireframeId} />
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
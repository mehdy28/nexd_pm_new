"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Trash2,
  Loader2,
  Grid,
  PencilLine,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
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
import { templates, PromptTemplate } from "@/lib/prompts/prompt-templates"
import { PromptTemplatesModal } from "../modals/PromptTemplatesModal"

function timeAgo(dateInput: number | string | Date) {
  const ts = typeof dateInput === "string" ? new Date(dateInput).getTime() : new Date(dateInput).getTime()
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

interface PromptListItem {
  id: string
  title: string
  description: string | null
  updatedAt: Date
}

interface PromptListProps {
  prompts: PromptListItem[]
  onSelectPrompt: (id: string) => void
  onCreatePrompt: () => void
  onDeletePrompt: (id: string) => Promise<void>
  onDeleteManyPrompts: (ids: string[]) => Promise<void>
  onSelectTemplate: (template: PromptTemplate) => void
  isCreatingFromTemplate: boolean
  isLoading: boolean
  isError: boolean
  q: string
  setQ: (q: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  totalPages: number
  totalPromptsCount: number
}

export function PromptList({
  prompts,
  onSelectPrompt,
  onCreatePrompt,
  onDeletePrompt,
  onDeleteManyPrompts,
  onSelectTemplate,
  isCreatingFromTemplate,
  isLoading,
  q,
  setQ,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
  totalPromptsCount,
}: PromptListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteManyTarget, setDeleteManyTarget] = useState<string[] | null>(null)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Reset selection when data/page changes to avoid ghost selections
  useEffect(() => {
    setSelected({})
  }, [page, pageSize, q, prompts])

  const startItem = totalPromptsCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(startItem + pageSize - 1, totalPromptsCount)
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }, [])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const newSelected: Record<string, boolean> = {}
      prompts.forEach(p => (newSelected[p.id] = true))
      setSelected(newSelected)
    } else {
      setSelected({})
    }
  }, [prompts])

  const handleBulkDelete = useCallback(() => {
    const idsToDelete = Object.keys(selected).filter(id => selected[id])
    if (idsToDelete.length > 0) {
      setDeleteManyTarget(idsToDelete)
    }
  }, [selected])

  const confirmSingleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await onDeletePrompt(deleteTarget)
    } catch (err) {
      console.error("[PromptList] [Error: SingleDelete]", err)
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, onDeletePrompt])

  const confirmBulkDelete = useCallback(async () => {
    if (!deleteManyTarget) return
    try {
      await onDeleteManyPrompts(deleteManyTarget)
      setSelected({})
    } catch (err) {
      console.error("[PromptList] [Error: BulkDelete]", err)
    } finally {
      setDeleteManyTarget(null)
    }
  }, [deleteManyTarget, onDeleteManyPrompts])

  const isAllSelected = prompts.length > 0 && Object.keys(selected).length === prompts.length && Object.values(selected).every(Boolean)

  const deleteModalDescription =
    deleteManyTarget && deleteManyTarget.length > 1
      ? `You are about to permanently delete ${deleteManyTarget.length} prompts. This action cannot be undone.`
      : "You are about to permanently delete this prompt. This action cannot be undone."

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
                    tabIndex={0}
                    onClick={() => onSelectTemplate(template)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border text-left outline-none transition-all hover:border-[#4ab5ae] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#4ab5ae] focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-50 px-4 py-3 flex items-center justify-center">
                      <p className="w-full text-center text-sm font-medium text-slate-600 leading-relaxed select-none">
                        {template.description.substring(0, 170)}...
                      </p>
                    </div>
                    <div className="border-t p-3 bg-white">
                      <h3 className="truncate text-sm font-medium">{template.name}</h3>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-slate-50 text-slate-500 transition-all hover:border-[#4ab5ae] hover:bg-white hover:text-[#4ab5ae]"
                >
                  <Grid className="mb-1 h-6 w-6" />
                  <span className="text-sm font-medium">View All</span>
                </button>
              </div>

              {isCreatingFromTemplate && (
                <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-[#4ab5ae]" />
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Your Prompts</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  className="h-9 sm:w-[280px]"
                  placeholder="Search prompts..."
                />
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  {selectedCount > 0 && (
                    <Button variant="destructive" className="h-9" onClick={handleBulkDelete}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete ({selectedCount})
                    </Button>
                  )}
                  <Button
                    className="h-9 btn-primary bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                    onClick={onCreatePrompt}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    New Prompt
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative min-h-[200px]">
              {isLoading && !prompts.length && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-white/50">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {prompts.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] px-4">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            aria-label="Select all rows"
                            className="rounded-full"
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-[150px]">Last Updated</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prompts.map(prompt => (
                        <TableRow key={prompt.id}>
                          <TableCell className="px-4">
                            <Checkbox
                              checked={!!selected[prompt.id]}
                              onCheckedChange={v => toggleSelect(prompt.id, !!v)}
                              aria-label="Select prompt"
                              className="rounded-full"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <span
                              onClick={() => onSelectPrompt(prompt.id)}
                              className="cursor-pointer hover:underline"
                              title="Open prompt"
                            >
                              {prompt.title}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{timeAgo(prompt.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => onSelectPrompt(prompt.id)}
                                title="Edit"
                              >
                                <PencilLine className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setDeleteTarget(prompt.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : !isLoading ? (
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                  <div>
                    <p>No prompts found.</p>
                    <p className="mt-1">Click “New Prompt” to get started.</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Showing {startItem}–{endItem} of {totalPromptsCount}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="h-8 bg-transparent"
                    onClick={() => setPage(Math.max(1, page - 1))}
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
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
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

      <PromptTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={template => {
          setIsTemplatesModalOpen(false)
          onSelectTemplate(template)
        }}
        isCreating={isCreatingFromTemplate}
      />

      <AlertDialog
        open={!!deleteTarget || !!deleteManyTarget}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteManyTarget(null)
          }
        }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>{deleteModalDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) confirmSingleDelete();
                if (deleteManyTarget) confirmBulkDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


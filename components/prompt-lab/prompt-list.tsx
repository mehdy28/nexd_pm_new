// components/prompt-lab/PromptList.tsx

"use client"

import { useMemo, useState, useCallback } from "react"
import PromptCard from "./prompt-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { Prompt } from "@/components/prompt-lab/store"
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

interface PromptListProps {
  prompts: Prompt[]
  onSelectPrompt: (id: string) => void
  onCreatePrompt: () => Promise<any>
  onDeletePrompt: (id: string) => void
  isLoading?: boolean
  isError?: boolean
}

export function PromptList({
  prompts,
  onSelectPrompt,
  onCreatePrompt,
  onDeletePrompt,
  isLoading,
  isError,
}: PromptListProps) {
  const [q, setQ] = useState("")
  const [pageSize, setPageSize] = useState<number>(9)
  const [page, setPage] = useState<number>(1)
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null)

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = prompts
    if (query) {
      arr = arr.filter(p => p.title.toLowerCase().includes(query))
    }
    return arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [prompts, q])

  const total = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = filteredItems.slice(start, end)

  const handleDeleteClick = (prompt: Prompt) => {
    setPromptToDelete(prompt)
  }

  const handleConfirmDelete = async () => {
    if (promptToDelete) {
      await onDeletePrompt(promptToDelete.id)
      setPromptToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid h-full place-items-center text-red-500">
        <p>Failed to load prompts.</p>
      </div>
    )
  }

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
                placeholder="Search prompts..."
              />
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <Button className="h-9 btn-primary" onClick={onCreatePrompt}>
                  <Plus className="mr-1 h-4 w-4" />
                  New Prompt
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {total === 0 ? (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                <div>
                  <p>No prompts found.</p>
                  <p className="mt-1">Click “New Prompt” to create one.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pageItems.map(prompt => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onClick={() => onSelectPrompt(prompt.id)}
                    onDelete={() => handleDeleteClick(prompt)}
                  />
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
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
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
      <AlertDialog open={!!promptToDelete} onOpenChange={open => !open && setPromptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the prompt
              <span className="font-semibold"> "{promptToDelete?.title}"</span> and all its versions. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
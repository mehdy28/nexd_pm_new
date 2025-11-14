"use client"

import { useState } from "react"
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
  // Search and Pagination props
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
  isLoading,
  isError,
  q,
  setQ,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
  totalPromptsCount,
}: PromptListProps) {
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null)

  const handleDeleteClick = (prompt: Prompt) => {
    setPromptToDelete(prompt)
  }

  const handleConfirmDelete = async () => {
    if (promptToDelete) {
      await onDeletePrompt(promptToDelete.id)
      setPromptToDelete(null)
    }
  }

  const startItem = totalPromptsCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalPromptsCount);


  // if (isError) {
  //   return (
  //     <div className="grid h-full place-items-center text-red-500">
  //       <p>Failed to load prompts.</p>
  //     </div>
  //   )
  // }

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
                <Button className="h-9 btn-primary bg-[#4ab5ae] text-white hover:bg-[#419d97]" onClick={onCreatePrompt}>
                  <Plus className="mr-1 h-4 w-4" />
                  New Prompt
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative flex-1 overflow-y-auto">
            {isLoading && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-white/50 dark:bg-slate-900/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {totalPromptsCount === 0 && !isLoading ? (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                <div>
                  <p>No prompts found.</p>
                  <p className="mt-1">Click “New Prompt” to create one.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {prompts.map(prompt => (
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
                Showing {startItem}–{endItem} of {totalPromptsCount}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number.parseInt(v))}>
                  <SelectTrigger className="h-8 w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">6</SelectItem>
                    <SelectItem value="9" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">9</SelectItem>
                    <SelectItem value="12" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">12</SelectItem>
                    <SelectItem value="24" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">24</SelectItem>
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
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Trash2,
  Loader2,
  Grid,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
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
import { ProjectPromptTemplatesModal } from "../modals/ProjectPromptTemplatesModal"
import { projectTemplates,  PromptTemplate } from "@/lib/prompts/project-prompt-templates"

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

// This is a simplified version of your prompt list item type
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
  onSelectTemplate: (template: PromptTemplate) => void
  isCreatingFromTemplate: boolean
  isLoading: boolean
  q: string
  setQ: (q: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  totalPages: number
  totalPromptsCount: number
}

export function ProjectPromptList({
  prompts,
  onSelectPrompt,
  onCreatePrompt,
  onDeletePrompt,
  onSelectTemplate,
  isCreatingFromTemplate,
  isLoading,
  q,
  setQ,
  page,
  setPage,
  pageSize,
  totalPages,
  totalPromptsCount,
}: PromptListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)

  const startItem = totalPromptsCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(startItem + pageSize - 1, totalPromptsCount)

  return (
    <>
      <div className="p-2">
        <div className="saas-card p-6">
          <section className="mb-6 border-b pb-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">Start from a template</h2>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {projectTemplates.slice(0, 3).map(template => (
                  <div
                    key={template.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTemplate(template)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border bg-slate-50 p-4 text-left outline-none transition-all hover:border-[#4ab5ae] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#4ab5ae] focus-visible:ring-offset-2"
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{template.description}</p>
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
                <Button
                  className="h-9 justify-self-end bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                  onClick={onCreatePrompt}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  New Blank Prompt
                </Button>
              </div>
            </div>

            <div className="relative min-h-[300px]">
              {isLoading && !prompts.length ? (
                <div className="absolute inset-0 z-10 grid place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : prompts.length > 0 ? (
                <div className="space-y-2">
                  {prompts.map(prompt => (
                    <div
                      key={prompt.id}
                      className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onSelectPrompt(prompt.id)}
                      >
                        <p className="font-medium">{prompt.title}</p>
                        <p className="text-sm text-slate-500">Updated {timeAgo(prompt.updatedAt)}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setDeleteTarget(prompt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                  <p>No prompts found.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-slate-600">
                Showing {startItem}–{endItem} of {totalPromptsCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="ml-1">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <span className="mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ProjectPromptTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={template => {
          setIsTemplatesModalOpen(false)
          onSelectTemplate(template)
        }}
        isCreating={isCreatingFromTemplate}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the prompt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) onDeletePrompt(deleteTarget)
                setDeleteTarget(null)
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
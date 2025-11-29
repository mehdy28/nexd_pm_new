"use client"

import { useEffect, useState, useCallback, KeyboardEvent, useMemo, useRef } from "react"
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
  PencilLine,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Grid,
  FileText,
  ChevronLeft,
  MessageSquare,
  Send,
  MoreVertical,
  // Upload removed
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { useProjectDocuments } from "@/hooks/useProjectDocuments"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { templates, Template } from "@/lib/documents/document-templates"
import { DocumentTemplatesModal } from "../modals/DocumentTemplatesModal" 
import { Editor } from "./DynamicEditor"
import { useAuth } from "@/hooks/useAuth" // Assuming useAuth is available for comment authorship checks
import { useDocumentComments } from "@/hooks/useDocumentComments"
import { PdfViewer } from "./pdf-viewer" // Retained for DocumentEditorView
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// --- UTILITIES ---

function timeAgo(dateInput: number | string) {
  const ts = typeof dateInput === "string" ? new Date(dateInput).getTime() : dateInput
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName ? firstName.charAt(0) : ""
  const last = lastName ? lastName.charAt(0) : ""
  return `${first}${last}`.toUpperCase()
}

// --- TYPE ASSUMPTIONS (MOCK/INFERENCE) ---
interface CommentAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  avatar?: string | null
  avatarColor?: string | null // Added avatarColor
}
interface DocumentComment {
  id: string
  content: string
  createdAt: number | string
  author: CommentAuthor
}
interface ProjectDocument {
    id: string;
    title: string;
    updatedAt: number | string;
    createdAt: number | string;
    content: any;
    comments?: DocumentComment[];
    type: "doc" | "pdf"; // Keep type for editor view logic
    dataUrl?: string; // Keep dataUrl for PDF viewing
}


// --- COMPONENTS ---

const DocumentComments = ({
  documentId,
  comments,
}: {
  documentId: string
  comments: DocumentComment[]
}) => {
  const { currentUser } = useAuth()
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const { newComment, setNewComment, handleAddComment, deleteComment, addingComment } =
    useDocumentComments(documentId)

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  return (
    <div className="flex h-full flex-col border-l bg-slate-50">
      <div className="border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <MessageSquare className="h-5 w-5" />
          Comments
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-sm text-slate-500">No comments yet.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="group flex items-start gap-2">
                <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={comment.author.avatar || undefined} />
                    <AvatarFallback 
                        className="text-xs text-white"
                        style={{ backgroundColor: comment.author.avatarColor   }}
                    >
                        {getInitials(comment.author.firstName, comment.author.lastName)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {comment.author.firstName} {comment.author.lastName}
                      </p>
                      <span className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</span>
                    </div>
                    {currentUser?.id === comment.author.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="-mr-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                            onClick={() => deleteComment({ variables: { id: comment.id } })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-1">
                    <div className="inline-block max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                      <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        )}
      </div>
      <div className="border-t bg-white p-3">
        <form
          onSubmit={e => {
            e.preventDefault()
            handleAddComment(e)
          }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-1 pr-2 focus-within:ring-2 focus-within:ring-[#4ab5ae]">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 resize-none border-0 bg-transparent py-1.5 px-2 shadow-none focus-visible:ring-0"
              rows={1}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAddComment(e)
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 flex-shrink-0 rounded-full bg-[#a0d9d6] hover:bg-[#8bcac6]"
              disabled={addingComment || !newComment.trim()}
            >
              {addingComment ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DocumentListView = ({
  projectId,
  onEdit,
  onCreate,
}: {
  projectId: string
  onEdit: (id: string) => void
  onCreate: (id: string) => void
}) => {
  const {
    documents: pageItems,
    totalCount,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetchDocumentsList,
    createProjectDocument,
    // createPdfFromDataUrl removed
    updateProjectDocument,
    deleteProjectDocument,
    deleteManyProjectDocuments,
  } = useProjectDocuments(projectId) // Using Project Documents hook

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null)
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  // fileInputRef removed


  useEffect(() => {
    // Reset selection on page/filter change
    setSelected({})
  }, [page, pageSize, search, pageItems])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(startItem + pageSize - 1, totalCount)
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }, [])

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allSelected = pageItems.reduce((acc, doc) => {
          acc[doc.id] = true
          return acc
        }, {} as Record<string, boolean>)
        setSelected(allSelected)
      } else {
        setSelected({})
      }
    },
    [pageItems],
  )
  
  const handleCreateNew = useCallback(async () => {
    try {
      const newDoc = await createProjectDocument("Untitled Document")
      if (newDoc) {
        onCreate(newDoc.id)
      }
    } catch (err) {
      console.error("Failed to create new document:", err)
    }
  }, [createProjectDocument, onCreate])

  const handleSelectTemplate = useCallback(
    async (template: Template) => {
      setIsCreatingTemplate(true)
      try {
        const response = await fetch(template.path)
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.statusText}`)
        }
        const templateData = await response.json()
        const newDoc = await createProjectDocument(template.name, templateData)
        if (newDoc) {
          setIsTemplatesModalOpen(false)
          onCreate(newDoc.id)
        }
      } catch (err) {
        console.error("Failed to create document from template:", err)
      } finally {
        setIsCreatingTemplate(false)
      }
    },
    [createProjectDocument, onCreate],
  )

  // PDF upload handlers removed

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenamingDocumentId(id)
    setEditingTitle(currentTitle)
  }, [])

  const handleConfirmRename = useCallback(async () => {
    if (!renamingDocumentId) return
    const originalDoc = pageItems.find(w => w.id === renamingDocumentId)
    const newTitle = editingTitle.trim()
    if (originalDoc && newTitle && newTitle !== originalDoc.title) {
      try {
        await updateProjectDocument(renamingDocumentId, { title: newTitle })
      } catch (err) {
        console.error("Failed to rename document:", err)
      }
    }
    setRenamingDocumentId(null)
    setEditingTitle("")
  }, [renamingDocumentId, editingTitle, updateProjectDocument, pageItems])

  const handleRenameInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleConfirmRename()
      else if (e.key === "Escape") {
        setRenamingDocumentId(null)
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
        await deleteManyProjectDocuments(idsToDelete)
      } else {
        await deleteProjectDocument(idsToDelete[0])
      }
      
      setSelected({})
    } catch (err) {
      console.error("Failed to delete document(s):", err)
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteProjectDocument, deleteManyProjectDocuments])

  const handleBulkDelete = useCallback(() => {
    const idsToDelete = Object.keys(selected).filter(id => selected[id])
    if (idsToDelete.length > 0) setDeleteTarget(idsToDelete)
  }, [selected])

  if (loading && pageItems.length === 0) {
    return <LoadingPlaceholder message="Loading project documents..." />
  }

  if (error) {
    return <ErrorPlaceholder error={new Error(error)} onRetry={refetchDocumentsList} />
  }

  const deleteModalDescription =
    deleteTarget && Array.isArray(deleteTarget)
      ? `You are about to permanently delete ${deleteTarget.length} documents. This action cannot be undone.`
      : "You are about to permanently delete this document. This action cannot be undone."

  // Determine selection state for the header checkbox
  const isAllSelected = pageItems.length > 0 && selectedCount === pageItems.length
  const isIndeterminate = selectedCount > 0 && selectedCount < pageItems.length


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
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="border-t p-3">
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
                  <span className="text-sm font-medium">Document Templates</span>
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
              <h2 className="text-xl font-semibold text-slate-800">Project Documents</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 sm:w-[280px]"
                  placeholder="Search documents..."
                />
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  {selectedCount > 0 && (
                    <Button variant="destructive" className="h-9" onClick={handleBulkDelete}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete ({selectedCount})
                    </Button>
                  )}
                  {/* PDF Upload buttons removed */}
                  <Button
                    className="h-9 btn-primary bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                    onClick={handleCreateNew}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    New document
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
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] px-4">
                          <Checkbox
                            checked={isIndeterminate ? "indeterminate" : isAllSelected}
                            onCheckedChange={v => toggleSelectAll(!!v)}
                            aria-label="Select all rows"
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-[150px]">Last Updated</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell className="px-4">
                            <Checkbox
                              checked={!!selected[doc.id]}
                              onCheckedChange={v => toggleSelect(doc.id, !!v)}
                              aria-label="Select document"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {renamingDocumentId === doc.id ? (
                              <Input
                                autoFocus
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                onBlur={handleConfirmRename}
                                onKeyDown={handleRenameInputKeyDown}
                                className="h-8 text-sm"
                              />
                            ) : (
                              <span
                                onClick={() => onEdit(doc.id)}
                                className="flex items-center gap-2 cursor-pointer hover:underline"
                                title="Open document"
                              >
                                {/* Reverting to single FileText icon as in PersonalDocuments list */}
                                <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                {doc.title}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{timeAgo(doc.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => handleStartRename(doc.id, doc.title)}
                                title="Rename"
                              >
                                <PencilLine className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setDeleteTarget(doc.id)}
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
              ) : !loading ? (
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                  <div>
                    <p>No documents found.</p>
                    <p className="mt-1">Click “New document” to get started.</p>
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
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
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

      <DocumentTemplatesModal
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

const DocumentEditorView = ({
  document,
  onBack,
  onUpdate,
  loading,
}: {
  document: ProjectDocument
  onBack: () => void
  onUpdate: (updates: Partial<ProjectDocument>) => void
  loading: boolean
}) => {
  const isPdf = document.type === "pdf"

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} title="Back to documents list">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Input
          value={document.title}
          onChange={e => onUpdate({ title: e.target.value })}
          className="h-11 flex-1 border-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg bg-white shadow-inner">
        <div className="flex-1 overflow-y-auto py-2">
          {loading && !document.content && !isPdf ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isPdf ? (
            <PdfViewer dataUrl={document.dataUrl} />
          ) : (
            <Editor
              key={document.id}
              initialContent={document.content}
              onChange={content => onUpdate({ content })}
            />
          )}
        </div>
        <div className="w-[350px] flex-shrink-0">
          <DocumentComments documentId={document.id} comments={document.comments || []} />
        </div>
      </div>
    </div>
  )
}

export function DocumentsView({ projectId }: { projectId: string }) {
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  
  const {
    documents,
    selectedDocument,
    loading: listLoading,
    selectDocument,
    updateProjectDocument,
  } = useProjectDocuments(projectId)

  useEffect(() => {
    if (editingDocumentId) {
      selectDocument(editingDocumentId)
    } else {
      selectDocument(null)
    }
  }, [editingDocumentId, selectDocument])

  const handleBack = useCallback(() => {
    setEditingDocumentId(null)
  }, [])

  const handleCreate = useCallback((newId: string) => {
    setEditingDocumentId(newId)
  }, [])


  if (editingDocumentId && selectedDocument) {
    const documentForEditor =
      selectedDocument.id === editingDocumentId ? selectedDocument : documents.find(d => d.id === editingDocumentId)
    
    if (documentForEditor) {
      // Logic for determining if content is loading based on type 'doc'
      const isLoadingContent = documentForEditor.type === 'doc' && (!selectedDocument.content || selectedDocument.id !== editingDocumentId);

      return (
        <DocumentEditorView
          document={documentForEditor as ProjectDocument}
          onBack={handleBack}
          onUpdate={updates => updateProjectDocument(editingDocumentId, updates)}
          loading={isLoadingContent}
        />
      )
    }
  }

  return <DocumentListView projectId={projectId} onEdit={setEditingDocumentId} onCreate={handleCreate} />
}
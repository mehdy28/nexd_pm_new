// components/documents/documents-view.tsx
"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Upload, Plus, ChevronLeft, ArrowLeft, ArrowRight, FileText, File, Trash2, Edit2, Clock } from "lucide-react"
import { useProjectDocuments } from "@/hooks/useProjectDocuments"
import { Editor } from "./DynamicEditor"
import { PdfViewer } from "./pdf-viewer"
import { cn } from "@/lib/utils"

export function DocumentsView() {
  const { documents, selectedDocument, loading, error, createProjectDocument, createPdfFromDataUrl, updateProjectDocument, deleteProjectDocument, selectDocument, refetchDocumentsList } =
    useProjectDocuments()

  const [query, setQuery] = useState("")
  const [showEditor, setShowEditor] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pageSize, setPageSize] = useState<number>(12)
  const [page, setPage] = useState<number>(1)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setShowEditor(!!selectedDocument)
  }, [selectedDocument])

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])
  
  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase()
    let sortedDocs = [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    if (!q) return sortedDocs
    return sortedDocs.filter(d => d.title.toLowerCase().includes(q))
  }, [documents, query])

  const total = filteredDocs.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = filteredDocs.slice(start, end)

  const handleCreateDoc = useCallback(() => {
    createProjectDocument("Untitled Document")
  }, [createProjectDocument])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== "application/pdf") {
      if (e.target) e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      createPdfFromDataUrl(String(reader.result), file.name)
      if (e.target) e.target.value = ""
    }
    reader.readAsDataURL(file)
  }, [createPdfFromDataUrl])

  const handleBackToList = () => {
    selectDocument(null)
    setEditingId(null)
  }

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteProjectDocument(deleteTarget)
    } catch (err) {
      console.error("Failed to delete document", err)
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteProjectDocument])

  if (loading && !documents.length) {
    return (
      <div className="h-full w-full grid place-items-center">
        <p className="text-slate-500">Loading documents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full grid place-items-center text-red-500">
        <p>Error: {error instanceof Error ? error.message : "An unknown error occurred"}</p>
        <Button onClick={() => refetchDocumentsList && refetchDocumentsList()}>Try Again</Button>
      </div>
    )
  }

  return (
    <>
      <div className="h-full w-full overflow-hidden p-4 flex flex-col">
        {showEditor && selectedDocument ? (
          // Editor/Viewer View
          <div className="flex h-full min-h-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleBackToList} title="Back to documents list">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Input
                value={selectedDocument.title}
                onChange={e =>
                  updateProjectDocument(selectedDocument.id, {
                    title: e.target.value || (selectedDocument.type === "pdf" ? "PDF Document" : "Untitled"),
                  })
                }
                className="h-11 text-lg font-semibold flex-1 border-0 shadow-none focus-visible:ring-0"
                placeholder={selectedDocument.type === "pdf" ? "PDF Document" : "Untitled"}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-white py-2 shadow-inner">
              {selectedDocument.type === "doc" ? (
                <Editor
                  key={selectedDocument.id}
                  initialContent={selectedDocument.content}
                  onChange={documentBlocks => updateProjectDocument(selectedDocument.id, { content: documentBlocks })}
                />
              ) : (
                <PdfViewer dataUrl={selectedDocument.dataUrl} />
              )}
            </div>
          </div>
        ) : (
          // List View
          <div className="saas-card flex flex-1 flex-col overflow-hidden p-4">
            <div className="mb-4 shrink-0 border-b pb-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="h-9 sm:w-[280px]"
                  placeholder="Search documents..."
                />
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                  <Button variant="outline" className="h-9 bg-transparent" onClick={handleUploadClick}>
                    <Upload className="mr-1 h-4 w-4" /> Upload PDF
                  </Button>
                  <Button className="h-9 btn-primary" onClick={handleCreateDoc}>
                    <Plus className="mr-1 h-4 w-4" /> New Document
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pageItems.length > 0 ? (
                <ul className="space-y-2">
                  {pageItems.map(doc => {
                    const isEditing = editingId === doc.id
                    const isPdf = doc.type === "pdf"
                    const Icon = isPdf ? File : FileText
                    return (
                      <li
                        key={doc.id}
                        className="group rounded-lg border p-3 hover:bg-slate-50 transition flex items-start gap-3"
                      >
                        <button className="flex flex-1 flex-col text-left" onClick={() => selectDocument(doc.id)} title={doc.title}>
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-4 w-4 text-slate-500" />
                            {isEditing ? (
                              <Input
                                ref={inputRef}
                                defaultValue={doc.title}
                                className="h-8"
                                onBlur={e => {
                                  const v = e.target.value.trim() || (isPdf ? "PDF Document" : "Untitled")
                                  updateProjectDocument(doc.id, { title: v })
                                  setEditingId(null)
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
                                  if (e.key === "Escape") setEditingId(null)
                                }}
                              />
                            ) : (
                              <div className="line-clamp-1 text-sm font-medium">{doc.title}</div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Updated {timeAgo(new Date(doc.updatedAt).getTime())}</span>
                          </div>
                        </button>
                        <div className="ml-1 flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(doc.id)} title="Rename">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteTarget(doc.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                  <div>
                    <p>No documents found.</p>
                    <p className="mt-1">Create a document or upload a PDF to get started.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 shrink-0 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Showing {Math.min(total, start + 1)}–{Math.min(total, end)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={v => setPageSize(Number.parseInt(v))}>
                    <SelectTrigger className="h-8 w-[90px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="h-8 bg-transparent" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} title="Previous">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[80px] text-center text-sm">
                    Page {currentPage} / {totalPages}
                  </div>
                  <Button variant="outline" className="h-8 bg-transparent" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} title="Next">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document. This action cannot be undone.
            </AlertDialogDescription>
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
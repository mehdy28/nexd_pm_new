"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFirebaseAuth } from "@/lib/hooks/useFirebaseAuth"
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from "@/lib/hooks/useDocument"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, Plus } from "lucide-react"
import { DocumentEditor } from "./editor"
import { DocumentList } from "./document-list"
import type { Doc } from "./types"
import { PdfViewer } from "./pdf-viewer"

interface DocumentsViewProps {
  projectId?: string
}

export function DocumentsView({ projectId }: DocumentsViewProps) {
  const { user } = useFirebaseAuth()
  const { documents, loading, refetch } = useDocuments(projectId, user?.uid, !projectId)
  const { createDocument } = useCreateDocument()
  const { updateDocument } = useUpdateDocument()
  const { deleteDocument } = useDeleteDocument()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Convert documents to local format
  const docs: Doc[] = useMemo(() => {
    return documents.map(doc => ({
      id: doc.id,
      type: "doc" as const,
      title: doc.title,
      content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content || ""),
      updatedAt: new Date(doc.updatedAt).getTime(),
    }))
  }, [documents])

  useEffect(() => {
    if (docs.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !docs.some((d) => d.id === selectedId)) {
      setSelectedId(docs[0].id)
    }
  }, [docs, selectedId])

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase()
    let byTime = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)


    if (!q) return byTime
    return byTime.filter((d) => d.title.toLowerCase().includes(q))
  }, [docs, query])

  const selected: Doc | null = useMemo(() => docs.find((d) => d.id === selectedId) || null, [docs, selectedId])

  async function handleCreateDoc() {
    try {
      const result = await createDocument({
        variables: {
          input: {
            title: "Untitled",
            content: "",
            type: "TEXT",
            projectId,
            userId: projectId ? null : user?.uid,
          }
        }
      })
      if (result.data?.createDocument) {
        setSelectedId(result.data.createDocument.id)
        refetch()
      }
    } catch (error) {
      console.error("Error creating document:", error)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      // For now, we'll create a text document with PDF info
      // In a real implementation, you'd handle PDF upload differently
      handleCreateDoc()
      e.target.value = ""
    }
    reader.readAsDataURL(file)
  }

  async function handleUpdateDoc(id: string, updates: Partial<Doc>) {
    try {
      await updateDocument({
        variables: {
          id,
          input: {
            title: updates.title,
            content: updates.content,
          }
        }
      })
      refetch()
    } catch (error) {
      console.error("Error updating document:", error)
    }
  }

  async function handleDeleteDoc(id: string) {
    try {
      await deleteDocument({
        variables: { id }
      })
      if (selectedId === id) setSelectedId(null)
      refetch()
    } catch (error) {
      console.error("Error deleting document:", error)
    }
  }

  if (loading) {
    return <div className="p-6">Loading documents...</div>
  }

  return (
    <div className="h-full w-full overflow-hidden p-4 flex flex-col">
      {projectId && <div className="mb-4 text-sm text-slate-600">Documents for Project {projectId}</div>}

      {/* Top toolbar above list and editor */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 sm:max-w-xs"
          placeholder="Search documents..."
        />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            className="h-9 gap-2 bg-transparent"
            onClick={() => fileInputRef.current?.click()}
            title="Upload PDF"
          >
            <Upload className="h-4 w-4" />
            PDF
          </Button>
          <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleCreateDoc}>
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        {/* Left: Scrollable list column */}
        <div className="rounded-lg border bg-white">
          <DocumentList
            docs={filteredDocs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRename={(id, title) => handleUpdateDoc(id, { title })}
            onDelete={handleDeleteDoc}
          />
        </div>

        {/* Right: document block scrolls to show the entire document */}
        <div className="min-h-0 overflow-hidden rounded-lg border bg-white p-4">
          {selected ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <Input
                value={selected.title}
                onChange={(e) =>
                  handleUpdateDoc(selected.id, {
                    title: e.target.value || (selected.type === "pdf" ? "PDF Document" : "Untitled"),
                  })
                }
                className="h-11 text-lg font-semibold"
                placeholder={selected.type === "pdf" ? "PDF Document" : "Untitled"}
              />
              {/* Make this block the scroller */}
              <div className="min-h-0 flex-1 overflow-auto">
                {selected.type === "doc" ? (
                  <DocumentEditor
                    key={selected.id}
                    docId={selected.id}
                    contentJSON={selected.content}
                    onChange={(json) => handleUpdateDoc(selected.id, { content: json })}
                  />
                ) : (
                  <PdfViewer dataUrl={selected.dataUrl} />
                )}
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">
              Create a document or upload a PDF to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

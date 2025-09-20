"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, Plus } from "lucide-react"
import { useDocuments } from "./use-documents"
import { Editor } from "./DynamicEditor"
import { DocumentList } from "./document-list"
import type { Doc } from "./types"
import { PdfViewer } from "./pdf-viewer"

interface DocumentsViewProps {
  projectId?: string
}

export function DocumentsView({ projectId }: DocumentsViewProps) {
  const { docs, createDoc, createPdfFromDataUrl, update, remove } = useDocuments()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

    if (projectId) {
      byTime = byTime.filter((doc) => doc.projectId === projectId)
    }

    if (!q) return byTime
    return byTime.filter((d) => d.title.toLowerCase().includes(q))
  }, [docs, query, projectId])

  const selected: Doc | null = useMemo(() => docs.find((d) => d.id === selectedId) || null, [docs, selectedId])

  function handleCreateDoc() {
    const doc = createDoc("Untitled")
    setSelectedId(doc.id)
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
      createPdfFromDataUrl(String(reader.result), file.name)
      e.target.value = ""
    }
    reader.readAsDataURL(file)
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
            onRename={(id, title) => update(id, { title })}
            onDelete={(id) => {
              remove(id)
              if (selectedId === id) setSelectedId(null)
            }}
          />
        </div>

        {/* Right: document block scrolls to show the entire document */}
        <div className="min-h-0 overflow-hidden rounded-lg border bg-white p-4">
          {selected ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <Input
                value={selected.title}
                onChange={(e) =>
                  update(selected.id, {
                    title: e.target.value || (selected.type === "pdf" ? "PDF Document" : "Untitled"),
                  })
                }
                className="h-11 text-lg font-semibold"
                placeholder={selected.type === "pdf" ? "PDF Document" : "Untitled"}
              />
              {/* Make this block the scroller */}
              <div className="min-h-0 flex-1 overflow-auto">
                {selected.type === "doc" ? (
                  <Editor
                    key={selected.id}
                    initialContent={selected.content}
                    onChange={(editor) => update(selected.id, { content: editor.topLevelBlocks })}
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

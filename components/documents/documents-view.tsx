"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, Plus, ChevronLeft } from "lucide-react"
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
  const [showEditor, setShowEditor] = useState(false) // New state to control view
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    console.log("[Doc] useEffect triggered.");
    console.log("[Doc] Current docs length:", docs.length);
    console.log("[Doc] Current selectedId:", selectedId);
    console.log("[Doc] Current showEditor:", showEditor);

    if (!selectedId && docs.length > 0) {
      console.log("[Doc] No selectedId, but docs exist. Setting showEditor to false.");
      setShowEditor(false);
    } else if (selectedId && !docs.some((d) => d.id === selectedId)) {
      console.log("[Doc] Invalid selectedId. Resetting and setting showEditor to false.");
      setSelectedId(null);
      setShowEditor(false);
    } else if (selectedId && showEditor) {
      console.log("[Doc] Valid selectedId and showEditor is true. Keeping editor visible.");
      setShowEditor(true);
    } else if (selectedId && !showEditor) {
      console.log("[Doc] Valid selectedId but showEditor is false. Keeping list visible.");
      setShowEditor(false);
    }
  }, [docs, selectedId, showEditor]);

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase()
    let byTime = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)
    console.log("[Doc] unfiltered docs count:", byTime.length);

    if (projectId) {
      byTime = byTime.filter((doc) => doc.projectId === projectId)
      console.log("[Doc] docs filtered by projectId (", projectId, ") count:", byTime.length);
    }

    if (!q) {
      console.log("[Doc] filteredDocs (no query):", byTime.map(d => d.title));
      return byTime;
    }
    const result = byTime.filter((d) => d.title.toLowerCase().includes(q));
    console.log("[Doc] filteredDocs (with query ", q, "):", result.map(d => d.title));
    return result;
  }, [docs, query, projectId])

  const selected: Doc | null = useMemo(() => docs.find((d) => d.id === selectedId) || null, [docs, selectedId])

  function handleCreateDoc() {
    console.log("[Doc] handleCreateDoc called.");
    const doc = createDoc("Untitled", projectId); // Pass projectId here
    console.log("[Doc] New document created:", doc);
    setSelectedId(doc.id)
    console.log("[Doc] setSelectedId to:", doc.id);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log("[Doc] handleFileChange called.");
    const file = e.target.files?.[0]
    if (!file) {
      console.log("[Doc] No file selected.");
      return;
    }
    if (file.type !== "application/pdf") {
      console.log("[Doc] File is not a PDF.");
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      console.log("[Doc] FileReader onload.");
      const newDoc = createPdfFromDataUrl(String(reader.result), file.name, projectId);
      console.log("[Doc] New PDF document created:", newDoc);
      setSelectedId(newDoc.id)
      console.log("[Doc] setSelectedId to:", newDoc.id);
      setShowEditor(false) // Keep the list view visible after uploading a new PDF
      e.target.value = ""
    }
    reader.readAsDataURL(file)
  }

  function handleSelectDocument(id: string) {
    console.log("[Doc] handleSelectDocument called with id:", id);
    setSelectedId(id)
    setShowEditor(true) // Show editor when a document is selected
  }

  function handleBackToList() {
    console.log("[Doc] handleBackToList called.");
    setSelectedId(null)
    setShowEditor(false) // Go back to the list view
  }

  return (
    <div className="h-full w-full overflow-hidden p-4 flex flex-col">
      {showEditor && selected ? (
        // Editor/Viewer View
        <div className="flex h-full min-h-0 flex-col gap-1">
          <div className="flex items-center gap-2 mb-0">
            <Button variant="ghost" size="icon" onClick={handleBackToList} title="Back to documents list">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Input
              value={selected.title}
              onChange={(e) =>
                update(selected.id, {
                  title: e.target.value || (selected.type === "pdf" ? "PDF Document" : "Untitled"),
                })
              }
              className="h-11 text-lg font-semibold flex-1"
              placeholder={selected.type === "pdf" ? "PDF Document" : "Untitled"}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-white py-2 mx-12 shadow-2xl">
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
        // List View
        <>
          {/* Top toolbar above list */}
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
              {/* <Button
                variant="outline"
                className="h-9 gap-2 bg-transparent"
                onClick={() => fileInputRef.current?.click()}
                title="Upload PDF"
              >
                <Upload className="h-4 w-4" />
                PDF
              </Button> */}
              <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleCreateDoc}>
                <Plus className="mr-1 h-4 w-4" />
                New
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 rounded-lg bg-white">
            {filteredDocs.length > 0 ? (
              <DocumentList
                docs={filteredDocs}
                selectedId={selectedId}
                onSelect={handleSelectDocument} // Use new handler
                onRename={(id, title) => update(id, { title })}
                onDelete={(id) => {
                  remove(id)
                  if (selectedId === id) setSelectedId(null)
                }}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500">
                Create a document or upload a PDF to get started.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

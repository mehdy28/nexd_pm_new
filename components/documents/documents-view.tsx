// components/documents/documents-view.tsx
"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Plus, ChevronLeft } from "lucide-react";
// REMOVE THIS: import { useDocuments } from "./use-documents";
import { useProjectDocuments, type ProjectDocument } from "@/hooks/useProjectDocuments"; // NEW IMPORT
import { Editor } from "./DynamicEditor";
import { DocumentList } from "./document-list";
// REMOVE THIS: import type { Doc } from "./types"; // If 'Doc' type is only used here, it can be removed
import { PdfViewer } from "./pdf-viewer";

interface DocumentsViewProps {
  // projectId?: string; // projectId is now obtained via useParams in the hook
}

export function DocumentsView({ /* projectId */ }: DocumentsViewProps) { // Remove projectId prop here
  const {
    documents: docs, // Renamed to 'docs' for consistency with original component
    selectedDocument: selected, // Renamed to 'selected'
    loading,
    error,
    createProjectDocument, // Renamed from createDoc
    createPdfFromDataUrl,
    updateProjectDocument, // Renamed from update
    deleteProjectDocument, // Renamed from remove
    selectDocument, // New explicit select method
    refetchDocumentsList, // Optional: if you need a manual refresh button
  } = useProjectDocuments(); // Initialize the new hook

  // const [selectedId, setSelectedId] = useState<string | null>(null); // This state is now managed by the hook's `selectDocument`
  const [query, setQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync internal state with hook's selectedDocument
  useEffect(() => {
    // Determine showEditor based on whether a document is selected
    if (selected) {
      setShowEditor(true);
    } else {
      setShowEditor(false);
    }
  }, [selected]); // Only re-run when `selected` document changes

  // Logging for debugging (can be removed in production)
  useEffect(() => {
    console.log("[DocView] useEffect triggered.");
    console.log("[DocView] Current docs length:", docs.length);
    console.log("[DocView] Current selected doc ID:", selected?.id);
    console.log("[DocView] Current showEditor:", showEditor);
    console.log("[DocView] Loading:", loading);
    console.log("[DocView] Error:", error);

    // Initial selection logic (if no doc is selected and docs exist, ensure editor is not shown)
    if (!selected && docs.length > 0 && showEditor) {
      setShowEditor(false);
    } else if (!selected && docs.length === 0 && showEditor) {
      setShowEditor(false);
    }

  }, [docs, selected, showEditor, loading, error]);


  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Documents are already filtered by project ID by the hook.
    let sortedDocs = [...docs].sort((a, b) => b.updatedAt - a.updatedAt);

    if (!q) {
      console.log("[DocView] filteredDocs (no query):", sortedDocs.map(d => d.title));
      return sortedDocs;
    }
    const result = sortedDocs.filter((d) => d.title.toLowerCase().includes(q));
    console.log("[DocView] filteredDocs (with query ", q, "):", result.map(d => d.title));
    return result;
  }, [docs, query]);

  function handleCreateDoc() {
    console.log("[DocView] handleCreateDoc called.");
    const doc = createProjectDocument("Untitled"); // Project ID is handled by the hook
    console.log("[DocView] New document created:", doc);
    // selectDocument(doc.id); // The hook already auto-selects and sets local state
    // setShowEditor(true); // The useEffect above will handle this based on `selected`
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log("[DocView] handleFileChange called.");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[DocView] No file selected.");
      return;
    }
    if (file.type !== "application/pdf") {
      console.log("[DocView] File is not a PDF.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      console.log("[DocView] FileReader onload.");
      createPdfFromDataUrl(String(reader.result), file.name); // Project ID handled by hook
      console.log("[DocView] New PDF document created.");
      // selectDocument(newDoc.id); // PDFs are not automatically selected for editor view
      setShowEditor(false); // Stay in list view after PDF upload
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function handleSelectDocument(id: string) {
    console.log("[DocView] handleSelectDocument called with id:", id);
    selectDocument(id); // Use the hook's method
    // setShowEditor(true); // useEffect will handle this based on `selected`
  }

  function handleBackToList() {
    console.log("[DocView] handleBackToList called.");
    selectDocument(null); // Deselect document
    // setShowEditor(false); // useEffect will handle this based on `selected`
  }

  // Handle loading and error states
  if (loading && !docs.length) { // Only show full loading spinner if no docs are loaded yet
    return (
      <div className="h-full w-full grid place-items-center">
        <p className="text-slate-500">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full grid place-items-center text-red-500">
        <p>Error: {error}</p>
        <Button onClick={refetchDocumentsList}>Try Again</Button>
      </div>
    );
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
                updateProjectDocument(selected.id, {
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
                onChange={(documentBlocks) => updateProjectDocument(selected.id, { content: documentBlocks })}
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
              {/* You can re-enable the PDF upload button if needed, but it's commented in your original*/}
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
                selectedId={selected?.id || null} // Pass selectedId from the hook
                onSelect={handleSelectDocument}
                onRename={(id, title) => updateProjectDocument(id, { title })}
                onDelete={(id) => {
                  deleteProjectDocument(id);
                  // The hook will handle deselecting if the deleted doc was selected
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
  );
}
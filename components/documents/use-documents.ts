"use client"

import { useEffect, useState } from "react"
import type { Doc, PdfDoc, RichTextDoc } from "./types"

const STORAGE_KEY = "nexdpm:documents"

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

function safeParse(raw: string | null): Doc[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Doc[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function load(): Doc[] {
  if (typeof window === "undefined") return []
  return safeParse(localStorage.getItem(STORAGE_KEY))
}
function save(docs: Doc[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
}

// BlockNote requires a non-empty array of blocks
const DEFAULT_BLOCKNOTE_DOC = JSON.stringify([{ type: "paragraph", content: [] }])

export function useDocuments() {
  const [docs, setDocs] = useState<Doc[]>([])

  useEffect(() => {
    setDocs(load())
  }, [])

  useEffect(() => {
    if (docs.length) save(docs)
    else if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
  }, [docs])

  function createDoc(title = "Untitled"): RichTextDoc {
    const doc: RichTextDoc = {
      id: genId(),
      type: "doc",
      title,
      content: DEFAULT_BLOCKNOTE_DOC,
      updatedAt: Date.now(),
    }
    setDocs((prev) => [doc, ...prev])
    return doc
  }

  function createPdfFromDataUrl(dataUrl: string, fileName?: string): PdfDoc {
    const doc: PdfDoc = {
      id: genId(),
      type: "pdf",
      title: fileName || "PDF Document",
      dataUrl,
      fileName,
      updatedAt: Date.now(),
    }
    setDocs((prev) => [doc, ...prev])
    return doc
  }

  function update(id: string, patch: Partial<Doc>) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)))
  }

  function remove(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  return { docs, createDoc, createPdfFromDataUrl, update, remove }
}

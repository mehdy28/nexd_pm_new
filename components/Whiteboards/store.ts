"use client"

export type Whiteboard = {
  id: string
  title: string
  previewDataUrl?: string
  // Minimal Excalidraw scene snapshot
  scene?: {
    elements: any[]
    appState: Record<string, any>
    files: Record<string, any>
  }
  updatedAt: number
  projectId?: string
}

const STORAGE_KEY = "nexdpm:Whiteboards"

function safeParse(raw: string | null): Whiteboard[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Whiteboard[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadAll(): Whiteboard[] {
  if (typeof window === "undefined") return []
  return safeParse(localStorage.getItem(STORAGE_KEY))
}
function saveAll(list: Whiteboard[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function genId() {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

export const WhiteboardsStore = {
  list(projectId?: string): Whiteboard[] {
    const all = loadAll().sort((a, b) => b.updatedAt - a.updatedAt)
    if (!projectId) return all
    return all.filter((w) => w.projectId === projectId)
  },
  get(id: string): Whiteboard | undefined {
    return loadAll().find((w) => w.id === id)
  },
  create(title = "Untitled Whiteboard", projectId?: string): Whiteboard {
    const wf: Whiteboard = {
      id: genId(),
      title,
      updatedAt: Date.now(),
      projectId,
      scene: {
        elements: [],
        appState: { viewBackgroundColor: "#ffffff" },
        files: {},
      },
      previewDataUrl: undefined,
    }
    const all = loadAll()
    all.unshift(wf)
    saveAll(all)
    return wf
  },
  update(id: string, patch: Partial<Whiteboard>): Whiteboard | undefined {
    const all = loadAll()
    const idx = all.findIndex((w) => w.id === id)
    if (idx < 0) return
    all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
    saveAll(all)
    return all[idx]
  },
  remove(id: string): void {
    const all = loadAll().filter((w) => w.id !== id)
    saveAll(all)
  },
}

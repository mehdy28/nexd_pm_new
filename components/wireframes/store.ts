"use client"

export type Wireframe = {
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

const STORAGE_KEY = "nexdpm:wireframes"

function safeParse(raw: string | null): Wireframe[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Wireframe[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadAll(): Wireframe[] {
  if (typeof window === "undefined") return []
  return safeParse(localStorage.getItem(STORAGE_KEY))
}
function saveAll(list: Wireframe[]) {
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

export const wireframesStore = {
  list(projectId?: string): Wireframe[] {
    const all = loadAll().sort((a, b) => b.updatedAt - a.updatedAt)
    if (!projectId) return all
    return all.filter((w) => w.projectId === projectId)
  },
  get(id: string): Wireframe | undefined {
    return loadAll().find((w) => w.id === id)
  },
  create(title = "Untitled Wireframe", projectId?: string): Wireframe {
    const wf: Wireframe = {
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
  update(id: string, patch: Partial<Wireframe>): Wireframe | undefined {
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

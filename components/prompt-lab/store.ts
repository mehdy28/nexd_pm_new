"use client"

import { useEffect, useState } from "react"

export type Version = {
  id: string
  content: string
  context: string
  notes?: string
  createdAt: number
}

export type Prompt = {
  id: string
  title: string
  model: string
  temperature: number
  context: string
  content: string
  versions: Version[]
  updatedAt: number
}

function id() {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2)
  }
}
function storageKey(projectId?: string) {
  return `nexdpm:promptlab:${projectId ?? "global"}`
}
function load(projectId?: string): Prompt[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(projectId))
    const parsed = raw ? (JSON.parse(raw) as Prompt[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
function save(projectId: string | undefined, prompts: Prompt[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(projectId), JSON.stringify(prompts))
}

export function usePromptLab(projectId?: string) {
  const [prompts, setPrompts] = useState<Prompt[]>([])

  useEffect(() => {
    setPrompts(load(projectId))
  }, [projectId])

  useEffect(() => {
    save(projectId, prompts)
  }, [prompts, projectId])

  function create(title = "Untitled Prompt") {
    const p: Prompt = {
      id: id(),
      title,
      model: "gpt-4o",
      temperature: 0.2,
      context: "",
      content: "",
      versions: [],
      updatedAt: Date.now(),
    }
    setPrompts((prev) => [p, ...prev])
    return p
  }

  function update(idVal: string, patch: Partial<Prompt>) {
    setPrompts((prev) => prev.map((p) => (p.id === idVal ? { ...p, ...patch, updatedAt: Date.now() } : p)))
  }

  function remove(idVal: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== idVal))
  }

  function duplicate(idVal: string) {
    const src = prompts.find((p) => p.id === idVal)
    if (!src) return null
    const dup: Prompt = {
      ...src,
      id: id(),
      title: `${src.title} (Copy)`,
      updatedAt: Date.now(),
    }
    setPrompts((prev) => [dup, ...prev])
    return dup
  }

  function snapshot(idVal: string, notes?: string) {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === idVal
          ? {
              ...p,
              versions: [
                { id: id(), content: p.content, context: p.context, notes, createdAt: Date.now() },
                ...p.versions,
              ],
              updatedAt: Date.now(),
            }
          : p,
      ),
    )
  }

  function restore(idVal: string, versionId: string) {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id !== idVal) return p
        const v = p.versions.find((vv) => vv.id === versionId)
        if (!v) return p
        return { ...p, content: v.content, context: v.context, updatedAt: Date.now() }
      }),
    )
  }

  return { prompts, create, update, remove, duplicate, snapshot, restore }
}

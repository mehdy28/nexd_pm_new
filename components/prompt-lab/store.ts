"use client"

import { useEffect, useState } from "react"

export type PromptVariable = {
  id: string
  name: string
  placeholder: string // e.g., "{{topic}}"
  defaultValue?: string
  description?: string
}

export type Version = {
  id: string
  content: string
  context: string
  notes?: string
  createdAt: number
  variables: PromptVariable[] // Added variables to Version
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
  tags: string[]
  variables: PromptVariable[] // Added variables to Prompt
}

function id() {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

const MOCK_PROMPTS: Prompt[] = [
  {
    id: "mock-prompt-1",
    title: "Blog Post Idea Generator",
    model: "gpt-4o",
    temperature: 0.7,
    context: "You are a creative content strategist. Generate blog post ideas based on the given topic.",
    content: "Generate 5 blog post ideas about {{topic}}.",
    versions: [
      { id: id(), content: "Initial blog idea prompt", context: "Act as a blog idea generator.", notes: "Initial version", createdAt: Date.now() - 100000, variables: [] }
    ],
    updatedAt: Date.now(),
    tags: ["marketing", "AI", "blogging"],
    variables: [ // Added variables for mock-prompt-1
      { id: id(), name: "Topic", placeholder: "{{topic}}", defaultValue: "AI in project management", description: "The subject for the blog post ideas" }
    ],
  },
  {
    id: "mock-prompt-2",
    title: "Social Media Caption Writer",
    model: "gpt-3.5-turbo",
    temperature: 0.5,
    context: "You are a witty social media manager. Write engaging captions for Instagram.",
    content: "Write an Instagram caption for a picture of {{product}} with hashtags.",
    versions: [
      { id: id(), content: "Write an Instagram caption for {{product}}.", context: "You are a witty social media manager.", notes: "Initial version", createdAt: Date.now() - 3600000, variables: []  },
      { id: id(), content: "Write an Instagram caption for {{product}} with hashtags.", context: "You are a witty social media manager.", notes: "Added hashtags", createdAt: Date.now() - 1800000, variables: []  },
    ],
    updatedAt: Date.now(),
    tags: ["social media", "marketing"],
    variables: [
      { id: id(), name: "Product", placeholder: "{{product}}", defaultValue: "new AI tool", description: "The product to feature in the caption" }
    ],
  },
  {
    id: "mock-prompt-3",
    title: "Email Subject Line Optimizer",
    model: "claude-3-opus-20240229",
    temperature: 0.3,
    context: "You are an email marketing expert. Optimize subject lines for higher open rates.",
    content: "Rewrite the following email subject line to be more engaging: '{{subject_line}}'.",
    versions: [
      { id: id(), content: "Optimize email subject line: {{subject_line}}", context: "You are an email marketing expert.", notes: "First draft", createdAt: Date.now() - 7200000, variables: []  }
    ],
    updatedAt: Date.now(),
    tags: ["sales", "email"],
    variables: [
      { id: id(), name: "Subject Line", placeholder: "{{subject_line}}", defaultValue: "Important Update", description: "The original email subject line" }
    ],
  },
];

function storageKey(projectId?: string) {
  return `nexdpm:promptlab:${projectId ?? "global"}`
}

function load(projectId?: string): Prompt[] {
  return MOCK_PROMPTS; // Always return mock data to rule out local storage issues
}

function save(projectId: string | undefined, prompts: Prompt[]) {
  // For now, we won't save to localStorage to ensure mock data is always loaded
  if (typeof window === "undefined") return
  // localStorage.setItem(storageKey(projectId), JSON.stringify(prompts))
}

export function usePromptLab(projectId?: string) {
  const [prompts, setPrompts] = useState<Prompt[]>([])

  useEffect(() => {
    // Ensure we are loading mock data consistently
    setPrompts(load(projectId))
  }, [projectId])

  useEffect(() => {
    // We are not saving to local storage at the moment to ensure mock data loads
    // save(projectId, prompts)
  }, [prompts, projectId])

  function create(title = "Untitled Prompt") {
    const p: Prompt = {
      id: id(),
      title,
      model: "gpt-4o",
      temperature: 0.2,
      context: "",
      content: "",
      versions: [{ id: id(), content: "Initial content", context: "", notes: "Created", createdAt: Date.now(), variables: [] }], // Add an initial version with empty variables
      updatedAt: Date.now(),
      tags: [],
      variables: [], // Initialize with an empty array of variables
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
      // Deep copy variables and versions to ensure new arrays
      variables: src.variables.map(v => ({...v})),
      versions: src.versions.map(v => ({...v, id: id()})), // Also duplicate version IDs
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
                { id: id(), content: p.content, context: p.context, notes, createdAt: Date.now(), variables: p.variables.map(v => ({...v})) }, // Snapshot current variables as well
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
        return { ...p, content: v.content, context: v.context, variables: v.variables.map(val => ({...val})), updatedAt: Date.now() } // Restore variables as well
      }),
    )
  }

  return { prompts, create, update, remove, duplicate, snapshot, restore }
}
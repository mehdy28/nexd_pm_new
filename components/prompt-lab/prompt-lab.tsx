"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFirebaseAuth } from "@/lib/hooks/useFirebaseAuth"
import { usePrompts, useCreatePrompt, useUpdatePrompt, useDeletePrompt } from "@/lib/hooks/usePrompt"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, Save, RotateCcw, Trash2, Plus, CopyIcon as Duplicate, Search, GitCommit } from "lucide-react"

type Version = {
  id: string
  content: string
  context: string
  notes?: string
  createdAt: number
}

type Prompt = {
  id: string
  title: string
  model: string
  temperature: number
  context: string
  content: string
  versions: Version[]
  updatedAt: number
}

export function PromptLab({ projectId }: { projectId?: string }) {
  const { user } = useFirebaseAuth()
  const { prompts: dbPrompts, loading, refetch } = usePrompts(projectId, user?.uid, !projectId)
  const { createPrompt } = useCreatePrompt()
  const { updatePrompt } = useUpdatePrompt()
  const { deletePrompt } = useDeletePrompt()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compare, setCompare] = useState<{ open: boolean; version?: Version }>(() => ({ open: false }))
  const [rightTab, setRightTab] = useState<"editor" | "versions" | "preview">("editor")
  const searchRef = useRef<HTMLInputElement | null>(null)

  // Convert database prompts to local format
  const prompts: Prompt[] = useMemo(() => {
    return dbPrompts.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      model: "gpt-4o", // Default model
      temperature: 0.2, // Default temperature
      context: prompt.description || "",
      content: prompt.content,
      versions: [], // Versions not implemented yet
      updatedAt: new Date(prompt.updatedAt).getTime(),
    }))
  }, [dbPrompts])

  useEffect(() => {
    if (prompts.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !prompts.some((p) => p.id === selectedId)) {
      setSelectedId(prompts[0].id)
    }
  }, [prompts, selectedId])

  const selected = useMemo(() => prompts.find((p) => p.id === selectedId) || null, [prompts, selectedId])

  // Left list filtering
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const arr = [...prompts].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return arr
    return arr.filter((p) => p.title.toLowerCase().includes(q))
  }, [prompts, query])

  async function createNew() {
    try {
      const result = await createPrompt({
        variables: {
          input: {
            title: "Untitled Prompt",
            content: "",
            description: "",
            category: "general",
            tags: [],
            isPublic: false,
            projectId,
            userId: projectId ? null : user?.uid,
          }
        }
      })
      if (result.data?.createPrompt) {
        setSelectedId(result.data.createPrompt.id)
        refetch()
      }
    } catch (error) {
      console.error("Error creating prompt:", error)
    }
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  async function updatePromptLocal(id: string, patch: Partial<Prompt>) {
    try {
      await updatePrompt({
        variables: {
          id,
          input: {
            title: patch.title,
            content: patch.content,
            description: patch.context,
          }
        }
      })
      refetch()
    } catch (error) {
      console.error("Error updating prompt:", error)
    }
  }

  async function removePrompt(id: string) {
    try {
      await deletePrompt({
        variables: { id }
      })
      if (selectedId === id) setSelectedId(null)
      refetch()
    } catch (error) {
      console.error("Error deleting prompt:", error)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const combined = useMemo(() => {
    if (!selected) return ""
    const lines = [
      "System role:",
      "You are an expert assistant for this project.",
      "",
      "Context:",
      selected.context || "(none)",
      "",
      "Prompt:",
      selected.content || "(empty)",
    ]
    return lines.join("\n")
  }, [selected])

  if (loading) {
    return <div className="p-6">Loading prompts...</div>
  }

  return (
    <div className="page-scroller p-4">
      <div className="saas-card h-full overflow-hidden">
        {/* Two sections: left list + right tabbed panel */}
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 md:grid-cols-[320px_1fr]">
          {/* Left list with its own scrollbar */}
          <div className="saas-card h-full min-h-0 overflow-hidden flex flex-col">
            <div
              className="flex items-center gap-2 border-b p-3"
              style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}
            >
              <Search className="h-4 w-4 text-slate-500" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search prompts..."
                className="h-9"
              />
              <Button className="ml-auto h-9 btn-primary" onClick={createNew}>
                <Plus className="mr-1 h-4 w-4" /> New
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="text-sm text-slate-500">No prompts yet. Create one to get started.</div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((p) => (
                    <li key={p.id} className="rounded-lg border p-3 hover:bg-slate-50 transition">
                      <div className="flex items-start gap-2">
                        <button className="flex-1 text-left" onClick={() => setSelectedId(p.id)} title={p.title}>
                          <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Updated {new Date(p.updatedAt).toLocaleString()}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            title="Duplicate"
                            onClick={() => {
                              // Create a copy
                              createPrompt({
                                variables: {
                                  input: {
                                    title: `${p.title} (Copy)`,
                                    content: p.content,
                                    description: p.context,
                                    category: "general",
                                    tags: [],
                                    isPublic: false,
                                    projectId,
                                    userId: projectId ? null : user?.uid,
                                  }
                                }
                              }).then(() => refetch())
                            }}
                          >
                            <Duplicate className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            title="Delete"
                            onClick={() => {
                              removePrompt(p.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Tabbed panel (Editor | Versions | Preview) */}
          <div className="saas-card min-h-0 overflow-hidden">
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex h-full flex-col">
              <div className="border-b" style={{ borderColor: "var(--border)" }}>
                <TabsList className="h-11 bg-transparent">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="versions">Versions</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <TabsContent value="editor" className="m-0 outline-none">
                  {selected ? (
                    <EditorPanel
                      prompt={selected}
                      onUpdate={(patch) => updatePromptLocal(selected.id, patch)}
                      onSnapshot={(notes) => {
                        // Snapshot functionality not implemented yet
                        console.log("Snapshot:", notes)
                      }}
                    />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
                      Select a prompt or create a new one.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="versions" className="m-0 outline-none p-4">
                  <VersionsPanel
                    versions={selected?.versions || []}
                    onRestore={(verId) => {
                      // Restore functionality not implemented yet
                      console.log("Restore version:", verId)
                    }}
                    onCompare={(v) => setCompare({ open: true, version: v })}
                    onSnapshot={(notes) => {
                      // Snapshot functionality not implemented yet
                      console.log("Snapshot:", notes)
                    }}
                  />
                </TabsContent>

                <TabsContent value="preview" className="m-0 outline-none p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium">Preview</div>
                    <Button size="sm" onClick={() => copy(combined)} className="h-8 btn-primary">
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <Textarea readOnly value={combined} className="min-h-[300px] font-mono" />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Compare dialog */}
      <DiffDialog
        open={compare.open}
        onOpenChange={(o) => setCompare((prev) => ({ ...prev, open: o }))}
        version={compare.version}
        current={selected?.content || ""}
      />
    </div>
  )
}

/* Editor (center) */
function EditorPanel({
  prompt,
  onUpdate,
  onSnapshot,
}: {
  prompt: Prompt
  onUpdate: (patch: Partial<Prompt>) => void
  onSnapshot: (notes?: string) => void
}) {
  const [note, setNote] = useState("")

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="saas-section-header rounded-t-lg">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={prompt.title}
            onChange={(e) => onUpdate({ title: e.target.value || "Untitled Prompt" })}
            className="h-10 text-sm font-medium"
            placeholder="Prompt title"
          />
          <div className="grid grid-cols-1 gap-2">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={prompt.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              title="Target model"
            >
              <option value="gpt-4o">OpenAI GPT-4o</option>
              <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
              <option value="grok-3">xAI Grok-3</option>
              <option value="llama3.1-70b">Llama 3.1 70B</option>
              <option value="mixtral-8x7b">Mixtral 8x7B</option>
            </select>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <section className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Project context</div>
          <Textarea
            value={prompt.context}
            onChange={(e) => onUpdate({ context: e.target.value })}
            rows={6}
            placeholder={"Add domain, audience, constraints, style guides, and examples. Use {{variables}} if needed."}
          />
        </section>

        <section className="mt-4 rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Prompt content</div>
          <Textarea
            value={prompt.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="min-h-[260px] font-mono"
            placeholder={"Write instructions. You can reference {{variables}} provided by your app."}
          />
        </section>

        <section className="mt-4 rounded-lg border p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-emerald-700" />
              <div className="text-sm font-medium">Versions</div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Version notes (optional)"
                className="h-9 w-44"
              />
              <Button className="h-9 btn-primary" onClick={() => onSnapshot(note || "Snapshot")}>
                <Save className="mr-1 h-4 w-4" />
                Save snapshot
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Snapshots capture both Context and Content so you can safely iterate.
          </p>
        </section>
      </div>
    </div>
  )
}

/* Versions */
function VersionsPanel({
  versions,
  onRestore,
  onCompare,
  onSnapshot,
}: {
  versions: Version[]
  onRestore: (versionId: string) => void
  onCompare: (v: Version) => void
  onSnapshot: (notes?: string) => void
}) {
  if (versions.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        No versions yet. Take a snapshot from the editor.
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Versions</div>
        <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => onSnapshot("Quick snapshot")}>
          <Save className="mr-1 h-4 w-4" />
          Snapshot
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="space-y-2">
          {versions.map((v) => (
            <li key={v.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                  {new Date(v.createdAt).toLocaleString()} {v.notes ? `• ${v.notes}` : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => onRestore(v.id)}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Restore
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => onCompare(v)}>
                    Compare
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* Minimal diff dialog (side-by-side) */
function DiffDialog({
  open,
  onOpenChange,
  version,
  current,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  version?: Version
  current: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Compare to current</DialogTitle>
        </DialogHeader>
        {version ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium">Version</div>
              <pre className="rounded-md border bg-slate-50 p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
                {version.content}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium">Current</div>
              <pre className="rounded-md border bg-slate-50 p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
                {current}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No version selected</div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

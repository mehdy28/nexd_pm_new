'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { usePromptLab, type Prompt, type Version } from "./store"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, Save, RotateCcw, Trash2, Plus, CopyIcon as Duplicate, Search, GitCommit } from "lucide-react"

export function PromptLab({ promptId, onBack }: { promptId: string; onBack: () => void }) {
  const { prompts, create, update, remove, duplicate, snapshot, restore } = usePromptLab()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [compare, setCompare] = useState<{ open: boolean; version?: Version }>(() => ({ open: false }))
  const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")

  const selectedPrompt = useMemo(() => prompts.find((p) => p.id === promptId) || null, [prompts, promptId])

  useEffect(() => {
    if (!selectedPrompt) return;
    if (selectedPrompt.versions.length === 0) {
        setSelectedVersionId(null);
        return;
    }
    if (!selectedVersionId || !selectedPrompt.versions.some((v) => v.id === selectedVersionId)) {
        setSelectedVersionId(selectedPrompt.versions[0].id);
    }
    }, [selectedPrompt, selectedVersionId]);

  const selectedVersion = useMemo(() => selectedPrompt?.versions.find((v) => v.id === selectedVersionId) || null, [selectedPrompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const combined = useMemo(() => {
    if (!selectedPrompt) return ""
    const lines = [
      "System role:",
      "You are an expert assistant for this project.",
      "",
      "Context:",
      selectedPrompt.context || "(none)",
      "",
      "Prompt:",
      selectedPrompt.content || "(empty)",
    ]
    return lines.join("\n")
  }, [selectedPrompt])

  if (!selectedPrompt) {
    return (
        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
            The selected prompt could not be found.
            <Button onClick={onBack} className="mt-4">Back to Prompt Library</Button>
        </div>
    )
  }

  return (
    <div className="page-scroller p-4">
        <Button onClick={onBack} className="mb-4">Back to Prompt Library</Button>
      <div className="saas-card h-full overflow-hidden">
        {/* Two sections: left list + right tabbed panel */}
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 md:grid-cols-[320px_1fr]">
          {/* Left list with its own scrollbar */}
          <div className="saas-card h-full min-h-0 overflow-hidden flex flex-col">
            <div
              className="flex items-center gap-2 border-b p-3"
              style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}
            >
              <h3 className="font-semibold">Versions</h3>
              <Button className="ml-auto h-9 btn-primary" onClick={() => snapshot(selectedPrompt.id, 'New version')}>
                <Plus className="mr-1 h-4 w-4" /> New
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selectedPrompt.versions.length === 0 ? (
                <div className="text-sm text-slate-500">No versions yet. Create one to get started.</div>
              ) : (
                <ul className="space-y-2">
                  {selectedPrompt.versions.map((v) => (
                    <li key={v.id} className="rounded-lg border p-3 hover:bg-slate-50 transition">
                      <div className="flex items-start gap-2">
                        <button className="flex-1 text-left" onClick={() => setSelectedVersionId(v.id)} title={v.notes}>
                          <div className={`line-clamp-1 text-sm font-medium ${selectedVersionId === v.id ? 'font-bold' : ''}`}>{v.notes}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {new Date(v.createdAt).toLocaleString()}
                          </div>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Tabbed panel (Editor | Version Details | Preview) */}
          <div className="saas-card min-h-0 overflow-hidden">
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex h-full flex-col">
              <div className="border-b" style={{ borderColor: "var(--border)" }}>
                <TabsList className="h-11 bg-transparent">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="version-details">Version Details</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <TabsContent value="editor" className="m-0 outline-none">
                  <EditorPanel
                      prompt={selectedPrompt}
                      onUpdate={(patch) => update(selectedPrompt.id, patch)}
                      onSnapshot={(notes) => snapshot(selectedPrompt.id, notes)}
                    />
                </TabsContent>

                <TabsContent value="version-details" className="m-0 outline-none p-4">
                  <VersionsPanel
                    versions={selectedPrompt.versions || []}
                    onRestore={(verId) => restore(selectedPrompt.id, verId)}
                    onCompare={(v) => setCompare({ open: true, version: v })}
                    onSnapshot={(notes) => snapshot(selectedPrompt.id, notes)}
                    selectedVersionId={selectedVersionId}
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
        current={selectedPrompt?.content || ""}
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
  selectedVersionId
}: {
  versions: Version[]
  onRestore: (versionId: string) => void
  onCompare: (v: Version) => void
  onSnapshot: (notes?: string) => void,
  selectedVersionId: string | null
}) {
    const selectedVersion = versions.find(v => v.id === selectedVersionId);
  if (!selectedVersion) {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        No version selected. Select a version from the list on the left.
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col p-4">
        <h3 className="font-semibold text-lg mb-4">{selectedVersion.notes}</h3>
        <p className="text-sm text-gray-500 mb-4">{new Date(selectedVersion.createdAt).toLocaleString()}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
                <div className="mb-1 text-xs font-medium">Content</div>
                <pre className="rounded-md border bg-slate-50 p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
                    {selectedVersion.content}
                </pre>
            </div>
            <div>
                <div className="mb-1 text-xs font-medium">Context</div>
                <pre className="rounded-md border bg-slate-50 p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
                    {selectedVersion.context}
                </pre>
            </div>
        </div>
      <div className="flex items-center gap-2 mt-4">
          <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => onRestore(selectedVersion.id)}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Restore
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => onCompare(selectedVersion)}>
              Compare to Current
          </Button>
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

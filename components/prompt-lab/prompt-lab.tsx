'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { usePromptLab, type Prompt, type Version, type PromptVariable } from "./store"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, Save, RotateCcw, Trash2, Plus, CopyIcon as Duplicate, Search, GitCommit } from "lucide-react"
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"

const ItemTypes = { VARIABLE: 'variable' }

function renderPrompt(content: string, context: string, variables: PromptVariable[], variableValues: Record<string, string>): string {
  let renderedContent = content;
  let renderedContext = context;

  variables.forEach(variable => {
    const value = variableValues[variable.placeholder] || variable.defaultValue || '';
    const regex = new RegExp(variable.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    renderedContent = renderedContent.replace(regex, value);
    renderedContext = renderedContext.replace(regex, value);
  });

  const lines = [
    "System role:",
    "You are an expert assistant for this project.",
    "",
    "Context:",
    renderedContext || "(none)",
    "",
    "Prompt:",
    renderedContent || "(empty)",
  ];
  return lines.join("\n");
}

export function PromptLab({ promptId, onBack, projectId }: { promptId: string; onBack: () => void; projectId?: string }) {
  const { prompts, create, update, remove, duplicate, snapshot, restore } = usePromptLab(projectId)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [compare, setCompare] = useState<{ open: boolean; version?: Version }>({ open: false })
  const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("versions")
  const [showCreateVariableDialog, setShowCreateVariableDialog] = useState(false)
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})

  const selectedPrompt = useMemo(() => prompts.find((p) => p.id === promptId) || null, [prompts, promptId])

  useEffect(() => {
    if (selectedPrompt) {
      if (selectedPrompt.versions.length > 0) {
        if (!selectedVersionId || !selectedPrompt.versions.some((v) => v.id === selectedVersionId)) {
          setSelectedVersionId(selectedPrompt.versions[0].id)
        }
      } else if (selectedVersionId) {
        setSelectedVersionId(null)
      }
      const initialPreviewValues: Record<string, string> = {};
      selectedPrompt.variables.forEach(v => {
        initialPreviewValues[v.placeholder] = v.defaultValue || '';
      });
      setPreviewVariableValues(initialPreviewValues);
    }
  }, [selectedPrompt, selectedVersionId])

  const selectedVersion = useMemo(() => selectedPrompt?.versions.find((v) => v.id === selectedVersionId) || null, [selectedPrompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const renderedPreview = useMemo(() => {
    if (!selectedPrompt) return "";
    return renderPrompt(selectedPrompt.content, selectedPrompt.context, selectedPrompt.variables, previewVariableValues);
  }, [selectedPrompt, previewVariableValues]);

  const handleCreateVariable = (newVariable: Omit<PromptVariable, 'id'>) => {
    if (!selectedPrompt) return

    const variableWithId: PromptVariable = {
      ...newVariable,
      id: Math.random().toString(36).slice(2),
    }

    update(selectedPrompt.id, {
      variables: [...selectedPrompt.variables, variableWithId],
    })
    setShowCreateVariableDialog(false)
  }

  if (!selectedPrompt) {
    return (
        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
            The selected prompt could not be found.
            <Button onClick={onBack} className="mt-4">Back to Prompt Library</Button>
        </div>
    )
  }

  return (

    <DndProvider backend={HTML5Backend}>
      <div
       // style={{ background: "red" }}
      className="page-scroller pt-0 p-1 pb-0 h-full min-h-0">
          {/* <Button onClick={onBack} className="mb-1">Back to Prompt Library</Button> */}
        <div 
                //style={{ background: "green" }}
        className="h-[85vh] overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 pb-0 md:grid-cols-[320px_1fr]">
           {/* Left side with independent scrollbars per tab */}
            <div className="saas-card h-full min-h-0 flex flex-col">
              <Tab.Group
                selectedIndex={leftTab === "versions" ? 0 : 1}
                onChange={(index) => setLeftTab(index === 0 ? "versions" : "variables")}
                className="flex-1 min-h-0 flex flex-col"
              >
                {/* Tab headers */}
                <div className="border-b" style={{ borderColor: "var(--border)" }}>
                <Button onClick={onBack} className="mb-0">Back to Prompt Library</Button>
                  <Tab.List className="flex h-11 bg-transparent">
                    <Tab className="px-3 py-2 ui-selected:border-b-2 ui-selected:font-semibold">Versions</Tab>
                    <Tab className="px-3 py-2 ui-selected:border-b-2 ui-selected:font-semibold">Variables</Tab>
                  </Tab.List>
                </div>

                {/* Tab panels */}
                <Tab.Panels className="flex-1 min-h-0 flex flex-col">
                  {/* Versions tab */}
                  <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                    <div className="flex items-center gap-2 border-b p-3"
                     style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}
                     >
                      <h3 className="font-semibold">Versions</h3>
                      <Button className="ml-auto h-9 btn-primary" onClick={() => snapshot(selectedPrompt.id, 'New version')}>
                        <Plus className="mr-1 h-4 w-4" /> New
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      {selectedPrompt.versions.length === 0 ? (
                        <div className="text-sm text-slate-500">No versions yet. Create one to get started.</div>
                      ) : (
                        <ul className="space-y-2">
                          {selectedPrompt.versions.map((v) => (
                            <li key={v.id} className="rounded-lg border p-3 hover:bg-slate-50 transition">
                              <div className="flex items-start gap-2">
                                <button className="flex-1 text-left" onClick={() => setSelectedVersionId(v.id)} title={v.notes}>
                                  <div className={`line-clamp-1 text-sm font-medium ${selectedVersionId === v.id ? 'font-bold' : ''}`}>{v.notes}</div>
                                  <div className="mt-1 text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Tab.Panel>

                  {/* Variables tab */}
                  <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                    <div className="flex items-center gap-2 border-b p-3" style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}>
                      <h3 className="font-semibold">Variables</h3>
                      <Button className="ml-auto h-9 btn-primary" onClick={() => setShowCreateVariableDialog(true)}>
                        <Plus className="mr-1 h-4 w-4" /> New
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      {selectedPrompt.variables.length === 0 ? (
                        <div className="text-sm text-slate-500">No variables yet. Create one to get started.</div>
                      ) : (
                        <ul className="space-y-2">
                          {selectedPrompt.variables.map((v) => (
                            <VariableItem key={v.id} variable={v} />
                          ))}
                        </ul>
                      )}
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>



            {/* Right side with vertical scrollbar */}
            <div className="saas-card h-full min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex h-full flex-col">
                  <div className="border-b" style={{ borderColor: "var(--border)" }}>
                    <TabsList className="h-11 bg-transparent">
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                      <TabsTrigger value="version-details">Version Details</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <TabsContent value="editor" className="m-0 outline-none flex-1 overflow-y-auto">
                      <EditorPanel
                          prompt={selectedPrompt}
                          onUpdate={(patch) => update(selectedPrompt.id, patch)}
                          onSnapshot={(notes) => snapshot(selectedPrompt.id, notes)}
                        />
                    </TabsContent>

                    <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <VersionsPanel
                        versions={selectedPrompt.versions || []}
                        onRestore={(verId) => restore(selectedPrompt.id, verId)}
                        onCompare={(v) => setCompare({ open: true, version: v })}
                        onSnapshot={(notes) => snapshot(selectedPrompt.id, notes)}
                        selectedVersionId={selectedVersionId}
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">Preview</div>
                        <Button size="sm" onClick={() => copy(renderedPreview)} className="h-8 btn-primary">
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </Button>
                      </div>
                      <div className="space-y-4 mb-4">
                        {selectedPrompt.variables.map(v => (
                          <div key={v.id}>
                            <label htmlFor={`preview-${v.id}`} className="text-sm font-medium">{v.name} ({v.placeholder})</label>
                            <Input
                              id={`preview-${v.id}`}
                              value={previewVariableValues[v.placeholder] || ''}
                              onChange={(e) => setPreviewVariableValues(prev => ({
                                ...prev,
                                [v.placeholder]: e.target.value,
                              }))}
                              placeholder={v.defaultValue || `Enter value for ${v.name}`}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                      <Textarea readOnly value={renderedPreview} className="min-h-[300px] font-mono overflow-y-auto" />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        <DiffDialog
          open={compare.open}
          onOpenChange={(o) => setCompare((prev) => ({ ...prev, open: o }))}
          version={compare.version}
          current={selectedPrompt?.content || ""}
        />

        <VariableCreationDialog
          open={showCreateVariableDialog}
          onOpenChange={setShowCreateVariableDialog}
          onCreate={handleCreateVariable}
        />
      </div>
    </DndProvider> 
  )
}






// New Draggable Variable Component
function VariableItem({ variable }: { variable: PromptVariable }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VARIABLE,
    item: { placeholder: variable.placeholder },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  return (
    <li
      ref={drag}
      className={`rounded-lg border p-3 bg-white shadow-sm cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{variable.name}</div>
          <div className="text-xs text-slate-500">{variable.placeholder}</div>
        </div>
      </div>
    </li>
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

  const contextTextareaRef = useRef<HTMLTextAreaElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [, dropContext] = useDrop(() => ({
    accept: ItemTypes.VARIABLE,
    drop: (item: { placeholder: string }) => {
      if (contextTextareaRef.current) {
        const start = contextTextareaRef.current.selectionStart;
        const end = contextTextareaRef.current.selectionEnd;
        const newContext = prompt.context.substring(0, start) + item.placeholder + prompt.context.substring(end);
        onUpdate({ context: newContext });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [prompt.context, onUpdate]);

  const [, dropContent] = useDrop(() => ({
    accept: ItemTypes.VARIABLE,
    drop: (item: { placeholder: string }) => {
      if (contentTextareaRef.current) {
        const start = contentTextareaRef.current.selectionStart;
        const end = contentTextareaRef.current.selectionEnd;
        const newContent = prompt.content.substring(0, start) + item.placeholder + prompt.content.substring(end);
        onUpdate({ content: newContent });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [prompt.content, onUpdate]);

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
            ref={contextTextareaRef} // Attach ref to Textarea
            value={prompt.context}
            onChange={(e) => onUpdate({ context: e.target.value })}
            rows={6}
            className="overflow-y-auto" // Add scrollbar to this Textarea
            placeholder="Add domain, audience, constraints, style guides, and examples. Use {{variables}} if needed."
          />
        </section>

        <section className="mt-4 rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Prompt content</div>
          <Textarea
            ref={contentTextareaRef} // Attach ref to Textarea
            value={prompt.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="min-h-[260px] font-mono overflow-y-auto" // Add scrollbar to this Textarea
            placeholder="Write instructions. You can reference {{variables}} provided by your app."
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

/* Variable Creation Dialog */
function VariableCreationDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (variable: Omit<PromptVariable, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (name && placeholder) {
      onCreate({ name, placeholder, defaultValue, description })
      setName('')
      setPlaceholder('')
      setDefaultValue('')
      setDescription('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Variable</DialogTitle>
          <DialogDescription>
            Define a new variable to use in your prompt content and context.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right">Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Topic"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="placeholder" className="text-right">Placeholder</label>
            <Input
              id="placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              className="col-span-3"
              placeholder="e.g., {{topic}}"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="defaultValue" className="text-right">Default Value</label>
            <Input
              id="defaultValue"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="col-span-3"
              placeholder="Optional: A default value for preview"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="description" className="text-right">Description</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Optional: Explain what this variable represents"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Variable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
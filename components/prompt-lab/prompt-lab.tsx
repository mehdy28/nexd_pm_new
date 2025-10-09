'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { usePromptLab, type Prompt, type Version, type PromptVariable, PromptVariableType, type PromptVariableSource } from "./store" // Added PromptVariableType, PromptVariableSource
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, RotateCcw, Plus, GitCommit } from "lucide-react"
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Added for variable type selection
import { Badge } from "@/components/ui/badge" // NEW: Added Badge import
import { VariableDiscoveryBuilder } from "./variable-discovery-builder"


const ItemTypes = { VARIABLE: 'variable', BLOCK: 'block' }

// Helper to merge multiple refs
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node: T) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else if ('current' in ref) (ref as any).current = node;
    });
  };
}

/* Utility to render prompt by substituting placeholder text */
// NOTE: This function will need to be made async and call the backend to resolve project data variables
async function renderPrompt(
  content: string,
  context: string,
  variables: PromptVariable[],
  variableValues: Record<string, string>,
  projectId?: string
): Promise<string> {
  let renderedContent = content;
  let renderedContext = context;

  // Manual variables are handled by `variableValues`
  // Project data variables will need to be resolved via backend call
  for (const variable of variables) {
    let valueToSubstitute = variableValues[variable.placeholder] || variable.defaultValue || '';

    if (variable.source && projectId) {
      // TODO: This part requires an actual GraphQL query to your backend
      // Example:
      // const resolvedValue = await graphqlClient.query({
      //   query: RESOLVE_PROMPT_VARIABLE_QUERY,
      //   variables: { projectId, variableSource: variable.source, promptVariableId: variable.id }
      // });
      // valueToSubstitute = resolvedValue || valueToSubstitute;
      // For now, it will just use defaultValue or an empty string for project data variables until backend is implemented
      console.warn(`[renderPrompt] Project data variable '${variable.name}' ({{${variable.placeholder}}}) needs backend resolution. Using default value.`);
    }

    const regex = new RegExp(variable.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    renderedContent = renderedContent.replace(regex, valueToSubstitute);
    renderedContext = renderedContext.replace(regex, valueToSubstitute);
  }

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

/* ---------- MAIN COMPONENT ---------- */
export function PromptLab({ promptId, onBack, projectId }: { promptId: string; onBack: () => void; projectId?: string }) {
  const { prompts, create, update, remove, duplicate, snapshot, restore } = usePromptLab(projectId)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [compare, setCompare] = useState<{ open: boolean; version?: Version }>({ open: false })
  const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("versions")
  // Replaced two variable dialog states with one for the new builder
  const [showVariableBuilder, setShowVariableBuilder] = useState(false);
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})
  const [renderedPreview, setRenderedPreview] = useState(""); // Make stateful to handle async

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
        // Only initialize default values for manual variables in the preview input fields
        if (!v.source) { // If it's a manual variable
          initialPreviewValues[v.placeholder] = v.defaultValue || '';
        }
      });
      setPreviewVariableValues(initialPreviewValues);
    }
  }, [selectedPrompt, selectedVersionId])

  // Effect to update rendered preview when prompt, variables, or manual values change
  useEffect(() => {
    if (selectedPrompt) {
      const generatePreview = async () => {
        const preview = await renderPrompt(selectedPrompt.content, selectedPrompt.context || '', selectedPrompt.variables, previewVariableValues, projectId);
        setRenderedPreview(preview);
      };
      generatePreview();
    }
  }, [selectedPrompt, previewVariableValues, projectId]);


  const selectedVersion = useMemo(() => selectedPrompt?.versions.find((v) => v.id === selectedVersionId) || null, [selectedPrompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  // Handle new variable creation from the builder
  const handleCreateVariable = (newVariable: Omit<PromptVariable, 'id'>) => {
    if (!selectedPrompt) return

    const variableWithId: PromptVariable = {
      ...newVariable,
      id: Math.random().toString(36).slice(2),
    }
    console.log('[Prompt Lab] handleCreateVariable: Adding new variable:', variableWithId);
    update(selectedPrompt.id, {
      variables: [...selectedPrompt.variables, variableWithId],
    })
    setShowVariableBuilder(false) // Close the builder
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
      <div className="page-scroller pt-0 p-1 pb-0 h-full min-h-0">
        <div className="h-[85vh] overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 pb-0 md:grid-cols-[320px_1fr]">

            {/* Left side */}
            <div className="saas-card h-full min-h-0 flex flex-col">
              <Tab.Group
                selectedIndex={leftTab === "versions" ? 0 : 1}
                onChange={(index) => setLeftTab(index === 0 ? "versions" : "variables")}
                className="flex-1 min-h-0 flex flex-col"
              >
                <div className="border-b" style={{ borderColor: "var(--border)" }}>
                  <Button onClick={onBack} className="mb-0">Back to Prompt Library</Button>
                  <Tab.List className="flex h-11 bg-transparent">
                    <Tab className="px-3 py-2 ui-selected:border-b-2 ui-selected:font-semibold">Versions</Tab>
                    <Tab className="px-3 py-2 ui-selected:border-b-2 ui-selected:font-semibold">Variables</Tab>
                  </Tab.List>
                </div>

                <Tab.Panels className="flex-1 min-h-0 flex flex-col overflow-y-auto">
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
                    <div className="flex flex-col gap-2 border-b p-3" style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}>
                      <h3 className="font-semibold">Variables</h3>
                      <Button className="w-full h-9 btn-primary" onClick={() => setShowVariableBuilder(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Create New Variable
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      {selectedPrompt.variables.length === 0 ? (
                        <div className="text-sm text-slate-500">No variables yet. Click "Create New Variable" to get started.</div>
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

            {/* Right side */}
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
                          // Only show input field for manual variables, others are resolved
                          !v.source && (
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
                          )
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

        {/* NEW: Variable Discovery Builder */}
        <VariableDiscoveryBuilder
          open={showVariableBuilder}
          onOpenChange={setShowVariableBuilder}
          onCreate={handleCreateVariable}
          projectId={projectId}
        />
      </div>
    </DndProvider>
  )
}

/* ---------- Variable Item (Sidebar) ---------- */

function VariableItem({ variable }: { variable: PromptVariable }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VARIABLE,
    item: variable, // entire variable object
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [variable])

  return (
    <div
      ref={drag}
      className={`cursor-move rounded px-2 py-1 mb-2 border ${
        isDragging ? 'opacity-50' : 'bg-gray-100'
      }`}
    >
      <span className="font-semibold">{variable.name}</span>
      <span className="text-xs text-gray-500 ml-2">({variable.placeholder})</span>
      {variable.source && <Badge variant="secondary" className="ml-2">Project Data</Badge>}
    </div>
  )
}


/* ---------- BLOCK-BASED EDITOR ---------- */

/* Block type: each block is either text or a variable block */
type Block =
  | { type: 'text'; id: string; value: string }
  | { type: 'variable'; id: string; varId?: string; placeholder: string; name?: string }

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2)
}

/* Parse prompt.content into blocks using known variables as separators.
   This will create alternating text & variable blocks, ensuring each variable becomes its own block. */
function parseContentToBlocks(content: string, variables: PromptVariable[]): Block[] {
  console.log('[Prompt Lab] parseContentToBlocks: START. Content:', content, 'Variables:', variables.map(v => v.placeholder));

  if (!content) {
    console.log('[Prompt Lab] parseContentToBlocks: Content is empty, returning initial empty text block.');
    return [{ type: 'text', id: uid('t-'), value: '' }]
  }
  if (!variables || variables.length === 0) {
    console.log('[Prompt Lab] parseContentToBlocks: No variables, returning content as single text block.');
    return [{ type: 'text', id: uid('t-'), value: content }]
  }

  // Sort placeholders longest-first to avoid partial matches
  const placeholders = variables.map(v => v.placeholder).sort((a, b) => b.length - a.length)
  const escaped = placeholders.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')
  const re = new RegExp(`(${escaped})`, 'g')
  console.log('[Prompt Lab] parseContentToBlocks: Regex for splitting:', re);

  const parts = content.split(re);
  console.log('[Prompt Lab] parseContentToBlocks: Raw split parts:', parts);

  const blocks: Block[] = []
  parts.forEach(part => {
    const matched = variables.find(v => v.placeholder === part)
    if (matched) {
      console.log(`[Prompt Lab] parseContentToBlocks: Found variable part "${part}".`);
      blocks.push({ type: 'variable', id: uid('v-'), varId: matched.id, placeholder: matched.placeholder, name: matched.name })
    } else {
      if (part === '' && blocks.length > 0 && blocks[blocks.length - 1].type === 'variable') {
        console.log(`[Prompt Lab] parseContentToBlocks: Skipping empty part after a variable block.`);
        return;
      }

      console.log(`[Prompt Lab] parseContentToBlocks: Found text part "${part}".`);
      if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
        blocks.push({ type: 'text', id: uid('t-'), value: part })
      } else {
        const last = blocks[blocks.length - 1] as Block & { value: string };
        last.value = last.value + part
        console.log(`[Prompt Lab] parseContentToBlocks: Merged text part "${part}" into previous block. New value: "${last.value}"`);
      }
    }
  })

  if (blocks.length === 0) {
    console.log('[Prompt Lab] parseContentToBlocks: No blocks generated, adding initial empty text block.');
    blocks.push({ type: 'text', id: uid('t-'), value: '' })
  }
  console.log('[Prompt Lab] parseContentToBlocks: END. Resulting blocks:', blocks);
  return blocks
}

/* Serialize blocks back into string using variable.placeholder values */
function serializeBlocks(blocks: Block[]): string {
  const serialized = blocks.map(b => b.type === 'text' ? b.value : b.placeholder).join('')
  console.log('[Prompt Lab] serializeBlocks: Input blocks:', blocks, 'Output content:', serialized);
  return serialized
}






/* ---------- EditorPanel: Enhanced Prompt Creation ---------- */
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
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const initialBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    console.log('[Prompt Lab] EditorPanel: Initial blocks state set (from useState initializer):', initialBlocks);
    return initialBlocks;
  });

  useEffect(() => {
    console.log('[Prompt Lab] EditorPanel useEffect [prompt.content, prompt.variables]: Re-parsing blocks...');
    const newBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    setBlocks(newBlocks);
    console.log('[Prompt Lab] EditorPanel useEffect [prompt.content, prompt.variables]: Blocks updated to:', newBlocks);
  }, [prompt.content, prompt.variables]);

  useEffect(() => {
    console.log('[Prompt Lab] EditorPanel useEffect [blocks]: Blocks state changed. Serializing...');
    const serialized = serializeBlocks(blocks);
    if (serialized !== prompt.content) {
      console.log('[Prompt Lab] EditorPanel useEffect [blocks]: Content differs, calling onUpdate. Old:', prompt.content, 'New:', serialized);
      onUpdate({ content: serialized });
    } else {
      console.log('[Prompt Lab] EditorPanel useEffect [blocks]: Content is the same, no update needed.');
    }
  }, [blocks, onUpdate, prompt.content]);

  const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id?: string; name?: string }) => {
    console.log(`[Prompt Lab] insertVariableAt: Attempting to insert variable "${variable.placeholder}" at index ${index}.`);
    const newBlock: Block = { type: 'variable', id: uid('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name }
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(index, 0, newBlock)
      console.log('[Prompt Lab] insertVariableAt: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []);

  const insertTextAt = useCallback((index: number, text = '') => {
    console.log(`[Prompt Lab] insertTextAt: Attempting to insert text "${text}" at index ${index}.`);
    const newBlock: Block = { type: 'text', id: uid('t-'), value: text }
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(index, 0, newBlock)
      console.log('[Prompt Lab] insertTextAt: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []);

  const updateTextBlock = useCallback((id: string, value: string) => {
    console.log(`[Prompt Lab] updateTextBlock: Updating block ID "${id}" with value: "${value}".`);
    setBlocks(prev => {
        const updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        console.log('[Prompt Lab] updateTextBlock: Blocks state WILL BE updated to:', updated);
        return updated;
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    console.log(`[Prompt Lab] removeBlock: Removing block at index ${index}.`);
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(index, 1)
      console.log('[Prompt Lab] removeBlock: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []);

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[Prompt Lab] moveBlock: Moving block from index ${from} to ${to}.`);
    setBlocks(prev => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      console.log('[Prompt Lab] moveBlock: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []);


  const [{ isOverBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: ItemTypes.VARIABLE,
    drop: (item: { id: string; placeholder: string; name?: string }, monitor) => {
      if (monitor.didDrop()) {
        console.log('[Prompt Lab] EditorPanel useDrop: Drop already handled by a child component. Exiting.');
        return;
      }

      if (blocks.length === 0) {
        console.log('[Prompt Lab] EditorPanel useDrop (empty container): Variable dropped:', item.placeholder);
        insertVariableAt(0, item);
      } else {
        console.log('[Prompt Lab] EditorPanel useDrop (fallback to end): Variable dropped (no specific block target hit, or outside a block). Adding to end.');
        insertVariableAt(blocks.length, item);
      }
    },
    collect: (monitor) => ({
      isOverBlockContainer: monitor.isOver({ shallow: true }) && monitor.canDrop() && !monitor.didDrop(),
    }),
  }), [blocks.length, insertVariableAt]);


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

      <div className="flex-1 overflow-auto p-4">
        <section className="rounded-lg border p-4 mb-4">
          <div className="mb-2 text-sm font-medium">Project context</div>
          <Textarea
            value={prompt.context}
            onChange={(e) => onUpdate({ context: e.target.value })}
            rows={6}
            className="overflow-y-auto"
            placeholder="Add domain, audience, constraints, style guides, and examples. Use {{variables}} if needed."
          />
        </section>

        <section className="rounded-lg border p-4 mb-4">
          <div className="mb-2 text-sm font-medium">Prompt content</div>
          <div
            ref={dropBlockContainer}
            className={`flex flex-wrap gap-2 min-h-[300px] border rounded p-3 ${isOverBlockContainer ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}`}
          >
            {blocks.map((b, i) => (
              <BlockRenderer
                key={b.id}
                block={b}
                index={i}
                allBlocks={blocks}
                updateTextBlock={updateTextBlock}
                removeBlock={removeBlock}
                moveBlock={moveBlock}
                insertVariableAt={insertVariableAt}
                insertTextAt={insertTextAt}
              />
            ))}
            {blocks.length === 0 && (
                <div className="flex-1 text-center py-12 text-gray-400">
                    Drag variables or click "+ Add text" to start building your prompt.
                </div>
            )}

            <button
              onClick={() => insertTextAt(blocks.length, '')}
              className="px-2 py-1 border rounded text-sm text-gray-500 hover:bg-gray-100"
            >
              + Add text
            </button>
          </div>
        </section>

        <section className="flex items-center gap-2">
          <Input
            placeholder="Notes for this version"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => { onSnapshot(note); setNote('') }}
            className="btn-primary"
          >
            Save <GitCommit className="ml-1 h-4 w-4" />
          </Button>
        </section>
      </div>
    </div>
  )
}


/* ---------- Block Renderer: Puzzle-style variable/text blocks ---------- */
function BlockRenderer({
  block,
  index,
  allBlocks,
  updateTextBlock,
  removeBlock,
  moveBlock,
  insertVariableAt,
  insertTextAt,
}: {
  block: Block
  index: number
  allBlocks: Block[];
  updateTextBlock: (id: string, value: string) => void
  removeBlock: (index: number) => void
  moveBlock: (from: number, to: number) => void
  insertVariableAt: (index: number, variable: { placeholder: string; id?: string; name?: string }) => void
  insertTextAt: (index: number, text?: string) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { id: block.id, index },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [block.id, index])

  const [localIsOver, setLocalIsOver] = useState(false);
  const [localDropTargetPosition, setDropTargetPosition] = useState<'before' | 'after' | null>(null);

  const [{ isOver: monitorIsOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    hover(item: { id?: string; index?: number; placeholder?: string }, monitor) {
      if (!ref.current) return;
      if (!monitor.isOver({ shallow: true })) {
        setLocalIsOver(false);
        setDropTargetPosition(null);
        return;
      }

      const dragItemType = monitor.getItemType();
      const dragItemIndex = (item as { index: number }).index;
      const hoverIndex = index;

      if (dragItemType === ItemTypes.BLOCK && dragItemIndex === hoverIndex) {
        setLocalIsOver(false);
        setDropTargetPosition(null);
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      let newDropPosition: 'before' | 'after';
      if (hoverClientY < hoverMiddleY) {
        newDropPosition = 'before';
      } else {
        newDropPosition = 'after';
      }

      if (!localIsOver || localDropTargetPosition !== newDropPosition) {
        setLocalIsOver(true);
        setDropTargetPosition(newDropPosition);
      }
    },
    drop(item: any, monitor) {
      const dragItemType = monitor.getItemType();
      const targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

      setLocalIsOver(false);
      setDropTargetPosition(null);

      if (dragItemType === ItemTypes.VARIABLE) {
        console.log(`[Prompt Lab] BlockRenderer useDrop (VARIABLE): Dropped "${item.placeholder}" at target index ${targetIndex}.`);
        insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && dragIndex < index && localDropTargetPosition === 'after') ||
                             (dragIndex - 1 === targetIndex && dragIndex > index && localDropTargetPosition === 'before');

        if (isNoRealMove) {
          console.log(`[Prompt Lab] BlockRenderer useDrop (BLOCK): Dragged block #${dragIndex} dropped at target index ${targetIndex}. No actual move needed (same or adjacent spot).`);
          return;
        }

        console.log(`[Prompt Lab] BlockRenderer useDrop (BLOCK): Moving block from index ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [index, insertVariableAt, moveBlock, localDropTargetPosition, localIsOver]);

  useEffect(() => {
    if (!monitorIsOver) {
      setLocalIsOver(false);
      setDropTargetPosition(null);
    }
  }, [monitorIsOver]);

  const combinedRef = mergeRefs(ref, drag, drop);

  const baseClass = "p-2 rounded-md border shadow-sm flex-shrink-0 w-full relative";
  const droppableAreaClass = `relative w-full h-full rounded-md border`;

  const isHoveringAbove = localIsOver && localDropTargetPosition === 'before';
  const isHoveringBelow = localIsOver && localDropTargetPosition === 'after';

  if (block.type === 'variable') {
    return (
      <div
        ref={combinedRef}
        className={`${baseClass} bg-transparent border-transparent ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      >
        {isHoveringAbove && <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`${droppableAreaClass} bg-blue-50 border-blue-200`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{block.name || block.placeholder}</div>
            <button onClick={() => removeBlock(index)} className="text-xs px-2 py-1 rounded bg-transparent border">
              Remove
            </button>
          </div>
        </div>
        {isHoveringBelow && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  } else { // type === 'text'
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Backspace') {
        const currentText = ref.current?.innerText || '';
        if (currentText === '') {
            e.preventDefault();
            if (allBlocks.length === 1 && allBlocks[0].id === block.id) {
                console.log(`[Prompt Lab] BlockRenderer: Backspace on the ONLY empty text block. Clearing content.`);
                updateTextBlock(block.id, '');
            } else if (index > 0) {
                console.log(`[Prompt Lab] BlockRenderer: Backspace on empty text block. Removing block at index ${index}.`);
                removeBlock(index);
            } else if (index === 0 && allBlocks.length > 1) {
                console.log(`[Prompt Lab] BlockRenderer: Backspace on empty first text block. Removing block at index ${index}.`);
                removeBlock(index);
            }
        }
      }
    }

    const onBlur = () => {
      const text = ref.current?.innerText ?? ''
      console.log(`[Prompt Lab] BlockRenderer: Text block ID "${block.id}" blurred. Updating text to: "${text}".`);
      updateTextBlock(block.id, text)
    }

    return (
      <div
        ref={combinedRef}
        className={`${baseClass} bg-transparent border-transparent ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      >
        {isHoveringAbove && <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`${droppableAreaClass} bg-white border-gray-300`}
        >
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className="min-h-[40px] text-sm outline-none w-full"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {block.value}
          </div>
        </div>
        {isHoveringBelow && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  }
}

/* ---------- VersionsPanel, DiffDialog, VariableCreationDialog ---------- */

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
      <DialogContent className="max-w-5xl bg-background">
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
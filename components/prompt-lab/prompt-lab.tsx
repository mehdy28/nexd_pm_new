'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from "react" // Added useCallback
import { usePromptLab, type Prompt, type Version, type PromptVariable } from "./store"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, RotateCcw, Plus, GitCommit } from "lucide-react"
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"


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

/* ---------- MAIN COMPONENT ---------- */
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
    console.log('[Prompt Lab] PromptLab useEffect: selectedPrompt or selectedVersionId changed.');
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
    console.log('[Prompt Lab] handleCreateVariable: Adding new variable:', variableWithId);
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
      {variable.name || variable.placeholder}
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

  const parts = content.split(re); // Keep all parts, including empty ones, for explicit handling
  console.log('[Prompt Lab] parseContentToBlocks: Raw split parts:', parts);

  const blocks: Block[] = []
  parts.forEach(part => {
    const matched = variables.find(v => v.placeholder === part)
    if (matched) {
      console.log(`[Prompt Lab] parseContentToBlocks: Found variable part "${part}".`);
      blocks.push({ type: 'variable', id: uid('v-'), varId: matched.id, placeholder: matched.placeholder, name: matched.name })
    } else {
      // Heuristic: If part is empty and the previous block was a variable,
      // it means this empty part is an artifact of split() and not actual content.
      // This specifically prevents an empty text block from being created immediately after a variable block.
      if (part === '' && blocks.length > 0 && blocks[blocks.length - 1].type === 'variable') {
        console.log(`[Prompt Lab] parseContentToBlocks: Skipping empty part after a variable block.`);
        return; // Ignore this empty part
      }
      
      console.log(`[Prompt Lab] parseContentToBlocks: Found text part "${part}".`);
      // Merge with previous text block if available
      if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
        blocks.push({ type: 'text', id: uid('t-'), value: part })
      } else {
        const last = blocks[blocks.length - 1] as Block & { value: string }; // Type assertion for safety
        last.value = last.value + part
        console.log(`[Prompt Lab] parseContentToBlocks: Merged text part "${part}" into previous block. New value: "${last.value}"`);
      }
    }
  })

  // Final check: If no blocks were created, still provide an empty text block for editing.
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

  // Effect to re-parse blocks when prompt.content or prompt.variables change
  useEffect(() => {
    console.log('[Prompt Lab] EditorPanel useEffect [prompt.content, prompt.variables]: Re-parsing blocks...');
    const newBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    setBlocks(newBlocks);
    console.log('[Prompt Lab] EditorPanel useEffect [prompt.content, prompt.variables]: Blocks updated to:', newBlocks);
  }, [prompt.content, prompt.variables]);

  // Effect to serialize blocks and update prompt.content
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

  // useCallback to ensure these functions have stable references for DND hooks
  const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id?: string; name?: string }) => {
    console.log(`[Prompt Lab] insertVariableAt: Attempting to insert variable "${variable.placeholder}" at index ${index}.`);
    const newBlock: Block = { type: 'variable', id: uid('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name }
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(index, 0, newBlock)
      console.log('[Prompt Lab] insertVariableAt: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []); // Empty dependency array means this function reference is stable

  const insertTextAt = useCallback((index: number, text = '') => {
    console.log(`[Prompt Lab] insertTextAt: Attempting to insert text "${text}" at index ${index}.`);
    const newBlock: Block = { type: 'text', id: uid('t-'), value: text }
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(index, 0, newBlock)
      console.log('[Prompt Lab] insertTextAt: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []); // Empty dependency array means this function reference is stable

  const updateTextBlock = useCallback((id: string, value: string) => {
    console.log(`[Prompt Lab] updateTextBlock: Updating block ID "${id}" with value: "${value}".`);
    setBlocks(prev => {
        const updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        console.log('[Prompt Lab] updateTextBlock: Blocks state WILL BE updated to:', updated);
        return updated;
    });
  }, []); // Empty dependency array means this function reference is stable

  const removeBlock = useCallback((index: number) => {
    console.log(`[Prompt Lab] removeBlock: Removing block at index ${index}.`);
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(index, 1)
      console.log('[Prompt Lab] removeBlock: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []); // Empty dependency array means this function reference is stable

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[Prompt Lab] moveBlock: Moving block from index ${from} to ${to}.`);
    setBlocks(prev => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      console.log('[Prompt Lab] moveBlock: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []); // Empty dependency array means this function reference is stable


  // EditorPanel's useDrop is now only for dropping into an EMPTY container
  // or implicitly at the end if no BlockRenderer is hovered.
  const [{ isOverBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: ItemTypes.VARIABLE,
    drop: (item: { id: string; placeholder: string; name?: string }, monitor) => {
      // CRITICAL FIX: If a nested drop target already handled the drop, do nothing here.
      if (monitor.didDrop()) {
        console.log('[Prompt Lab] EditorPanel useDrop: Drop already handled by a child component. Exiting.');
        return;
      }

      // Only insert if there are no blocks, otherwise individual BlockRenderers handle drops
      if (blocks.length === 0) {
        console.log('[Prompt Lab] EditorPanel useDrop (empty container): Variable dropped:', item.placeholder);
        insertVariableAt(0, item); // Insert at the beginning of an empty list
      } else {
        console.log('[Prompt Lab] EditorPanel useDrop (fallback to end): Variable dropped (no specific block target hit, or outside a block). Adding to end.');
        // This case implies a drop "outside" of specific blocks but still within the container.
        // It's a fallback to add to the very end.
        insertVariableAt(blocks.length, item);
      }
    },
    collect: (monitor) => ({
      // Only show hover effect if no child has captured the drop
      isOverBlockContainer: monitor.isOver({ shallow: true }) && monitor.canDrop() && !monitor.didDrop(),
    }),
  }), [blocks.length, insertVariableAt]); // Depend on blocks.length and insertVariableAt to ensure correct index and function reference


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
            ref={dropBlockContainer} // This outer drop target is for dropping into an empty area or implicitly at the end
            className={`flex flex-wrap gap-2 min-h-[300px] border rounded p-3 ${isOverBlockContainer ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}`}
          >
            {blocks.map((b, i) => (
              <BlockRenderer
                key={b.id}
                block={b}
                index={i}
                // Pass blocks array to BlockRenderer for Backspace logic
                allBlocks={blocks}
                updateTextBlock={updateTextBlock}
                removeBlock={removeBlock}
                moveBlock={moveBlock}
                insertVariableAt={insertVariableAt}
                insertTextAt={insertTextAt}
              />
            ))}
            {/* Display guidance for empty state */}
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
  allBlocks, // Added prop
  updateTextBlock,
  removeBlock,
  moveBlock,
  insertVariableAt,
  insertTextAt,
}: {
  block: Block
  index: number
  allBlocks: Block[]; // Added type
  updateTextBlock: (id: string, value: string, variables?: any[]) => void
  removeBlock: (index: number) => void
  moveBlock: (from: number, to: number) => void
  insertVariableAt: (index: number, variable: { placeholder: string; id?: string; name?: string }) => void
  insertTextAt: (index: number, text?: string) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { id: block.id, index }, // item includes id for identification and index for position
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [block.id, index])

  // Local state for more controlled hover visual feedback
  const [localIsOver, setLocalIsOver] = useState(false);
  const [localDropTargetPosition, setDropTargetPosition] = useState<'before' | 'after' | null>(null);

  // useDrop for handling:
  // 1. Dropping a new VARIABLE from the sidebar onto this block.
  // 2. Dropping an existing BLOCK (for reordering) onto this block.
  const [{ isOver: monitorIsOver }, drop] = useDrop(() => ({ // Destructure isOver from monitor
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    hover(item: { id?: string; index?: number; placeholder?: string }, monitor) {
      if (!ref.current) return;
      if (!monitor.isOver({ shallow: true })) { // Only care about direct hover
        setLocalIsOver(false);
        setDropTargetPosition(null);
        return;
      }

      const dragItemType = monitor.getItemType();
      const dragItemIndex = (item as { index: number }).index;
      const hoverIndex = index;

      // Don't visually indicate a move if dragging a block over itself
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
        newDropPosition = 'before'; // Hovering over the top half
      } else {
        newDropPosition = 'after';  // Hovering over the bottom half
      }

      // Update local state for visual feedback only if it's changing
      if (!localIsOver || localDropTargetPosition !== newDropPosition) {
        setLocalIsOver(true);
        setDropTargetPosition(newDropPosition);
      }
    },
    drop(item: any, monitor) {
      const dragItemType = monitor.getItemType();
      const targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

      // Reset local hover state immediately on drop (important before state updates)
      setLocalIsOver(false);
      setDropTargetPosition(null);

      if (dragItemType === ItemTypes.VARIABLE) {
        console.log(`[Prompt Lab] BlockRenderer useDrop (VARIABLE): Dropped "${item.placeholder}" at target index ${targetIndex}.`);
        insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        // Prevent moving if dropping into an effectively identical position
        const isNoRealMove = (dragIndex === targetIndex) || // Dropped on self, 'before'
                             (dragIndex + 1 === targetIndex && dragIndex < index && localDropTargetPosition === 'after') || // Moving down one, dropped 'after' original
                             (dragIndex - 1 === targetIndex && dragIndex > index && localDropTargetPosition === 'before'); // Moving up one, dropped 'before' original

        if (isNoRealMove) {
          console.log(`[Prompt Lab] BlockRenderer useDrop (BLOCK): Dragged block #${dragIndex} dropped at target index ${targetIndex}. No actual move needed (same or adjacent spot).`);
          return;
        }

        console.log(`[Prompt Lab] BlockRenderer useDrop (BLOCK): Moving block from index ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex; // Update the index of the dragged item for subsequent moves
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(), // We keep this for the useEffect cleanup
    }),
  }), [index, insertVariableAt, moveBlock, localDropTargetPosition, localIsOver]); // dependencies, `localDropTargetPosition` and `localIsOver` are from component state, so this should not cause infinite loop with useCallback, just ensures latest values are used in drop/hover.

  // Effect to clean up local hover state when DND monitor is no longer over this component
  // Use `monitorIsOver` which comes from the `collect` function
  useEffect(() => {
    if (!monitorIsOver) {
      setLocalIsOver(false);
      setDropTargetPosition(null);
    }
  }, [monitorIsOver]);

  const combinedRef = mergeRefs(ref, drag, drop);

  const baseClass = "p-2 rounded-md border shadow-sm flex-shrink-0 w-full relative"; // Added relative for positioning indicators
  const droppableAreaClass = `relative w-full h-full rounded-md border`;

  // Visual indicators for drop position
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
      if (e.key === 'Enter') {
        // REMOVED: e.preventDefault()
        // REMOVED: insertTextAt logic
        // This allows the default contenteditable behavior to create a new line (div or <br>)
        // The onBlur event will capture the full content, including new lines.
        console.log('[Prompt Lab] BlockRenderer: Enter key pressed in text block. Allowing default new line behavior.');
      } else if (e.key === 'Backspace') {
        // Enhanced Backspace logic for empty text blocks
        const currentText = ref.current?.innerText || '';
        if (currentText === '') {
            e.preventDefault(); // Prevent default browser back navigation
            if (allBlocks.length === 1 && allBlocks[0].id === block.id) {
                // If this is the ONLY block and it's empty, update its value to empty string.
                // parseContentToBlocks will then ensure an empty text block is always present.
                console.log(`[Prompt Lab] BlockRenderer: Backspace on the ONLY empty text block. Clearing content.`);
                updateTextBlock(block.id, '');
            } else if (index > 0) { // If not the first block, just remove it
                console.log(`[Prompt Lab] BlockRenderer: Backspace on empty text block. Removing block at index ${index}.`);
                removeBlock(index);
            } else if (index === 0 && allBlocks.length > 1) {
                // First block, but more blocks exist. Remove this empty first block.
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
          {/* Editable Text Area */}
          <div
            ref={ref} // Ensure ref is correctly applied here
            contentEditable
            suppressContentEditableWarning
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className="min-h-[40px] text-sm outline-none w-full"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {block.value}
          </div>

          {/* Variables Grid (Leaving as is, but still noting it's inconsistent with current parsing logic) */}
          <div className="mt-2 flex flex-wrap gap-2">
            {block.variables?.map((v, i) => (
              <div
                key={v.id || i}
                className="flex-1 basis-[30%] min-w-[90px] p-2 bg-blue-50 rounded border border-blue-200 text-sm flex items-center justify-between"
              >
                <span>{v.name || v.placeholder}</span>
                <button
                  onClick={() => {
                    const newVars = [...(block.variables || [])]
                    newVars.splice(i, 1)
                    console.log(`[Prompt Lab] BlockRenderer: Removing variable "${v.placeholder}" from text block ID "${block.id}".`);
                    updateTextBlock(block.id, block.value, newVars)
                  }}
                  className="text-xs px-1 py-0.5 rounded bg-transparent border"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        {isHoveringBelow && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  }
}











/* ---------- VersionsPanel, DiffDialog, VariableCreationDialog (unchanged logic) ---------- */

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
      console.log('[Prompt Lab] VariableCreationDialog: Creating new variable:', { name, placeholder, defaultValue, description });
      onCreate({ name, placeholder, defaultValue, description })
      setName('')
      setPlaceholder('')
      setDefaultValue('')
      setDescription('')
    } else {
      console.warn('[Prompt Lab] VariableCreationDialog: Name and Placeholder are required.');
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
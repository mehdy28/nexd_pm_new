'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { usePromptLab, type Prompt, type Version, type PromptVariable, PromptVariableType, type PromptVariableSource } from "./store" // Added PromptVariableType, PromptVariableSource
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, RotateCcw, Plus, GitCommit, Text, Trash2, GripVertical } from "lucide-react" // Added Trash2, GripVertical
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd' // Added useDragLayer
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

    // NEW: Wrap substituted values for highlighting in the plain text preview
    const highlightedValue = `[[${valueToSubstitute}]]`; 
    const regex = new RegExp(variable.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    renderedContent = renderedContent.replace(regex, highlightedValue);
    renderedContext = renderedContext.replace(regex, highlightedValue);
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
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables") // Changed initial tab for demo
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

                    {/* CORRECTED: Version Details Panel - Only requested elements kept */}
                    <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <VersionsPanel
                        versions={selectedPrompt.versions || []}
                        selectedVersionId={selectedVersionId}
                      />
                    </TabsContent>

                    {/* CORRECTED: Preview Section - Only requested elements kept */}
                    <TabsContent value="preview" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">Preview</div>
                        <Button size="sm" onClick={() => copy(renderedPreview)} className="h-8 btn-primary">
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </Button>
                      </div>
                      <Textarea
                        readOnly
                        value={renderedPreview}
                        className="min-h-[300px] font-mono overflow-y-auto"
                        // Add inline style to make the highlighting (e.g., [[value]]) stand out
                        style={{ background: '#f8f8f8', color: '#333', borderColor: '#e0e0e0', lineHeight: '1.5' }}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: Text wrapped in `[[...]]` indicates a substituted variable.
                      </p>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        {/* DiffDialog removed as it was not requested */}
        {/*
        <DiffDialog
          open={compare.open}
          onOpenChange={(o) => setCompare((prev) => ({ ...prev, open: o }))}
          version={compare.version}
          current={selectedPrompt?.content || ""}
        />
        */}

        {/* NEW: Variable Discovery Builder */}
        <VariableDiscoveryBuilder
          open={showVariableBuilder}
          onOpenChange={setShowVariableBuilder}
          onCreate={handleCreateVariable}
          projectId={projectId}
        />
      </div>
      <CustomDragLayer /> {/* Add the custom drag layer here */}
    </DndProvider>
  )
}

/* ---------- Variable Item (Sidebar) ---------- */

function VariableItem({ variable }: { variable: PromptVariable }) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({ // Added preview to useDrag
    type: ItemTypes.VARIABLE,
    item: { id: variable.id, placeholder: variable.placeholder, name: variable.name }, // Pass minimal data for drag layer
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [variable])

  // Connect the drag source to the DOM node and explicitly hide the default HTML5 drag preview
  useEffect(() => {
    drag(document.getElementById(variable.id + '-drag-source')); // Connect drag source
    preview(getEmptyImage(), { captureDraggingState: true }); // Hide default browser preview
  }, [drag, preview, variable.id]);

  return (
    // Apply a unique ID for drag source capture. Make the original item invisible when dragging
    <div
      id={variable.id + '-drag-source'} // Unique ID for drag source (for dragRef)
      className={`cursor-grab rounded px-2 py-1 mb-2 border ${
        isDragging ? 'opacity-0' : 'bg-gray-100' // Make the original item invisible when dragging
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

  if (!content && variables.length === 0) {
    // Completely empty: start with a single empty text block
    return [{ type: 'text', id: uid('t-'), value: '' }];
  }

  // Sort placeholders longest-first to avoid partial matches (e.g., {{name}} before {{name_full}})
  const sortedVariables = variables.sort((a, b) => b.placeholder.length - a.placeholder.length);
  const placeholders = sortedVariables.map(v => v.placeholder);
  const escaped = placeholders.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const re = new RegExp(`(${escaped})`, 'g');

  const parts = content.split(re);
  
  let tempBlocks: Block[] = [];
  let currentText = '';

  parts.forEach(part => {
    const matchedVar = sortedVariables.find(v => v.placeholder === part);
    if (matchedVar) {
      if (currentText !== '') {
        tempBlocks.push({ type: 'text', id: uid('t-'), value: currentText });
        currentText = '';
      }
      tempBlocks.push({ type: 'variable', id: uid('v-'), varId: matchedVar.id, placeholder: matchedVar.placeholder, name: matchedVar.name });
    } else {
      currentText += part;
    }
  });

  if (currentText !== '') {
    tempBlocks.push({ type: 'text', id: uid('t-'), value: currentText });
  }

  // Post-processing to ensure structural integrity for editing:
  const finalBlocks: Block[] = [];

  // 1. Ensure a leading empty text block if the first block is a variable
  if (tempBlocks.length > 0 && tempBlocks[0].type === 'variable') {
    finalBlocks.push({ type: 'text', id: uid('t-leading'), value: '' });
  }

  tempBlocks.forEach((block, idx) => {
    if (block.type === 'text') {
      // Merge with previous text block if adjacent
      if (finalBlocks.length > 0 && finalBlocks[finalBlocks.length - 1].type === 'text') {
        (finalBlocks[finalBlocks.length - 1] as Block & { value: string }).value += block.value;
      } else {
        finalBlocks.push(block);
      }
    } else { // Variable block
      finalBlocks.push(block);
      // Ensure there's a text block after a variable if it's not the last and is followed by another variable
      if (idx < tempBlocks.length - 1 && tempBlocks[idx + 1].type === 'variable') {
        finalBlocks.push({ type: 'text', id: uid('t-after-var-mid'), value: '' });
      }
    }
  });

  // 2. Ensure a trailing empty text block if the last block is a variable
  if (finalBlocks.length > 0 && finalBlocks[finalBlocks.length - 1].type === 'variable') {
    finalBlocks.push({ type: 'text', id: uid('t-trailing'), value: '' });
  }

  // 3. If after all parsing, no blocks were produced, or only a single text block with content and then it's removed, ensure at least one empty text block.
  if (finalBlocks.length === 0) {
      finalBlocks.push({ type: 'text', id: uid('t-fallback'), value: '' });
  }

  console.log('[Prompt Lab] parseContentToBlocks: END. Resulting blocks:', finalBlocks);
  return finalBlocks;
}

/* Serialize blocks back into string using variable.placeholder values */
function serializeBlocks(blocks: Block[]): string {
  // Filter out truly empty text blocks that aren't necessary for content representation
  const contentBlocks = blocks.filter(b => b.type === 'variable' || (b.type === 'text' && b.value !== ''));
  const serialized = contentBlocks.map(b => b.type === 'text' ? b.value : b.placeholder).join('')
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

  // This ensures the blocks are re-parsed when the actual prompt content or variables change
  useEffect(() => {
    console.log('[Prompt Lab] EditorPanel useEffect [prompt.content, prompt.variables]: Re-parsing blocks...');
    const newBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    setBlocks(newBlocks);
    console.log('[Prompt Lab] EditorPanel useEffect [prompt.content, prompt.variables]: Blocks updated to:', newBlocks);
  }, [prompt.content, prompt.variables]);

  // This effect serializes blocks back to prompt.content when blocks state changes
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
    setBlocks(prev => {
      let copy = [...prev];
      const newVarBlock: Block = { type: 'variable', id: uid('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name };
      
      // Before inserting the variable, clean up any adjacent empty text blocks that it might replace.
      // If the target index is an empty text block, remove it.
      if (index < copy.length && copy[index]?.type === 'text' && (copy[index] as Block & {value:string}).value === '') {
          copy.splice(index, 1);
      }
      // If the previous block is an empty text block, remove it.
      if (index > 0 && copy[index - 1]?.type === 'text' && (copy[index - 1] as Block & {value:string}).value === '') {
          copy.splice(index - 1, 1);
          index--; // Adjust index as a block was removed
      }

      copy.splice(index, 0, newVarBlock);

      // Ensure text blocks are around the new variable for editing context
      // If it's at the start or preceded by another variable, add an empty text block before it
      if (index === 0 || copy[index - 1]?.type === 'variable') {
          copy.splice(index, 0, { type: 'text', id: uid('t-pre-var'), value: '' });
          index++; // Adjust index for the variable itself
      }
      // If it's at the end or followed by another variable, add an empty text block after it
      if (index + 1 === copy.length || copy[index + 1]?.type === 'variable') {
          copy.splice(index + 1, 0, { type: 'text', id: uid('t-post-var'), value: '' });
      }

      console.log('[Prompt Lab] insertVariableAt: Blocks state WILL BE updated to:', copy);
      return copy;
    });
  }, []);

  const insertTextAt = useCallback((index: number, text = '') => {
    console.log(`[Prompt Lab] insertTextAt: Attempting to insert text "${text}" at index ${index}.`);
    setBlocks(prev => {
      let copy = [...prev];

      // If inserting at an index where there's already an empty text block, don't create a new one
      if (index < copy.length && copy[index]?.type === 'text' && (copy[index] as Block & {value:string}).value === '') {
        return prev; 
      }
      // If inserting after an empty text block, also no new block
      if (index > 0 && copy[index - 1]?.type === 'text' && (copy[index - 1] as Block & {value:string}).value === '') {
        return prev; 
      }
      
      const newBlock: Block = { type: 'text', id: uid('t-'), value: text }
      copy.splice(index, 0, newBlock)
      console.log('[Prompt Lab] insertTextAt: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []);

  const updateTextBlock = useCallback((id: string, value: string) => {
    setBlocks(prev => {
        const updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        return updated;
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    console.log(`[Prompt Lab] removeBlock: Removing block at index ${index}.`);
    setBlocks(prev => {
      let copy = [...prev];
      if (index < 0 || index >= copy.length) return prev; // Guard against invalid index

      const removedBlock = copy[index];
      copy.splice(index, 1);
      
      // If two text blocks become adjacent after removal, merge them.
      if (index > 0 && index <= copy.length && copy[index - 1]?.type === 'text' && copy[index]?.type === 'text') {
        const prevText = copy[index - 1] as Block & { value: string };
        const nextText = copy[index] as Block & { value: string };
        prevText.value += nextText.value; // Merge content
        copy.splice(index, 1); // Remove the now-merged next text block
      }
      
      // Ensure there's always at least one text block if the list becomes empty after removal
      if (copy.length === 0) {
        copy.push({ type: 'text', id: uid('t-initial'), value: '' });
      } else if (removedBlock.type === 'variable') {
        // If a variable was removed, ensure it leaves behind proper text blocks.
        // If the variable was surrounded by two variables, it means we now have adjacent variables.
        // So, insert an empty text block.
        if (index > 0 && copy[index-1]?.type === 'variable' && copy[index]?.type === 'variable') {
          copy.splice(index, 0, { type: 'text', id: uid('t-after-removed-var'), value: '' });
        }
        // Ensure leading/trailing text blocks if needed after variable removal,
        // especially if it was at the very start or end.
        if (index === 0 && copy[0]?.type === 'variable') {
          copy.unshift({ type: 'text', id: uid('t-removed-start'), value: '' });
        }
        if (index === copy.length && copy[copy.length-1]?.type === 'variable') {
          copy.push({ type: 'text', id: uid('t-removed-end'), value: '' });
        }
      }

      console.log('[Prompt Lab] removeBlock: Blocks state WILL BE updated to:', copy);
      return copy
    })
  }, []);

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[Prompt Lab] moveBlock: Moving block from index ${from} to ${to}.`);
    setBlocks(prev => {
      let copy = [...prev]
      if (from < 0 || from >= copy.length || to < 0 || to > copy.length) return prev; // Guard

      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)

      // Post-move cleanup for adjacent text blocks and variable spacing
      let cleanedBlocks: Block[] = [];
      copy.forEach((block, idx) => {
          if (block.type === 'text') {
              if (cleanedBlocks.length > 0 && cleanedBlocks[cleanedBlocks.length - 1].type === 'text') {
                  (cleanedBlocks[cleanedBlocks.length - 1] as Block & { value: string }).value += block.value;
              } else {
                  cleanedBlocks.push(block);
              }
          } else { // Variable block
              cleanedBlocks.push(block);
              // If current block is variable and next block is variable (or end of list), insert empty text
              if (idx < copy.length - 1 && copy[idx + 1]?.type === 'variable') {
                  cleanedBlocks.push({ type: 'text', id: uid('t-moved-between-vars'), value: '' });
              }
          }
      });

      // Ensure leading/trailing text blocks after move
      if (cleanedBlocks.length === 0) {
          cleanedBlocks.push({ type: 'text', id: uid('t-empty-after-move'), value: '' });
      } else {
          if (cleanedBlocks[0].type === 'variable') {
              cleanedBlocks.unshift({ type: 'text', id: uid('t-leading-after-move'), value: '' });
          }
          if (cleanedBlocks[cleanedBlocks.length - 1].type === 'variable') {
              cleanedBlocks.push({ type: 'text', id: uid('t-trailing-after-move'), value: '' });
          }
      }

      console.log('[Prompt Lab] moveBlock: Blocks state WILL BE updated to:', cleanedBlocks);
      return cleanedBlocks;
    })
  }, []);

  // Use useDragLayer to determine if anything is being dragged
  const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const [{ isOverBlockContainer }, dropBlockContainer] = useDrop(() => ({ // Removed draggingItemType from collect
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    drop: (item: any, monitor) => { // item can be {id, placeholder, name} for VARIABLE or {id, index} for BLOCK
      if (monitor.didDrop()) {
        console.log('[Prompt Lab] EditorPanel useDrop: Drop already handled by a child component. Exiting.');
        return;
      }
      
      // This drop target handles drops when the container is empty, or
      // if a block/variable is dropped outside of specific BlockRenderer targets.
      // If dropping on the general container, add to the end
      if (monitor.getItemType() === ItemTypes.VARIABLE) {
        console.log('[Prompt Lab] EditorPanel useDrop (fallback to end): Variable dropped. Adding to end.');
        insertVariableAt(blocks.length, item);
      } else if (monitor.getItemType() === ItemTypes.BLOCK) {
        // If a block is dropped on the container itself (not on a specific block), move it to the end
        console.log('[Prompt Lab] EditorPanel useDrop (fallback to end): Block dropped. Moving to end.');
        // Ensure index is within bounds for moveBlock, especially if blocks is empty
        const targetIndex = blocks.length === 0 ? 0 : blocks.length -1;
        moveBlock(item.index, targetIndex); 
      }
    },
    collect: (monitor) => ({
      // isOverBlockContainer: monitor.isOver({ shallow: true }) && monitor.canDrop() && !monitor.didDrop(),
      // Simplified: Just check if over the container and something is dragging
      isOverBlockContainer: monitor.isOver({ shallow: true }) && monitor.canDrop(),
    }),
  }), [blocks.length, insertVariableAt, moveBlock]);


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
            className={`flex flex-col gap-2 min-h-[300px] border rounded p-3 
                        ${isOverBlockContainer && isDraggingSomething ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}`}
          >
            {blocks.length === 0 && !isDraggingSomething && ( // Only show empty state message if no blocks and nothing is being dragged
                <div className="flex-1 text-center py-12 text-gray-400">
                    Drag variables or click "+ Add text" to start building your prompt.
                    <button
                      onClick={() => insertTextAt(0, '')}
                      className="mt-4 px-3 py-1 border rounded-md text-sm text-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center mx-auto"
                    >
                      <Text className="mr-1 h-4 w-4" /> Add text
                    </button>
                </div>
            )}
            {/* Render BlockRenderer and the "Add Text" buttons between them */}
            {blocks.map((b, i) => (
              <React.Fragment key={b.id}>
                {/* InsertTextBlockButton appears between blocks */}
                <InsertTextBlockButton
                  index={i}
                  insertTextAt={insertTextAt}
                  allBlocks={blocks}
                  isDraggingSomething={isDraggingSomething}
                />
                <BlockRenderer
                  block={b}
                  index={i}
                  allBlocks={blocks}
                  updateTextBlock={updateTextBlock}
                  removeBlock={removeBlock}
                  moveBlock={moveBlock}
                  insertVariableAt={insertVariableAt}
                  isDraggingSomething={isDraggingSomething}
                />
              </React.Fragment>
            ))}
            {/* Always show an Add Text button at the very end if there are blocks */}
            {blocks.length > 0 && (
              <InsertTextBlockButton
                index={blocks.length}
                insertTextAt={insertTextAt}
                allBlocks={blocks}
                isDraggingSomething={isDraggingSomething}
              />
            )}
             {/* If blocks are 0 and dragging is active, show a drop target indicator for the empty area */}
             {blocks.length === 0 && isOverBlockContainer && isDraggingSomething && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-indigo-400 rounded-md bg-indigo-50 text-indigo-700 h-24">
                    Drop item here
                </div>
            )}
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
  isDraggingSomething, // Renamed from isDraggingSomething to avoid confusion with internal useDrag isDragging
}: {
  block: Block
  index: number
  allBlocks: Block[];
  updateTextBlock: (id: string, value: string) => void
  removeBlock: (index: number) => void
  moveBlock: (from: number, to: number) => void
  insertVariableAt: (index: number, variable: { placeholder: string; id?: string; name?: string }) => void
  isDraggingSomething: boolean; // Renamed to avoid name collision
}) {
  const contentEditableRef = useRef<HTMLDivElement | null>(null); // Ref specifically for contentEditable
  const wrapperRef = useRef<HTMLDivElement | null>(null); // Ref for the outer wrapper (drop target)

  // Drag source for the block itself
  const [{ isDragging }, dragRef, preview] = useDrag(() => ({ // Added preview to the useDrag hook
    type: ItemTypes.BLOCK,
    item: { id: block.id, index, type: block.type, value: block.type === 'text' ? block.value : block.placeholder, name: block.type === 'variable' ? block.name : undefined },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [block.id, index, block.type, block.value, block.placeholder, block.name]);

  // Drop target logic for reordering and inserting variables
  const [localDropTargetPosition, setLocalDropTargetPosition] = useState<'before' | 'after' | null>(null);
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    hover(item: { id?: string; index?: number; placeholder?: string }, monitor) {
      if (!wrapperRef.current) return;
      if (!monitor.isOver({ shallow: true })) { // Ensure actual hover over this specific component
        setLocalDropTargetPosition(null);
        return;
      }

      const hoverBoundingRect = wrapperRef.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      let newDropPosition: 'before' | 'after' | null = null;
      const draggingItemType = monitor.getItemType();

      // Avoid showing drop indicator if dragging self
      if (draggingItemType === ItemTypes.BLOCK && (item as { index: number }).index === index) {
        setLocalDropTargetPosition(null);
        return;
      }
      
      // Determine drop position only if dragging a BLOCK or VARIABLE
      if (draggingItemType === ItemTypes.BLOCK || draggingItemType === ItemTypes.VARIABLE) {
        newDropPosition = hoverClientY < hoverMiddleY ? 'before' : 'after';
      }

      if (localDropTargetPosition !== newDropPosition) {
        setLocalDropTargetPosition(newDropPosition);
      }
    },
    drop(item: any, monitor) {
      const dragItemType = monitor.getItemType();
      const targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

      setLocalDropTargetPosition(null); // Clear hover state on drop

      if (monitor.didDrop()) return; // Item already handled by a nested drop target

      if (dragItemType === ItemTypes.VARIABLE) {
        console.log(`[Prompt Lab] BlockRenderer useDrop (VARIABLE): Dropped "${item.placeholder}" at target index ${targetIndex}.`);
        insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        // Prevent moving block to its current position or immediately adjacent, which is a no-op
        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && dragIndex < index && localDropTargetPosition === 'after') ||
                             (dragIndex - 1 === targetIndex && dragIndex > index && localDropTargetPosition === 'before');

        if (isNoRealMove) {
          console.log(`[Prompt Lab] BlockRenderer useDrop (BLOCK): Dragged block #${dragIndex} dropped at target index ${targetIndex}. No actual move needed (same or adjacent spot).`);
          return;
        }

        console.log(`[Prompt Lab] BlockRenderer useDrop (BLOCK): Moving block from index ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex; // Update the index of the dragged item
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }), // Only collect if shallowly over this element
      canDrop: monitor.canDrop(),
    }),
  }), [index, insertVariableAt, moveBlock, localDropTargetPosition]);


  // Effect to synchronize contentEditable div's innerText with React state
  // Only update if the DOM content differs from the state to avoid cursor jumps
  useEffect(() => {
    if (block.type === 'text' && contentEditableRef.current && contentEditableRef.current.innerText !== block.value) {
        // Only update if the contentEditable is not currently focused (to prevent cursor jumps)
        if (document.activeElement !== contentEditableRef.current) {
            contentEditableRef.current.innerText = block.value;
        }
    }
  }, [block.type, block.value]); // Depend on block.value

  // Combine refs: dropRef for the whole wrapper, dragRef for handle
  const combinedDropRef = mergeRefs(wrapperRef, dropRef); // dropRef is attached to the wrapper

  // Use a separate ref for the drag handle for text blocks
  const textBlockDragHandleRef = useRef<HTMLDivElement>(null);

  // Connect the drag source to the appropriate DOM node and explicitly hide the default HTML5 drag preview
  useEffect(() => {
    if (block.type === 'variable') {
      dragRef(combinedDropRef.current); // Make the entire variable block draggable
      preview(getEmptyImage(), { captureDraggingState: true }); // Hide default browser preview
    } else { // text block
      dragRef(textBlockDragHandleRef.current); // Make only the GripVertical icon draggable
      preview(getEmptyImage(), { captureDraggingState: true }); // Hide default browser preview
    }
  }, [block.type, dragRef, preview, combinedDropRef, textBlockDragHandleRef]);


  // Only show placeholder line if actively dragging something AND it's over this block
  const showPlaceholderAbove = isOver && localDropTargetPosition === 'before' && isDraggingSomething;
  const showPlaceholderBelow = isOver && localDropTargetPosition === 'after' && isDraggingSomething;

  const commonClasses = `relative w-full rounded-md shadow-sm transition-all duration-100 ease-in-out`;

  if (block.type === 'variable') {
    return (
      <div
        ref={combinedDropRef} // The entire div is a drop target and drag source for variable blocks
        className={`${commonClasses} ${isDragging ? 'opacity-0' : 'opacity-100'}`} // Make the original item invisible when dragging
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`cursor-grab flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md `}
        >
          <div className="text-sm font-medium">{block.name || block.placeholder}</div>
          <button
            onClick={() => removeBlock(index)}
            className="text-xs p-1 rounded-full text-blue-400 hover:bg-blue-100 hover:text-red-600 transition-colors"
            aria-label={`Remove variable ${block.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  } else { // type === 'text'
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Prevent new line on Enter, use Shift+Enter for new line
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Insert a new text block below
        // This will insert a new empty text block and usually the browser
        // will automatically put the cursor there.
        insertTextAt(index + 1, '');
        return; // Prevent default Enter key action
      }
      // If pressing backspace at the very beginning of an empty text block, remove it.
      if (e.key === 'Backspace' && contentEditableRef.current?.innerText === '' && window.getSelection()?.anchorOffset === 0) {
          e.preventDefault();
          // If it's the only block, just clear its content instead of removing it
          if (allBlocks.length === 1 && allBlocks[0].id === block.id) {
              updateTextBlock(block.id, '');
          } else {
              removeBlock(index);
              // TODO: Optionally focus the previous block if one exists
          }
      }
    }

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      // Update state immediately on input for contentEditable
      updateTextBlock(block.id, e.currentTarget.innerText);
    }

    const onBlur = () => {
      const text = contentEditableRef.current?.innerText ?? ''
      // If text block becomes empty on blur and it's not the only block, remove it
      if (text === '' && allBlocks.length > 1) {
        removeBlock(index);
      } else {
        // Ensure final state is saved on blur, even if it wasn't empty
        updateTextBlock(block.id, text); 
      }
    }
    
    return (
      <div
        ref={combinedDropRef} // The entire div is a drop target
        className={`${commonClasses} ${isDragging ? 'opacity-0' : 'opacity-100'}`} // Make the original item invisible when dragging
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`relative p-2 bg-white border border-gray-300 rounded-md flex items-center group`}
        >
            <div
              ref={textBlockDragHandleRef} // Drag handle for text blocks
              className="cursor-grab text-gray-400 hover:text-gray-600 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', padding: '4px' }}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div
                contentEditable
                suppressContentEditableWarning
                onKeyDown={onKeyDown}
                onInput={onInput} // Use onInput for real-time updates
                onBlur={onBlur}
                className="flex-1 min-h-[40px] text-sm outline-none w-full whitespace-pre-wrap"
                ref={contentEditableRef} // Direct ref to contentEditable div
            >
                {/* Initial content comes from state, then managed by onInput */}
            </div>
            {/* Show delete button for text blocks when hovering or if empty and not the only block */}
            {(block.value === '' && allBlocks.length > 1) || (block.value !== '' && true) ? ( // Always show delete for non-empty or non-singular empty blocks
                <button
                    onClick={() => removeBlock(index)}
                    className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove text block"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            ) : null}
        </div>
        {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  }
}

// Function to get an empty image for drag preview (to hide the default browser drag image)
// This is used to ensure only the CustomDragLayer provides visual feedback during drag.
const getEmptyImage = () => {
    if (typeof window === 'undefined') return new Image(); // For SSR
    const img = new Image();
    // This is a 1x1 transparent GIF. It effectively hides the default browser drag image.
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    return img;
};


/* NEW COMPONENT: Insert Text Block Button */
function InsertTextBlockButton({
  index,
  insertTextAt,
  allBlocks,
  isDraggingSomething,
}: {
  index: number;
  insertTextAt: (index: number, text?: string) => void;
  allBlocks: Block[];
  isDraggingSomething: boolean;
}) {
  const [showButton, setShowButton] = useState(false);
  
  const handleMouseLeave = useCallback(() => {
    setShowButton(false);
  }, []);

  // Determine if this button should be explicitly hidden (e.g., between two text blocks)
  const shouldHideExplicitly = useMemo(() => {
    // Hide if it's the very first gap and the first block is a non-empty text block
    if (index === 0 && allBlocks.length > 0 && allBlocks[0].type === 'text' && allBlocks[0].value !== '') return true;
    // Hide if it's between two non-empty text blocks (user can just type/edit the existing ones)
    if (index > 0 && index < allBlocks.length) {
      const prevBlock = allBlocks[index - 1];
      const nextBlock = allBlocks[index];
      if (prevBlock.type === 'text' && prevBlock.value !== '' && nextBlock.type === 'text' && nextBlock.value !== '') {
        return true;
      }
    }
    return false;
  }, [index, allBlocks]);


  return (
    <div
      className={`relative h-6 w-full flex justify-center items-center py-1 transition-all duration-100 ease-in-out group 
                  ${shouldHideExplicitly || isDraggingSomething ? 'hidden' : ''}`} // Hide completely if shouldHideExplicitly or something is being dragged
      onMouseEnter={() => setShowButton(true)} 
      onMouseLeave={handleMouseLeave} 
    >
      {/* Visual hover area - only visible when `showButton` is true */}
      <div className={`absolute top-0 w-full h-full bg-transparent transition-all duration-100 ease-in-out 
                      ${showButton ? 'bg-blue-100/50' : 'bg-transparent'}`}></div>
      
      {showButton && ( // Only show button if mouse is over this element and nothing is being dragged
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); 
            insertTextAt(index);
            setShowButton(false); 
          }}
          className="relative z-10 h-6 px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-100 ease-in-out transform scale-90 group-hover:scale-100"
        >
          <Text className="mr-1 h-3 w-3" /> Add text
        </Button>
      )}
    </div>
  );
}


/* ---------- Custom Drag Layer for Visual Feedback ---------- */
// This component renders a custom preview for the item being dragged,
// which helps avoid the "ghost" default browser drag image and provides better feedback.
function CustomDragLayer() {
  const {
    itemType,
    isDragging,
    item,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset || !item) {
    return null;
  }

  // Styles to position the dragged item at the cursor
  const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    // Add offset to make the cursor appear roughly in the middle of the dragged item
    transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
  };

  const renderItem = () => {
    switch (itemType) {
      case ItemTypes.VARIABLE:
        const variableItem = item as { id: string; placeholder: string; name?: string };
        return (
          <div className="bg-blue-200 border border-blue-400 rounded-md px-3 py-1 shadow-md opacity-90">
            <span className="font-semibold">{variableItem.name || variableItem.placeholder}</span>
            <span className="text-xs text-blue-700 ml-2">(Drag Variable)</span>
          </div>
        );
      case ItemTypes.BLOCK:
        // When dragging a block, the item has more detailed info passed from its drag source
        const blockItem = item as Block & { index: number; type: string; value: string; name?: string };
        return (
          <div className="bg-white border border-gray-400 rounded-md px-3 py-1 shadow-md opacity-90">
            <span className="text-sm">
                {blockItem.type === 'text' ? blockItem.value.substring(0, 30) + (blockItem.value.length > 30 ? '...' : '') : blockItem.name || blockItem.placeholder}
            </span>
            <span className="text-xs text-gray-700 ml-2">(Drag Block)</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={layerStyles}>
      {renderItem()}
    </div>
  );
}


/* ---------- VersionsPanel, DiffDialog, VariableCreationDialog ---------- */

/* Versions */
function VersionsPanel({
  versions,
  selectedVersionId
}: {
  versions: Version[]
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
        {/* Version Name / Title */}
        <h3 className="font-semibold text-lg mb-2">{selectedVersion.notes}</h3>
        {/* Last Edited Date */}
        <p className="text-sm text-gray-500 mb-4">Last Edited: {new Date(selectedVersion.createdAt).toLocaleString()}</p>
        
        {/* Version Details Textarea */}
        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Version Details / Notes</label>
            <Textarea
                readOnly
                value={selectedVersion.notes} // Assuming 'notes' field can serve as details
                rows={4}
                className="overflow-y-auto"
                placeholder="No details available for this version."
            />
        </div>
    </div>
  )
}

/* DiffDialog removed as it was not requested */
/*
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
*/
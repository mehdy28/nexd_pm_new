// components/prompt-lab/prompt-lab.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { usePromptLab, type Prompt, type Version, type PromptVariable, PromptVariableType, type PromptVariableSource } from "./store"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, RotateCcw, Plus, GitCommit, Text, Trash2, GripVertical } from "lucide-react"
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
async function renderPrompt(
  content: string,
  context: string,
  variables: PromptVariable[],
  variableValues: Record<string, string>,
  projectId?: string
): Promise<string> {
  let renderedContent = content;
  let renderedContext = context;

  for (const variable of variables) {
    let valueToSubstitute = variableValues[variable.placeholder] || variable.defaultValue || '';

    if (variable.source && projectId) {
      console.warn(`[Prompt Lab] [renderPrompt] Project data variable '${variable.name}' ({{${variable.placeholder}}}) needs backend resolution. Using default value.`);
    }

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
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables")
  const [showVariableBuilder, setShowVariableBuilder] = useState(false);
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})
  const [renderedPreview, setRenderedPreview] = useState("");

  const selectedPrompt = useMemo(() => prompts.find((p) => p.id === promptId) || null, [prompts, promptId])

  useEffect(() => {
    console.log('[Prompt Lab] Root useEffect: Prompt or selectedVersionId changed.');
    if (selectedPrompt) {
      if (selectedPrompt.versions.length > 0) {
        if (!selectedVersionId || !selectedPrompt.versions.some((v) => v.id === selectedVersionId)) {
          setSelectedVersionId(selectedPrompt.versions[0].id)
          console.log(`[Prompt Lab] Root useEffect: Setting selectedVersionId to first version: ${selectedPrompt.versions[0].id}`);
        }
      } else if (selectedVersionId) {
        setSelectedVersionId(null)
        console.log('[Prompt Lab] Root useEffect: No versions, clearing selectedVersionId.');
      }
      const initialPreviewValues: Record<string, string> = {};
      selectedPrompt.variables.forEach(v => {
        if (!v.source) {
          initialPreviewValues[v.placeholder] = v.defaultValue || '';
        }
      });
      setPreviewVariableValues(initialPreviewValues);
    }
  }, [selectedPrompt, selectedVersionId])

  useEffect(() => {
    if (selectedPrompt) {
      console.log('[Prompt Lab] Root useEffect: Generating preview...');
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
    setShowVariableBuilder(false)
  }

  if (!selectedPrompt) {
    console.log('[Prompt Lab] Rendering: Selected prompt not found.');
    return (
        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
            The selected prompt could not be found.
            <Button onClick={onBack} className="mt-4">Back to Prompt Library</Button>
        </div>
    )
  }
  console.log('[Prompt Lab] Rendering: Main PromptLab component.');

  return (

    <DndProvider backend={HTML5Backend}>
      <div className="page-scroller pt-0 p-1 pb-0 h-full min-h-0">
        <div className="h-[85vh] overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 pb-0 md:grid-cols-[320px_1fr]">

            {/* Left side */}
            <div className="saas-card h-full min-h-0 flex flex-col">
              <Tab.Group
                selectedIndex={leftTab === "versions" ? 0 : 1}
                onChange={(index) => {
                    setLeftTab(index === 0 ? "versions" : "variables");
                    console.log(`[Prompt Lab] Left Tab changed to: ${index === 0 ? "versions" : "variables"}`);
                }}
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
                <Tabs value={rightTab} onValueChange={(v) => {
                    setRightTab(v as any);
                    console.log(`[Prompt Lab] Right Tab changed to: ${v}`);
                }} className="flex h-full flex-col">
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
                        // Add inline style to make the highlighting (e.g., [[value]]) standV out
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

        {/* NEW: Variable Discovery Builder */}
        <VariableDiscoveryBuilder
          open={showVariableBuilder}
          onOpenChange={setShowVariableBuilder}
          onCreate={handleCreateVariable}
          projectId={projectId}
        />
      </div>
      <CustomDragLayer />
    </DndProvider>
  )
}

/* ---------- Variable Item (Sidebar) ---------- */

function VariableItem({ variable }: { variable: PromptVariable }) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.VARIABLE,
    item: { id: variable.id, placeholder: variable.placeholder, name: variable.name },
    collect: (monitor) => {
      const dragging = monitor.isDragging();
      console.log(`[VariableItem ${variable.name}] collect: isDragging = ${dragging}, canDrag = ${monitor.canDrag()}`);
      return { isDragging: dragging };
    },
  }), [variable]);

  useEffect(() => {
    if (preview) {
        preview(getEmptyImage(), { captureDraggingState: true });
    }
    const dragSourceElement = document.getElementById(variable.id + '-drag-source');
    if (dragSourceElement) {
        drag(dragSourceElement);
        console.log(`[VariableItem ${variable.name}] useEffect: Connected drag source to ID: ${variable.id}-drag-source`);
    } else {
        console.warn(`[Prompt Lab] [VariableItem ${variable.name}] useEffect: Drag source element not found for ID: ${variable.id}-drag-source`);
    }
  }, [drag, preview, variable.id, variable.name]);

  return (
    <div
      id={variable.id + '-drag-source'}
      className={`cursor-grab rounded px-2 py-1 mb-2 border ${
        isDragging ? 'opacity-0' : 'bg-gray-100' // Original item disappears when dragging starts
      }`}
    >
      <span className="font-semibold">{variable.name}</span>
      <span className="text-xs text-gray-500 ml-2">({variable.placeholder})</span>
      {variable.source && <Badge variant="secondary" className="ml-2">Project Data</Badge>}
    </div>
  )
}


/* ---------- BLOCK-BASED EDITOR ---------- */

type Block =
  | { type: 'text'; id: string; value: string }
  | { type: 'variable'; id: string; varId?: string; placeholder: string; name?: string }

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2)
}

function parseContentToBlocks(content: string, variables: PromptVariable[]): Block[] {
  console.log('[Prompt Lab] [parseContentToBlocks] START. Content:', content.substring(0, Math.min(content.length, 50)) + "...", 'Variables:', variables.map(v => v.placeholder));

  const sortedVariables = variables.length > 0
    ? variables.sort((a, b) => b.placeholder.length - a.placeholder.length)
    : [];
  const placeholders = sortedVariables.map(v => v.placeholder);

  let tempBlocks: Block[] = [];
  let currentText = '';

  if (placeholders.length > 0) {
    const escaped = placeholders.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const re = new RegExp(`(${escaped})`, 'g');
    const parts = content.split(re);

    parts.forEach((part) => {
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
  } else {
    currentText = content; // If no variables, the whole content is text
  }

  if (currentText !== '') {
    tempBlocks.push({ type: 'text', id: uid('t-'), value: currentText });
  }

  let finalBlocks: Block[] = [];
  tempBlocks.forEach(block => {
    if (block.type === 'text' && block.value === '' && finalBlocks.length > 0 && finalBlocks[finalBlocks.length - 1].type === 'text' && finalBlocks[finalBlocks.length - 1].value === '') {
        return;
    }
    finalBlocks.push(block);
  });

  while (finalBlocks.length > 1 && finalBlocks[0].type === 'text' && finalBlocks[0].value === '') {
    finalBlocks.shift();
  }
  while (finalBlocks.length > 1 && finalBlocks[finalBlocks.length - 1].type === 'text' && finalBlocks[finalBlocks.length - 1].value === '') {
    finalBlocks.pop();
  }


  if (finalBlocks.length === 0) {
      return [{ type: 'text', id: uid('t-initial-empty-fallback'), value: '' }];
  }


  console.log('[Prompt Lab] [parseContentToBlocks] END. Resulting blocks:', finalBlocks.map(b => `${b.type}: ${b.type === 'text' ? `"${b.value.substring(0, Math.min(b.value.length, 15))}..."` : b.placeholder}`));
  return finalBlocks;
}


function serializeBlocks(blocks: Block[]): string {
  const serialized = blocks
    .filter(b => !(b.type === 'text' && b.value === ''))
    .map(b => b.type === 'text' ? b.value : b.placeholder)
    .join('');
  
  if (serialized.trim() === '') return '';

  console.log('[Prompt Lab] [serializeBlocks] Input blocks:', blocks.map(b => `${b.type}: ${b.type === 'text' ? `"${b.value.substring(0, Math.min(b.value.length, 15))}..."` : b.placeholder}`), 'Output content:', serialized.substring(0, Math.min(serialized.length, 50)) + "...");
  return serialized;
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
  
  // Utility function to log the current blocks array in a readable format
  const logBlocks = useCallback((message: string, currentBlocks: Block[]) => {
    const formattedBlocks = currentBlocks.map(b =>
      b.type === 'text' ? `[TEXT:"${b.value.substring(0, Math.min(b.value.length, 30))}..."]` : `[VAR:${b.name || b.placeholder}]`
    ).join(' | ');
    console.log(`[Prompt Lab] [EditorPanel] --- BLOCKS STATE UPDATE --- ${message}\nCURRENT BLOCKS: ${formattedBlocks}`);
  }, []);

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const initialBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    console.log('[Prompt Lab] [EditorPanel] useState initializer: Initial blocks set.');
    logBlocks('Initial render', initialBlocks);
    return initialBlocks;
  });

  // This useEffect re-parses blocks when prompt.content or prompt.variables changes
  // This is the source of truth for normalizing the `blocks` array
  useEffect(() => {
    console.log('[Prompt Lab] [EditorPanel] useEffect [prompt.content, prompt.variables]: Re-parsing blocks due to prompt content/variables change...');
    const newBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    setBlocks(newBlocks);
    console.log('[Prompt Lab] [EditorPanel] useEffect [prompt.content, prompt.variables]: Blocks updated.');
    logBlocks('After prompt.content/variables re-parse', newBlocks);
  }, [prompt.content, prompt.variables]);


  // This useEffect serializes the current blocks state and calls onUpdate if content changed
  useEffect(() => {
    console.log('[Prompt Lab] [EditorPanel] useEffect [blocks]: Blocks state changed. Serializing...');
    const serialized = serializeBlocks(blocks);
    // ONLY call onUpdate if the serialized content *actually* differs.
    // This prevents infinite loops and unnecessary updates.
    if (serialized !== prompt.content) {
      console.log(`[Prompt Lab] [EditorPanel] useEffect [blocks]: Content differs, calling onUpdate. Old: ${prompt.content.substring(0, Math.min(prompt.content.length, 50))}..., New: ${serialized.substring(0, Math.min(serialized.length, 50))}...`);
      onUpdate({ content: serialized });
    } else {
      console.log('[Prompt Lab] [EditorPanel] useEffect [blocks]: Content is the same, no update needed.');
    }
  }, [blocks, onUpdate, prompt.content]);

  const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id?: string; name?: string }) => {
    console.log(`[Prompt Lab] [EditorPanel] insertVariableAt: Attempting to insert variable "${variable.placeholder}" at index ${index}.`);
    setBlocks(prev => {
      let copy = [...prev];
      const newVarBlock: Block = { type: 'variable', id: uid('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name };
      
      // Simply insert the variable. The parseContentToBlocks will re-normalize if needed.
      copy.splice(index, 0, newVarBlock);

      console.log(`[Prompt Lab] [EditorPanel] insertVariableAt: Variable "${variable.placeholder}" inserted at index ${index}.`);
      logBlocks(`After directly inserting variable "${variable.placeholder}" at index ${index}`, copy);
      return copy;
    });
  }, [logBlocks]);


  const insertTextAt = useCallback((index: number, text = '') => {
    console.log(`[Prompt Lab] [EditorPanel] insertTextAt: Attempting to insert text block at index ${index}.`);
    setBlocks(prev => {
      let copy = [...prev];
      const newBlock: Block = { type: 'text', id: uid('t-'), value: text }

      copy.splice(index, 0, newBlock)
      console.log(`[Prompt Lab] [EditorPanel] insertTextAt: Text block inserted at index ${index}.`);
      logBlocks(`After directly inserting text block at index ${index}`, copy);
      return copy
    })
  }, [logBlocks]);

  const updateTextBlock = useCallback((id: string, value: string) => {
    setBlocks(prev => {
        let updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        
        // If a text block becomes empty on direct user input, remove it *unless* it's the sole block.
        if (value === '' && prev.length > 1) {
             updated = updated.filter(b => !(b.type === 'text' && b.id === id && b.value === ''));
        }

        logBlocks(`After updating text block ${id} to "${value.substring(0, Math.min(value.length, 30))}..."`, updated);
        return updated;
    });
  }, [logBlocks]);

  const removeBlock = useCallback((index: number) => {
    console.log(`[Prompt Lab] [EditorPanel] removeBlock: Removing block at index ${index}. Current blocks:`, blocks.map(b => b.id));
    setBlocks(prev => {
      let copy = [...prev];
      if (index < 0 || index >= copy.length) {
          console.warn(`[Prompt Lab] [EditorPanel] removeBlock: Invalid index ${index}.`);
          return prev;
      }

      copy.splice(index, 1); 
      
      console.log(`[Prompt Lab] [EditorPanel] removeBlock: Removed block at index ${index}. New block count: ${copy.length}. Blocks state WILL BE updated.`);
      logBlocks(`After removing block at index ${index}`, copy);
      return copy
    })
  }, [blocks, logBlocks]);

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[Prompt Lab] [EditorPanel] moveBlock: Attempting to move block from index ${from} to ${to}. Current blocks:`, blocks.map(b => b.id));
    setBlocks(prev => {
      let copy = [...prev];
      if (from < 0 || from >= copy.length || to < 0 || to > copy.length) {
          console.warn(`[Prompt Lab] [EditorPanel] moveBlock: Invalid 'from' or 'to' index. from=${from}, to=${to}.`);
          return prev;
      }

      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);

      console.log(`[Prompt Lab] [EditorPanel] moveBlock: Block ${item.id} moved from ${from} to ${to}. Blocks state WILL BE updated.`);
      logBlocks(`After moving block from ${from} to ${to}`, copy);
      return copy;
    });
  }, [blocks, logBlocks]);

  const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const [{ isOverBlockContainer, canDropBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    drop: (item: any, monitor) => {
      if (monitor.didDrop()) {
        console.log('[Prompt Lab] [EditorPanel] useDrop (container): Drop already handled by a child component. Exiting.');
        return;
      }

      const targetIndex = blocks.length;

      if (monitor.getItemType() === ItemTypes.VARIABLE) {
        console.log('[Prompt Lab] [EditorPanel] useDrop (container, fallback to end): Variable dropped. Adding to end. Item:', item);
        insertVariableAt(targetIndex, item);
      } else if (monitor.getItemType() === ItemTypes.BLOCK) {
        console.log('[Prompt Lab] [EditorPanel] useDrop (container, fallback to end): Block dropped. Moving to end. Item:', item);
        moveBlock(item.index, targetIndex);
      }
    },
    collect: (monitor) => {
        const isOver = monitor.isOver({ shallow: true });
        const canDrop = monitor.canDrop();
        // Use the isDraggingSomething prop (from useDragLayer) for conditional logging
        if (isDraggingSomething) { 
             console.log(`[EditorPanel] DropContainer: isOver = ${isOver}, canDrop = ${canDrop}. ItemType: ${String(monitor.getItemType())}`);
        }
        return {
            isOverBlockContainer: isOver,
            canDropBlockContainer: canDrop,
        };
    },
  }), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething]); // isDraggingSomething is a dependency here for logging purposes


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
                        ${isOverBlockContainer && canDropBlockContainer && isDraggingSomething ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}`}
          >
            {blocks.length === 0 && !isDraggingSomething && (
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
            {blocks.map((b, i) => (
              // Removed React.Fragment here. The key goes to the BlockRenderer component itself.
              <BlockRenderer
                key={b.id} // Key on the component, not a Fragment.
                block={b}
                index={i}
                allBlocks={blocks}
                updateTextBlock={updateTextBlock}
                removeBlock={removeBlock}
                moveBlock={moveBlock}
                insertVariableAt={insertVariableAt}
                isDraggingSomething={isDraggingSomething}
                insertTextAt={insertTextAt}
              />
            ))}
            {/* The conditional "Add text block" is now correctly placed to only appear once at the very end */}
            {blocks.length > 0 && !isDraggingSomething && (
              <div className="flex justify-center mt-2">
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertTextAt(blocks.length)}
                      className="h-6 px-2 py-1 text-xs text-gray-700 bg-white hover:bg-gray-100 border border-gray-300"
                  >
                      <Plus className="mr-1 h-3 w-3" /> Add text block
                  </Button>
              </div>
            )}
            {blocks.length === 0 && isOverBlockContainer && canDropBlockContainer && isDraggingSomething && (
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
  isDraggingSomething,
  insertTextAt,
}: {
  block: Block
  index: number
  allBlocks: Block[];
  updateTextBlock: (id: string, value: string) => void
  removeBlock: (index: number) => void
  moveBlock: (from: number, to: number) => void
  insertVariableAt: (index: number, variable: { placeholder: string; id?: string; name?: string }) => void
  isDraggingSomething: boolean;
  insertTextAt: (index: number, text?: string) => void;
}) {
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null); // This is the main outermost wrapper
  const gripRef = useRef<HTMLDivElement | null>(null); // Dedicated ref for the grip handle of text blocks

  // Set up drag for the block
  const [{ isDragging, canDrag }, dragRef, preview] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: {
      id: block.id,
      index,
      type: block.type,
      value: block.type === 'text' ? block.value : block.placeholder,
      name: block.type === 'variable' ? block.name : undefined,
      originalBlock: block,
    },
    canDrag: (monitor) => {
      const result = true;
      // console.log(`[BlockRenderer ${block.type}:${block.id} (index ${index})] canDrag callback called. Returning: ${result}. monitor.getItem():`, monitor.getItem()?.id);
      return result;
    },
    collect: (m) => {
        const dragging = m.isDragging();
        const currentCanDrag = m.canDrag();
        console.log(`[BlockRenderer ${block.type}:${block.id} (index ${index})] Drag Collect: isDragging = ${dragging}, canDrag = ${currentCanDrag}`);
        return { isDragging: dragging, canDrag: currentCanDrag };
    },
  }), [block.id, index, block.type, block.value, block.placeholder, block.name]); // Explicit dependencies for stability

  // Use a stable useCallback for the ref functions
  const connectDragSource = useCallback((node: HTMLElement | null) => {
    // console.log(`[BlockRenderer ${block.type}:${block.id} (index ${index})] connectDragSource called. Node:`, node);
    dragRef(node); // Connects the node to react-dnd's drag source
    if (node) {
        // console.log(`[BlockRenderer ${block.type}:${block.id} (index ${index})] connectDragSource: dragRef connected to node (TAG: ${node.tagName}).`);
    } else {
        // console.log(`[BlockRenderer ${block.type}:${block.id} (index ${index})] connectDragSource: dragRef disconnected (node is null).`);
    }
  }, [dragRef, block.type, block.id, index]); // Dependencies for useCallback itself to ensure stability

  // Effect to hide browser drag image
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);


  const [localDropTargetPosition, setLocalDropTargetPosition] = useState<'before' | 'after' | null>(null);

  // Set up drop for the block
  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    hover(item: { id?: string; index?: number; placeholder?: string }, monitor) {
      if (!wrapperRef.current) {
        return;
      }
      if (!monitor.isOver({ shallow: true })) {
        if (localDropTargetPosition !== null) {
            setLocalDropTargetPosition(null);
        }
        return;
      }

      const hoverBoundingRect = wrapperRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      let newDropPosition: 'before' | 'after' | null = null;
      const draggingItemType = monitor.getItemType();

      // Avoid showing drop indicator if dragging self
      if (draggingItemType === ItemTypes.BLOCK && (item as { id: string }).id === block.id) {
        if (localDropTargetPosition !== null) {
            setLocalDropTargetPosition(null);
        }
        return;
      }

      if (draggingItemType === ItemTypes.BLOCK || draggingItemType === ItemTypes.VARIABLE) {
        newDropPosition = hoverClientY < hoverMiddleY ? 'before' : 'after';
      }

      if (localDropTargetPosition !== newDropPosition) {
        setLocalDropTargetPosition(newDropPosition);
      }
    },
    drop(item: any, monitor) {
      const dragItemType = monitor.getItemType();
      let targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

      setLocalDropTargetPosition(null); // Clear hover state on drop
      console.log(`[BlockRenderer ${block.id}] drop: Item type ${String(dragItemType)}, item ID: ${item.id}, localDropTargetPosition: ${localDropTargetPosition}, targetIndex: ${targetIndex}.`);

      if (monitor.didDrop()) {
        console.log(`[BlockRenderer ${block.id}] drop: Drop already handled by a child or earlier component. Exiting.`);
        return;
      }

      if (dragItemType === ItemTypes.VARIABLE) {
          console.log(`[BlockRenderer ${block.id}] drop: Variable ${item.placeholder} dropped. Calling insertVariableAt(${targetIndex}, ...)`);
          insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        // Determine if this is a "no-op" move (dropping onto self or immediately adjacent position)
        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && localDropTargetPosition === 'before') || // Dragging from N to N+1
                             (dragIndex === targetIndex + 1 && localDropTargetPosition === 'after'); // Dragging from N+1 to N (after N)
        
        console.log(`[BlockRenderer ${block.id}] drop: Block dropped. Drag index: ${dragIndex}, Target index: ${targetIndex}, localDropTargetPosition: ${localDropTargetPosition}, isNoRealMove: ${isNoRealMove}`);


        if (isNoRealMove) {
          console.log(`[BlockRenderer ${block.id}] drop: No real move detected for block ${item.id}. Exiting.`);
          return;
        }

        console.log(`[BlockRenderer ${block.id}] drop: Moving block from ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex; // Update the index of the dragged item for subsequent drops
      }
    },
    collect: (monitor) => {
        const isOverVal = monitor.isOver({ shallow: true });
        const canDropVal = monitor.canDrop();
        if (monitor.getItem()) { // Check if an item is currently being dragged
            console.log(`[BlockRenderer ${block.type}:${block.id} (index ${index})] Drop Collect: isOver = ${isOverVal}, canDrop = ${canDropVal}, itemType: ${String(monitor.getItemType())}`);
        }
        return {
            isOver: isOverVal,
            canDrop: canDropVal,
        };
    },
  }), [index, insertVariableAt, moveBlock, localDropTargetPosition, block.id, allBlocks.length]); // Added allBlocks.length to dependencies

  useEffect(() => {
    if (block.type === 'text' && contentEditableRef.current && contentEditableRef.current.innerText !== block.value) {
        if (document.activeElement !== contentEditableRef.current) {
            contentEditableRef.current.innerText = block.value;
        }
    }
  }, [block.type, block.value]);

  // Merge wrapperRef and dropRef for the main block container
  const blockRootRef = mergeRefs(wrapperRef, dropRef); 

  const showPlaceholderAbove = isOver && canDrop && localDropTargetPosition === 'before' && isDraggingSomething;
  const showPlaceholderBelow = isOver && canDrop && localDropTargetPosition === 'after' && isDraggingSomething;

  const commonClasses = `relative w-full rounded-md shadow-sm transition-all duration-100 ease-in-out`;

  if (block.type === 'variable') {
    return (
      <div
        key={`block-root-${block.id}`} // Explicit key for this root div to aid reconciliation
        ref={blockRootRef} // This is the drop target
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''}`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          ref={connectDragSource} // This inner div is the drag source for variables
          className={`cursor-grab flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md `}
        >
          <div className="text-sm font-medium">{block.name || block.placeholder}</div>
          <button
            onClick={() => {
                removeBlock(index);
            }}
            className="text-xs p-1 rounded-full text-blue-400 hover:bg-blue-100 hover:text-red-600 transition-colors"
            aria-label={`Remove variable ${block.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  } else {
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertTextAt(index + 1, '');
      }
      if (e.key === 'Backspace' && contentEditableRef.current?.innerText === '' && window.getSelection()?.anchorOffset === 0) {
          e.preventDefault();
          if (allBlocks.length === 1 && allBlocks[0].id === block.id) {
              updateTextBlock(block.id, ''); 
          } else {
              removeBlock(index);
          }
      }
    }

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      updateTextBlock(block.id, e.currentTarget.innerText);
    }

    const onBlur = () => {
      const text = contentEditableRef.current?.innerText ?? ''
      if (text === '' && allBlocks.length > 1) {
          removeBlock(index);
      } else {
        updateTextBlock(block.id, text);
      }
    }

    return (
      <div
        key={`block-root-${block.id}`} // Explicit key for this root div to aid reconciliation
        ref={blockRootRef} // This is the drop target
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''}`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`relative p-2 bg-white border border-gray-300 rounded-md flex items-center group`}
        >
            <div
              ref={connectDragSource} // This is the drag handle for text blocks
              className="cursor-grab text-gray-400 hover:text-gray-600 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', padding: '4px' }}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div
                contentEditable
                suppressContentEditableWarning
                onKeyDown={onKeyDown}
                onInput={onInput}
                onBlur={onBlur}
                className="flex-1 min-h-[40px] text-sm outline-none w-full whitespace-pre-wrap"
                ref={contentEditableRef}
            >
                {/* Initial content comes from state, then managed by onInput */}
            </div>
            {(allBlocks.length > 1) || (block.type === 'text' && block.value !== '') ? (
                <button
                    onClick={() => {
                        removeBlock(index);
                    }}
                    className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity"
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

const getEmptyImage = () => {
    if (typeof window === 'undefined') return new Image();
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    return img;
};


// NEW: HoverAddTextBlock component for interstitial "Add text" buttons
function HoverAddTextBlock({
  index,
  insertTextAt,
  isDraggingSomething,
}: {
  index: number;
  insertTextAt: (index: number, text?: string) => void;
  isDraggingSomething: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false);

  if (isDraggingSomething) {
    return null; // Don't show while dragging
  }

  return (
    <div
      key={`hover-add-text-${index}`} // Explicit key for consistency if this also gets mapped
      className="relative h-6 w-full flex justify-center items-center py-1 transition-all duration-100 ease-in-out group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`absolute top-0 w-full h-full bg-transparent transition-all duration-100 ease-in-out
                      ${isHovering ? 'bg-gray-100/50' : 'bg-transparent'}`}></div>

      {isHovering && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            insertTextAt(index);
            setIsHovering(false);
          }}
          className="relative z-10 h-6 px-2 py-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-100 ease-in-out transform scale-90 group-hover:scale-100"
        >
          <Text className="mr-1 h-3 w-3" /> Add text
        </Button>
      )}
    </div>
  );
}


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

  const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999,
    left: 0,
    top: 0,
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
        const blockItem = item as { originalBlock: Block };
        const blockToRender = blockItem.originalBlock;

        if (blockToRender.type === 'variable') {
          return (
            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md shadow-md opacity-90">
              <div className="text-sm font-medium">{blockToRender.name || blockToRender.placeholder}</div>
            </div>
          );
        } else { // Text block
          return (
            <div className="relative p-2 bg-white border border-gray-300 rounded-md flex items-center shadow-md opacity-90">
              <div
                  className="flex-1 min-h-[40px] text-sm w-full whitespace-pre-wrap"
                  style={{ minWidth: '100px', maxWidth: '300px' }}
              >
                  {blockToRender.value.substring(0, Math.min(blockToRender.value.length, 100)) + (blockToRender.value.length > 100 ? '...' : '')}
              </div>
            </div>
          );
        }
      case '__NATIVE_HTML__':
        return (
            <div className="bg-red-200 border border-red-400 rounded-md px-3 py-1 shadow-md opacity-90">
                <span className="font-semibold text-red-800">Dragging HTML Element</span>
                <span className="text-xs text-red-700 ml-2">(Native Drag)</span>
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

function VersionsPanel({
  versions,
  selectedVersionId
}: {
  versions: Version[]
  selectedVersionId: string | null
}) {
  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  if (!selectedVersion) {
    console.log('[Prompt Lab] [VersionsPanel] No version selected.');
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        No version selected. Select a version from the list on the left.
      </div>
    );
  }
  console.log(`[Prompt Lab] [VersionsPanel] Displaying details for version: ${selectedVersion.id}`);
  return (
    <div className="flex h-full min-h-0 flex-col p-4">
        <h3 className="font-semibold text-lg mb-2">{selectedVersion.notes}</h3>
        <p className="text-sm text-gray-500 mb-4">Last Edited: {new Date(selectedVersion.createdAt).toLocaleString()}</p>

        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Version Details / Notes</label>
            <Textarea
                readOnly
                value={selectedVersion.notes}
                rows={4}
                className="overflow-y-auto"
                placeholder="No details available for this version."
            />
        </div>
    </div>
  )
}
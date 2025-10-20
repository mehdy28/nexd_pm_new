// components/prompt-lab/prompt-lab.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { PromptVariableType, type Prompt, type Version, type PromptVariable, type PromptVariableSource } from '@/components/prompt-lab/store';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, RotateCcw, Plus, GitCommit, Text, Trash2, GripVertical, Loader2 } from "lucide-react"
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { VariableDiscoveryBuilder } from "./variable-discovery-builder"
import { usePromptLab } from "@/hooks/usePrompts";
import { toast } from 'sonner';
import { useQuery } from '@apollo/client';
import { RESOLVE_PROMPT_VARIABLE_QUERY } from '@/graphql/queries/promptRelatedQueries';
import { useDebounce } from 'use-debounce';


// Utility for deep comparison of arrays of objects (used in EditorPanel's useEffect)
function deepCompareBlocks(arr1: Block[], arr2: Block[]): boolean {
  if (arr1.length !== arr2.length) {
    console.log('[deepCompareBlocks] Different lengths: ', arr1.length, arr2.length);
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    const b1 = arr1[i];
    const b2 = arr2[i];
    if (b1.type !== b2.type) {
      console.log(`[deepCompareBlocks] Block ${i}: Different types`, b1.type, b2.type);
      return false;
    }
    if (b1.type === 'text') {
      if (b1.value !== b2.value) {
        console.log(`[deepCompareBlocks] Block ${i} (text): Different values`, b1.value, b2.value);
        return false;
      }
    } else if (b1.type === 'variable') {
      if (b1.varId !== b2.varId || b1.placeholder !== b2.placeholder || b1.name !== b2.name) {
        console.log(`[deepCompareBlocks] Block ${i} (variable): Different identity`, {b1_varId: b1.varId, b1_ph: b1.placeholder, b1_name: b1.name}, {b2_varId: b2.varId, b2_ph: b2.placeholder, b2_name: b2.name});
        return false;
      }
    }
  }
  console.log('[deepCompareBlocks] Blocks are semantically identical.');
  return true;
}

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

// Helper to generate a client-side CUID for embedded JSON objects (variables, versions)
function cuid(prefix: string = ''): string { // Added prefix for debugging
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
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

    if (variable.source && (!variableValues[variable.placeholder] || variableValues[variable.placeholder] === 'N/A')) {
       valueToSubstitute = `[${variable.name} (dynamic)]`;
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
export function PromptLab({ prompt, onBack, projectId, loadingDetails }: { prompt: Prompt; onBack: () => void; projectId?: string; loadingDetails: boolean; }) { // <--- NEW: loadingDetails prop
  const { updatePrompt, snapshotPrompt, restorePromptVersion } = usePromptLab(projectId); 

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables")
  const [showVariableBuilder, setShowVariableBuilder] = useState(false);
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})
  const [renderedPreview, setRenderedPreview] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);


  useEffect(() => {
    console.log('[PromptLab] Root useEffect: prompt prop changed. Prompt ID:', prompt.id, 'Title:', prompt.title, 'Content length:', prompt.content.length);
    if (loadingDetails) {
      console.log('[PromptLab] Root useEffect: loadingDetails is true, skipping state updates for prompt data until details are loaded.');
      return; // Skip updating local states if details are still loading
    }

    if (prompt) {
      if (prompt.versions.length > 0) {
        if (!selectedVersionId || !prompt.versions.some((v) => v.id === selectedVersionId)) {
          console.log('[PromptLab] Selecting latest version:', prompt.versions[0].id);
          setSelectedVersionId(prompt.versions[0].id)
        }
      } else if (selectedVersionId) {
        console.log('[PromptLab] No versions, deselecting version.');
        setSelectedVersionId(null)
      }
      
      const initialPreviewValues: Record<string, string> = {};
      prompt.variables.forEach(v => {
        if (!v.source) {
          initialPreviewValues[v.placeholder] = v.defaultValue || '';
        } else {
          initialPreviewValues[v.placeholder] = `[${v.name} (dynamic)]`;
        }
      });
      console.log('[PromptLab] Updating previewVariableValues based on prompt.variables:', prompt.variables.length, 'variables found.');
      setPreviewVariableValues(initialPreviewValues);
    }
  }, [prompt, selectedVersionId, loadingDetails]); // Add loadingDetails to dependencies


  useEffect(() => {
    if (loadingDetails) {
      console.log('[PromptLab] Root useEffect (preview): loadingDetails is true, skipping preview generation.');
      setRenderedPreview("Loading preview..."); // Optional: show a loading message for preview
      return;
    }
    if (prompt) {
      console.log('[PromptLab] Root useEffect: Generating preview based on prompt and previewVariableValues.');
      const generatePreview = async () => {
        const preview = await renderPrompt(prompt.content, prompt.context || '', prompt.variables, previewVariableValues, projectId);
        setRenderedPreview(preview);
      };
      generatePreview();
    }
  }, [prompt, previewVariableValues, projectId, loadingDetails]); // Add loadingDetails to dependencies


  const selectedVersion = useMemo(() => prompt?.versions.find((v) => v.id === selectedVersionId) || null, [prompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const handleUpdatePrompt = useCallback((patch: Partial<Prompt>) => {
    console.log('[PromptLab] handleUpdatePrompt called with patch:', patch);
    if (patch.variables) {
      patch.variables = patch.variables.map(v => ({...v, id: v.id || cuid('patch-var-')})) as PromptVariable[];
      console.log('[PromptLab] handleUpdatePrompt: Variables patched, new count:', patch.variables.length);
    }
    updatePrompt(prompt.id, patch);
  }, [prompt.id, updatePrompt]);

  const handleSnapshot = useCallback(async (notes?: string) => {
    setIsSnapshotting(true);
    console.log('[PromptLab] handleSnapshot: Attempting to snapshot prompt', prompt.id, 'with notes:', notes);
    try {
      await snapshotPrompt(prompt.id, notes);
      toast.success("Prompt version saved!");
      setPendingNotes('');
    } catch (error) {
      console.error(`Failed to snapshot prompt ${prompt.id}:`, error);
      toast.error("Failed to save version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsSnapshotting(false);
      console.log('[PromptLab] handleSnapshot: Snapshot operation finished.');
    }
  }, [prompt.id, snapshotPrompt]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    setIsRestoring(true);
    console.log('[PromptLab] handleRestoreVersion: Attempting to restore prompt', prompt.id, 'from version', versionId);
    try {
      await restorePromptVersion(prompt.id, versionId);
      toast.success("Prompt restored from version!");
    } catch (error) {
      console.error(`Failed to restore prompt ${prompt.id} from version ${versionId}:`, error);
      toast.error("Failed to restore version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsRestoring(false);
      console.log('[PromptLab] handleRestoreVersion: Restore operation finished.');
    }
  }, [prompt.id, restorePromptVersion]);

  const handleCreateVariable = useCallback((newVariable: Omit<PromptVariable, 'id'>) => {
    console.log('[PromptLab] handleCreateVariable: Creating new variable:', newVariable.name);
    const variableWithId: PromptVariable = {
      ...newVariable,
      id: cuid('p-var-'),
    };
    const updatedVariables = [...prompt.variables, variableWithId];
    console.log('[PromptLab] handleCreateVariable: Calling handleUpdatePrompt with updated variables count:', updatedVariables.length);
    handleUpdatePrompt({ variables: updatedVariables });
    setShowVariableBuilder(false);
  }, [prompt.variables, handleUpdatePrompt]);

  const handleRemoveVariable = useCallback((variableId: string) => {
    console.log('[PromptLab] handleRemoveVariable: Removing variable with ID:', variableId);
    const updatedVariables = prompt.variables.filter(v => v.id !== variableId);
    console.log('[PromptLab] handleRemoveVariable: Calling handleUpdatePrompt with updated variables count:', updatedVariables.length);
    handleUpdatePrompt({ variables: updatedVariables });
  }, [prompt.variables, handleUpdatePrompt]);


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
                    console.log('[PromptLab] Left Tab changed to:', index === 0 ? "Versions" : "Variables");
                }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <div className="border-b flex flex-col pt-4 pb-2 px-3" style={{ borderColor: "var(--border)" }}>
                  <Button variant="ghost" onClick={onBack} className="mb-2 self-start text-sm px-2 -ml-2">Back to Prompt Library</Button>
                  <Tab.List className="flex h-11 bg-transparent">
                    <Tab className="px-3 py-2 ui-selected:border-b-2 ui-selected:font-semibold">Versions</Tab>
                    <Tab className="px-3 py-2 ui-selected:border-b-2 ui-selected:font-semibold">Variables</Tab>
                  </Tab.List>
                </div>

                <Tab.Panels className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                  {/* Versions tab */}
                  <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                    {loadingDetails ? ( // <--- Conditional rendering for loading
                        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="mt-2">Loading versions...</p>
                        </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 border-b p-3"
                         style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}
                         >
                          <h3 className="font-semibold">Versions</h3>
                          <Button className="ml-auto h-9 btn-primary" onClick={() => handleSnapshot(pendingNotes || 'New version')} disabled={isSnapshotting}>
                            {isSnapshotting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} New
                          </Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-3">
                          {prompt.versions.length === 0 ? (
                            <div className="text-sm text-slate-500">No versions yet. Make changes and save a snapshot to create one.</div>
                          ) : (
                            <ul className="space-y-2">
                              {prompt.versions.map((v) => (
                                <li key={v.id} className="rounded-lg border p-3 hover:bg-slate-50 transition">
                                  <div className="flex items-start gap-2">
                                    <button className="flex-1 text-left" onClick={() => setSelectedVersionId(v.id)} title={v.notes}>
                                      <div className={`line-clamp-1 text-sm font-medium ${selectedVersionId === v.id ? 'font-bold' : ''}`}>{v.notes}</div>
                                      <div className="mt-1 text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
                                    </button>
                                    {selectedVersionId !== v.id && (
                                      <Button variant="ghost" size="sm" onClick={() => handleRestoreVersion(v.id)} className="h-7 px-2" disabled={isRestoring}>
                                         {isRestoring ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : 'Restore'}
                                      </Button>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </Tab.Panel>

                  {/* Variables tab */}
                  <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                    {loadingDetails ? ( // <--- Conditional rendering for loading
                        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="mt-2">Loading variables...</p>
                        </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2 border-b p-3" style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}>
                          <h3 className="font-semibold">Variables</h3>
                          <Button className="w-full h-9 btn-primary" onClick={() => {
                            console.log('[PromptLab] Variables tab: Create New Variable button clicked.');
                            setShowVariableBuilder(true);
                          }}>
                            <Plus className="mr-1 h-4 w-4" /> Create New Variable
                          </Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-3">
                          {prompt.variables.length === 0 ? (
                            <div className="text-sm text-slate-500">No variables yet. Click "Create New Variable" to get started.</div>
                          ) : (
                            <ul className="space-y-2">
                              {prompt.variables.map((v) => (
                                <VariableItem key={v.id} variable={v} onRemove={handleRemoveVariable} />
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>

            {/* Right side */}
            <div className="saas-card h-full min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Tabs value={rightTab} onValueChange={(v) => {
                    setRightTab(v as any);
                    console.log('[PromptLab] Right Tab changed to:', v);
                }} className="flex h-full flex-col">
                  <div className="border-b" style={{ borderColor: "var(--border)" }}>
                    <TabsList className="h-11 bg-transparent">
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                      <TabsTrigger value="version-details">Version Details</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {loadingDetails ? ( // <--- Conditional rendering for loading
                        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="mt-2">Loading prompt content...</p>
                        </div>
                    ) : (
                      <>
                        <TabsContent value="editor" className="m-0 outline-none flex-1 overflow-y-auto">
                          <EditorPanel
                              prompt={prompt} // Pass the fully detailed prompt from usePromptLab
                              onUpdate={handleUpdatePrompt}
                              onSnapshot={handleSnapshot}
                              pendingNotes={pendingNotes}
                              setPendingNotes={setPendingNotes}
                              isSnapshotting={isSnapshotting}
                              loadingDetails={loadingDetails} // Pass loadingDetails to EditorPanel
                            />
                        </TabsContent>

                        {/* Version Details Panel */}
                        <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                          <VersionsPanel
                            versions={prompt.versions || []}
                            selectedVersionId={selectedVersionId}
                            onSelectVersion={setSelectedVersionId}
                            onRestoreVersion={handleRestoreVersion}
                            isRestoring={isRestoring}
                          />
                        </TabsContent>

                        {/* Preview Section */}
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
                            style={{ background: '#f8f8f8', color: '#333', borderColor: '#e0e0e0', lineHeight: '1.5' }}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Note: Text wrapped in `[[...]]` indicates a substituted variable.
                          </p>
                        </TabsContent>
                      </>
                    )}
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

function VariableItem({ variable, onRemove }: { variable: PromptVariable; onRemove: (id: string) => void }) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.VARIABLE,
    item: { id: variable.id, placeholder: variable.placeholder, name: variable.name },
    collect: (monitor) => {
      const dragging = monitor.isDragging();
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
    }
  }, [drag, preview, variable.id, variable.name]);

  return (
    <div
      id={variable.id + '-drag-source'}
      className={`cursor-grab rounded px-2 py-1 mb-2 border ${
        isDragging ? 'opacity-0' : 'bg-gray-100'
      } flex items-center justify-between group`}
    >
      <div>
        <span className="font-semibold">{variable.name}</span>
        <span className="text-xs text-gray-500 ml-2">({variable.placeholder})</span>
      </div>
      <button
        onClick={() => onRemove(variable.id)}
        className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity opacity-0 group-hover:opacity-100"
        aria-label={`Remove variable ${variable.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}


/* ---------- BLOCK-BASED EDITOR ---------- */

type Block =
  | { type: 'text'; id: string; value: string }
  | { type: 'variable'; id: string; varId: string; placeholder: string; name: string }

function parseContentToBlocks(content: string, variables: PromptVariable[], prevBlocks: Block[] = []): Block[] {
  console.log('[parseContentToBlocks] Starting parse. Content length:', content.length, 'Variables count:', variables.length, 'Prev blocks count:', prevBlocks.length);
  const sortedVariables = variables.length > 0
    ? variables.sort((a, b) => b.placeholder.length - a.placeholder.length)
    : [];
  const placeholders = sortedVariables.map(v => v.placeholder);

  let tempBlocks: Block[] = [];
  let prevBlockMap = new Map<string, Block>();

  prevBlocks.forEach(block => {
    if (block.type === 'text') {
      prevBlockMap.set(`text-${block.value}`, block);
    } else {
      prevBlockMap.set(`variable-${block.varId}-${block.placeholder}`, block);
    }
  });


  if (placeholders.length > 0) {
    const escaped = placeholders.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const re = new RegExp(`(${escaped})`, 'g');
    const parts = content.split(re);
    let currentText = '';

    parts.forEach((part) => {
      const matchedVar = sortedVariables.find(v => v.placeholder === part);
      if (matchedVar) {
        if (currentText !== '') {
          const textBlockKey = `text-${currentText}`;
          const existingTextBlock = prevBlockMap.get(textBlockKey);
          tempBlocks.push({ type: 'text', id: existingTextBlock?.id || cuid('t-'), value: currentText });
          currentText = '';
        }
        const varBlockKey = `variable-${matchedVar.id}-${matchedVar.placeholder}`;
        const existingVarBlock = prevBlockMap.get(varBlockKey);
        tempBlocks.push({ type: 'variable', id: existingVarBlock?.id || cuid('v-'), varId: matchedVar.id, placeholder: matchedVar.placeholder, name: matchedVar.name });
      } else {
        currentText += part;
      }
    });
    if (currentText !== '') { // Add any remaining text
      const textBlockKey = `text-${currentText}`;
      const existingTextBlock = prevBlockMap.get(textBlockKey);
      tempBlocks.push({ type: 'text', id: existingTextBlock?.id || cuid('t-'), value: currentText });
    }
  } else {
    // No variables, treat content as a single text block
    if (content !== '') {
      const textBlockKey = `text-${content}`;
      const existingTextBlock = prevBlockMap.get(textBlockKey);
      tempBlocks.push({ type: 'text', id: existingTextBlock?.id || cuid('t-'), value: content });
    }
  }

  // --- Post-processing for empty/redundant blocks ---
  let finalBlocks: Block[] = [];
  tempBlocks.forEach((block, idx) => {
    // Only remove genuinely empty text blocks if they are not the sole block
    // or if they are not at the very beginning/end of a multi-block sequence
    if (block.type === 'text' && block.value === '') {
      // If it's the only block, keep it to allow typing
      if (tempBlocks.length === 1) {
        finalBlocks.push(block);
        return;
      }
      // If it's between two non-empty blocks, or if it's at the start/end and there are other blocks, remove it
      // This logic is tricky. A simpler approach: only keep truly necessary empty blocks.
      // Let's ensure at least one empty text block if all else is removed.
      return; // Filter out empty text blocks initially, then handle fallback later.
    }
    finalBlocks.push(block);
  });
  
  // If after filtering, no blocks or only variables remain, ensure there's at least one editable text block
  if (finalBlocks.length === 0 || (finalBlocks.every(b => b.type === 'variable'))) {
    console.log('[parseContentToBlocks] Fallback: Adding initial empty text block.');
    finalBlocks.push({ type: 'text', id: cuid('t-initial-empty-fallback'), value: '' });
  }
  
  // Consolidate adjacent text blocks (optional but good for cleanup)
  const consolidatedBlocks: Block[] = [];
  if (finalBlocks.length > 0) {
      consolidatedBlocks.push(finalBlocks[0]);
      for (let i = 1; i < finalBlocks.length; i++) {
          const current = finalBlocks[i];
          const previous = consolidatedBlocks[consolidatedBlocks.length - 1];
          if (current.type === 'text' && previous.type === 'text') {
              (previous as { value: string }).value += current.value;
          } else {
              consolidatedBlocks.push(current);
          }
      }
  }

  console.log('[parseContentToBlocks] Parse finished. Final blocks count:', consolidatedBlocks.length, 'Example ID:', consolidatedBlocks[0]?.id);
  return consolidatedBlocks;
}


function serializeBlocks(blocks: Block[]): string {
  const serialized = blocks
    .filter(b => !(b.type === 'text' && b.value === '')) // Do not serialize empty text blocks
    .map(b => b.type === 'text' ? b.value : b.placeholder)
    .join('');
  
  return serialized;
}


/* ---------- EditorPanel: Enhanced Prompt Creation ---------- */
function EditorPanel({
  prompt,
  onUpdate,
  onSnapshot,
  pendingNotes,
  setPendingNotes,
  isSnapshotting,
  loadingDetails, // NEW: Receive loadingDetails prop
}: {
  prompt: Prompt
  onUpdate: (patch: Partial<Prompt>) => void
  onSnapshot: (notes?: string) => void
  pendingNotes: string;
  setPendingNotes: (notes: string) => void;
  isSnapshotting: boolean;
  loadingDetails: boolean; // NEW: Prop
}) {
  console.log(`[EditorPanel ${prompt.id}] Rendered with prompt ID: ${prompt.id}, Title: "${prompt.title}", Content length: ${prompt.content.length}`);

  // Use separate local states for each editable field in the EditorPanel
  const [localTitle, setLocalTitle] = useState(prompt.title);
  const [localContext, setLocalContext] = useState(prompt.context);
  const [localModel, setLocalModel] = useState(prompt.model);
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Refs to track if a field is actively being edited, to prevent external updates overwriting user input
  const isTitleEditing = useRef(false);
  const isContextEditing = useRef(false);
  // No need for content editing ref, as blocks are managed differently

  // Initialize all local states when prompt.id changes
  // This ensures a clean reset when switching prompts
  useEffect(() => {
    console.log(`[EditorPanel ${prompt.id}] useEffect (prompt.id change): Initializing/Resetting all local states.`);
    // NEW: Only initialize if details are not loading
    if (!loadingDetails) {
      setLocalTitle(prompt.title);
      setLocalContext(prompt.context);
      setLocalModel(prompt.model);
      setBlocks(parseContentToBlocks(prompt.content || '', prompt.variables || []));
      setPendingNotes('');
    } else {
      console.log(`[EditorPanel ${prompt.id}] useEffect (prompt.id change): loadingDetails is true, skipping initialization.`);
    }
  }, [prompt.id, loadingDetails]); // Add loadingDetails to dependencies

  // Sync local states with prompt prop when prompt prop changes, but ONLY if not actively editing
  useEffect(() => {
    console.log(`[EditorPanel ${prompt.id}] useEffect (prompt prop change): Syncing local states with prop if not editing.`);
    // NEW: Skip syncing if details are loading
    if (loadingDetails) {
      console.log(`[EditorPanel ${prompt.id}] useEffect (prompt prop change): loadingDetails is true, skipping prop sync.`);
      return;
    }

    // Compare against prop, not `localTitle` in the dependency array
    if (!isTitleEditing.current && localTitle !== prompt.title) {
      console.log(`[EditorPanel ${prompt.id}] Syncing localTitle: "${localTitle}" -> "${prompt.title}"`);
      setLocalTitle(prompt.title);
    }
    if (!isContextEditing.current && localContext !== prompt.context) {
      console.log(`[EditorPanel ${prompt.id}] Syncing localContext: "${localContext}" -> "${prompt.context}"`);
      setLocalContext(prompt.context);
    }
    // Model select doesn't have an active editing state, always sync if different
    if (localModel !== prompt.model) {
      console.log(`[EditorPanel ${prompt.id}] Syncing localModel: "${localModel}" -> "${prompt.model}"`);
      setLocalModel(prompt.model);
    }

    // A more direct fix: only re-parse if `prompt.content` is different from the blocks' *current* representation
    // AND the debounced patch has been sent (implying local user input should be mirrored in `prompt.content`).
    // This is problematic. The simplest approach (and often most stable) is:
    // `blocks` is derived *only* from `prompt.content` and `prompt.variables` on `prompt.id` change.
    // Any user input directly updates `blocks`.
    // Then, `serializedContent` derived from `blocks` is sent via `onUpdate`.
    // When `onUpdate` is successful, `prompt.content` will update, and the *next time* this effect runs
    // (if it runs for content/variable changes), it should see the updated `prompt.content`.

    // The current problem is `prompt.content` is remaining empty.
    // The previous fix to `usePrompts.ts` (preserving content in updatePromptMutation.onCompleted)
    // should ideally ensure `prompt.content` is NOT empty after a successful update.
    // If it *is* empty, then the backend is sending empty `content` in its mutation response.

    // Let's try to make this `useEffect` react ONLY to changes in `prompt.content` or `prompt.variables`
    // that are *not* yet reflected in the local `blocks` state, without relying on `prompt.id` directly.
    
    // Instead of deepCompareBlocks, compare serialized forms to avoid re-parsing overhead if same.
    const newContentFromProps = prompt.content || '';
    const currentBlocksSerialized = serializeBlocks(blocks);

    if (newContentFromProps !== currentBlocksSerialized || !deepCompareVariables(prompt.variables, blocks)) {
      console.log(`[EditorPanel ${prompt.id}] useEffect (content/variables change): Mismatch or update detected. Re-parsing blocks.`);
      const newBlocks = parseContentToBlocks(newContentFromProps, prompt.variables || [], blocks);
      if (!deepCompareBlocks(blocks, newBlocks)) {
         setBlocks(newBlocks);
      }
    } else {
      console.log(`[EditorPanel ${prompt.id}] useEffect (content/variables change): Blocks are in sync with props. No state update needed.`);
    }
  }, [
      prompt.content, prompt.variables, prompt.id, // Primary triggers for re-sync
      blocks, // Required for `serializeBlocks` and `deepCompareBlocks`
      loadingDetails, // NEW: Add loadingDetails to dependencies
      // removed localTitle, localContext, localModel as they are handled in their own if-conditions
  ]);

  // Helper for deep comparison of variables in blocks
  const deepCompareVariables = useCallback((propVars: PromptVariable[], currentBlocks: Block[]): boolean => {
      const currentBlockVars = currentBlocks
          .filter((b): b is Extract<Block, { type: 'variable' }> => b.type === 'variable')
          .map(b => ({ id: b.varId, placeholder: b.placeholder, name: b.name }));
      
      if (propVars.length !== currentBlockVars.length) return false;

      // Simplistic comparison: check if all propVars exist in currentBlockVars
      // and vice-versa, by their unique identifiers (varId/placeholder).
      // A more robust check might involve mapping to varIds and sorting.
      const propVarMap = new Map(propVars.map(v => [v.id, v.placeholder]));
      const currentBlockVarMap = new Map(currentBlockVars.map(v => [v.id, v.placeholder]));

      if (propVarMap.size !== currentBlockVarMap.size) return false;

      for (const [id, placeholder] of propVarMap.entries()) {
          if (currentBlockVarMap.get(id) !== placeholder) return false;
      }
      return true;
  }, []);

  const logBlocks = useCallback((message: string, currentBlocks: Block[]) => {
    const formattedBlocks = currentBlocks.map(b =>
      b.type === 'text' ? `[TEXT:"${b.value.substring(0, Math.min(b.value.length, 30))}..."] (id:${b.id})` : `[VAR:${b.name || b.placeholder} (varId: ${b.varId}, id:${b.id})]`
    ).join(' | ');
    console.log(`[EditorPanel ${prompt.id}] --- BLOCKS STATE UPDATE --- ${message}\nCURRENT BLOCKS: ${formattedBlocks}`);
  }, [prompt.id]);

  // Debounce the content update to the backend
  const serializedContent = useMemo(() => serializeBlocks(blocks), [blocks]);
  // Removed separate debouncedSerializedContent, using combined debouncedPatch

  // Combine all local states that need to be sent in a single patch
  const currentLocalStateForPatch = useMemo(() => ({
    title: localTitle,
    context: localContext,
    model: localModel,
    content: serializedContent, // Use the directly serialized content
    // Note: variables are handled by direct calls to handleUpdatePrompt from PromptLab component
    // If EditorPanel were to edit variables, they would need to be included here too.
  }), [localTitle, localContext, localModel, serializedContent]);

  // Debounce all updates together
  const [debouncedPatch] = useDebounce(currentLocalStateForPatch, 500);

  // Effect to send the debounced comprehensive patch
  useEffect(() => {
    console.log(`[EditorPanel ${prompt.id}] useEffect: debouncedPatch changed.`);
    // Compare each field to `prompt` prop to avoid unnecessary updates
    const hasChanges = (debouncedPatch.title !== prompt.title) ||
                       (debouncedPatch.context !== prompt.context) ||
                       (debouncedPatch.model !== prompt.model) ||
                       (debouncedPatch.content !== prompt.content);

    // NEW: Do not send updates if loadingDetails is true, as prompt prop is not yet fully loaded
    if (loadingDetails) {
      console.log(`[EditorPanel ${prompt.id}] useEffect: loadingDetails is true, skipping debounced patch send.`);
      return;
    }

    if (hasChanges) {
      console.log(`[EditorPanel ${prompt.id}] useEffect: Debounced patch differs from prop. Calling onUpdate with full patch:`, debouncedPatch);
      // Ensure we don't send null/empty title if it's the default "Untitled Prompt"
      const patchToSend = {
          ...debouncedPatch,
          title: debouncedPatch.title || "Untitled Prompt" // Ensure title is never sent as null
      };
      onUpdate(patchToSend);
    } else {
      console.log(`[EditorPanel ${prompt.id}] useEffect: Debounced patch matches prop. No onUpdate needed.`);
    }
  }, [debouncedPatch, onUpdate, prompt.title, prompt.context, prompt.model, prompt.content, prompt.id, loadingDetails]); // All relevant dependencies, including loadingDetails


  const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id: string; name: string }) => {
    setBlocks(prev => {
      let copy = [...prev];
      const newVarBlock: Block = { type: 'variable', id: cuid('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name };
      
      copy.splice(index, 0, newVarBlock);
      logBlocks(`After directly inserting variable "${variable.placeholder}" at index ${index}`, copy);
      return copy;
    });
  }, [logBlocks]);


  const insertTextAt = useCallback((index: number, text = '') => {
    setBlocks(prev => {
      let copy = [...prev];
      const newBlock: Block = { type: 'text', id: cuid('t-'), value: text }

      copy.splice(index, 0, newBlock)
      logBlocks(`After directly inserting text block at index ${index}`, copy);
      return copy
    })
  }, [logBlocks]);

  const updateTextBlock = useCallback((id: string, value: string) => {
    console.log(`[EditorPanel ${prompt.id}] updateTextBlock called for block ID: ${id}, new value: "${value}". Propagating to blocks state.`);
    setBlocks(prev => {
        let updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        
        if (value === '' && prev.length > 1) {
             console.log(`[EditorPanel ${prompt.id}] updateTextBlock: Removing empty text block ${id} as there are other blocks.`);
             updated = updated.filter(b => !(b.type === 'text' && b.id === id && b.value === ''));
             if (updated.length === 0) {
                console.log('[EditorPanel] updateTextBlock: All blocks removed, adding empty fallback.');
                updated.push({ type: 'text', id: cuid('t-empty-fallback-after-update'), value: '' });
            }
        } else if (updated.length === 0) {
            console.log('[EditorPanel] updateTextBlock: All blocks removed, adding empty fallback (edge case).');
            updated.push({ type: 'text', id: cuid('t-empty-fallback-after-update'), value: '' });
        }


        logBlocks(`After updating text block ${id} to "${value.substring(0, Math.min(value.length, 30))}..."`, updated);
        return updated;
    });
  }, [logBlocks, prompt.id]);

  const removeBlock = useCallback((index: number) => {
    console.log(`[EditorPanel ${prompt.id}] removeBlock called for index: ${index}`);
    setBlocks(prev => {
      let copy = [...prev];
      if (index < 0 || index >= copy.length) {
          console.warn(`[EditorPanel ${prompt.id}] removeBlock: Invalid index ${index}.`);
          return prev;
      }

      const removedBlock = copy[index];
      copy.splice(index, 1); 
      console.log(`[EditorPanel ${prompt.id}] removeBlock: Removed block of type ${removedBlock.type} with ID ${removedBlock.id}.`);
      
      if (copy.length === 0) {
        console.log('[EditorPanel] removeBlock: No blocks left, adding empty fallback.');
        copy.push({ type: 'text', id: cuid('t-empty-after-remove'), value: '' });
      }

      logBlocks(`After removing block at index ${index}`, copy);
      return copy
    })
  }, [logBlocks, prompt.id]);

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[EditorPanel ${prompt.id}] moveBlock called from index: ${from} to index: ${to}`);
    setBlocks(prev => {
      let copy = [...prev];
      if (from < 0 || from >= copy.length || to < 0 || to > copy.length) {
          console.warn(`[EditorPanel ${prompt.id}] moveBlock: Invalid indices from ${from} to ${to}.`);
          return prev;
      }

      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);

      logBlocks(`After moving block from ${from} to ${to}`, copy);
      return copy;
    });
  }, [logBlocks, prompt.id]);

  const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const [{ isOverBlockContainer, canDropBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    drop: (item: any, monitor) => {
      if (monitor.didDrop()) {
        console.log('[EditorPanel][Drop] Drop handled by a nested target, ignoring.');
        return;
      }
      console.log(`[EditorPanel ${prompt.id}][Drop] Item dropped into container.`, item);

      let targetIndex = blocks.length;
      if (blocks.length === 0) {
        targetIndex = 0;
      }

      if (monitor.getItemType() === ItemTypes.VARIABLE) {
        console.log(`[EditorPanel ${prompt.id}][Drop] Inserting variable at index ${targetIndex}.`);
        insertVariableAt(targetIndex, item);
      } else if (monitor.getItemType() === ItemTypes.BLOCK) {
        const dragIndex = item.index;
        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && dragIndex < targetIndex) ||
                             (dragIndex === targetIndex + 1 && targetIndex < dragIndex);

        if (isNoRealMove) {
          console.log('[EditorPanel][Drop] No real move detected, ignoring block drop.');
          return;
        }

        console.log(`[EditorPanel ${prompt.id}][Drop] Moving block from ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex;
      }
    },
    collect: (monitor) => {
        const isOver = monitor.isOver({ shallow: true });
        const canDrop = monitor.canDrop();
        return {
            isOverBlockContainer: isOver,
            canDropBlockContainer: canDrop,
        };
    },
  }), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething, prompt.id]);


  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="saas-section-header rounded-t-lg">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={localTitle}
            onChange={(e) => {
              console.log(`[EditorPanel ${prompt.id}] Title input changed (local state):`, e.target.value);
              setLocalTitle(e.target.value);
            }}
            onFocus={() => { isTitleEditing.current = true; console.log('[EditorPanel] isTitleEditing: true'); }}
            onBlur={() => { isTitleEditing.current = false; console.log('[EditorPanel] isTitleEditing: false'); }}
            className="h-10 text-sm font-medium"
            placeholder="Prompt title"
          />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={localModel}
            onChange={(e) => {
              console.log(`[EditorPanel ${prompt.id}] Model select changed (local state):`, e.target.value);
              setLocalModel(e.target.value);
            }}
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
            value={localContext}
            onChange={(e) => {
              console.log(`[EditorPanel ${prompt.id}] Context textarea changed (local state):`, e.target.value.substring(0, 50) + '...');
              setLocalContext(e.target.value);
            }}
            onFocus={() => { isContextEditing.current = true; console.log('[EditorPanel] isContextEditing: true'); }}
            onBlur={() => { isContextEditing.current = false; console.log('[EditorPanel] isContextEditing: false'); }}
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
            {blocks.length === 0 && !isDraggingSomething ? (
                <div className="flex-1 text-center py-12 text-gray-400">
                    Drag variables or click "+ Add text" to start building your prompt.
                    <button
                      onClick={() => {
                        console.log(`[EditorPanel ${prompt.id}] Add text button clicked (empty state).`);
                        insertTextAt(0, '');
                      }}
                      className="mt-4 px-3 py-1 border rounded-md text-sm text-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center mx-auto"
                    >
                      <Text className="mr-1 h-4 w-4" /> Add text
                    </button>
                </div>
            ) : (
                blocks.map((b, i) => (
                    <React.Fragment key={`block-fragment-${b.id}`}>
                        {i === 0 && (
                          <HoverAddTextBlock
                              key={`hover-insert-before-first`}
                              index={0}
                              insertTextAt={insertTextAt}
                          />
                        )}
                        <BlockRenderer
                            key={b.id}
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
                        <HoverAddTextBlock
                            key={`hover-insert-after-${b.id}`}
                            index={i + 1}
                            insertTextAt={insertTextAt}
                        />
                    </React.Fragment>
                ))
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
            value={pendingNotes}
            onChange={(e) => setPendingNotes(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => {
              console.log(`[EditorPanel ${prompt.id}] Save button clicked.`);
              onSnapshot(pendingNotes || 'New version');
            }}
            className="btn-primary"
            disabled={isSnapshotting}
          >
            {isSnapshotting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <GitCommit className="mr-1 h-4 w-4" />}
            Save
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
  insertVariableAt: (index: number, variable: { placeholder: string; id: string; name: string }) => void
  isDraggingSomething: boolean;
  insertTextAt: (index: number, text?: string) => void;
}) {
  // CORRECTED: Initialize useRef with null
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  console.log(`[BlockRenderer ${block.id}] Rendered with block.value: "${block.type === 'text' ? block.value : 'N/A'}"`);


  useEffect(() => {
    if (block.type === 'text') {
      console.log(`[BlockRenderer ${block.id}] useEffect: block.value changed to "${block.value}".`);
      if (contentEditableRef.current && contentEditableRef.current.innerText !== block.value && document.activeElement !== contentEditableRef.current) {
        console.log(`[BlockRenderer ${block.id}] useEffect: DOM innerText differs from block.value and not active. Setting innerText to "${block.value}".`);
        contentEditableRef.current.innerText = block.value;
      } else if (contentEditableRef.current && document.activeElement === contentEditableRef.current) {
        console.log(`[BlockRenderer ${block.id}] useEffect: Component is active, avoiding DOM update to prevent disrupting user input.`);
      }
    }
  }, [block.type, block.value]);


  const [{ isDragging, canDrag }, dragRef, preview] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: {
      id: block.id,
      index,
      type: block.type,
      value: block.type === 'text' ? block.value : block.placeholder,
      name: block.type === 'variable' ? block.name : undefined,
      varId: block.type === 'variable' ? block.varId : undefined,
      originalBlock: block,
    },
    canDrag: (monitor) => {
      const result = true;
      return result;
    },
    collect: (m) => {
        const dragging = m.isDragging();
        const currentCanDrag = m.canDrag();
        return { isDragging: dragging, canDrag: currentCanDrag };
    },
  }), [block.id, index, block.type, block.value, block.placeholder, block.name, block.varId]);

  const connectDragSource = useCallback((node: HTMLElement | null) => {
    dragRef(node);
  }, [dragRef]);

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);


  const [localDropTargetPosition, setLocalDropTargetPosition] = useState<'before' | 'after' | null>(null);

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
      
      setLocalDropTargetPosition(null);

      if (monitor.didDrop()) {
        return;
      }

      let targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

      if (dragItemType === ItemTypes.VARIABLE) {
          console.log(`[BlockRenderer ${block.id}][Drop] Inserting variable at index ${targetIndex}.`);
          insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && targetIndex === index + 1) ||
                             (dragIndex === targetIndex + 1 && targetIndex === index);

        if (isNoRealMove) {
          console.log(`[BlockRenderer ${block.id}][Drop] No real move detected, ignoring block drop.`);
          return;
        }

        console.log(`[BlockRenderer ${block.id}][Drop] Moving block from ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex;
      }
    },
    collect: (monitor) => {
        const isOverVal = monitor.isOver({ shallow: true });
        const canDropVal = monitor.canDrop();
        return {
            isOver: isOverVal,
            canDrop: canDropVal,
        };
    },
  }), [index, insertVariableAt, moveBlock, localDropTargetPosition, block.id, allBlocks.length]);

  const blockRootRef = mergeRefs(wrapperRef, dropRef); 

  const showPlaceholderAbove = isOver && canDrop && localDropTargetPosition === 'before' && isDraggingSomething;
  const showPlaceholderBelow = isOver && canDrop && localDropTargetPosition === 'after' && isDraggingSomething;

  const commonClasses = `relative w-full rounded-md shadow-sm transition-all duration-100 ease-in-out`;

  if (block.type === 'variable') {
    return (
      <div
        ref={blockRootRef}
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        
        <div
          ref={connectDragSource}
          className="cursor-grab shrink-0 flex items-center justify-center w-10 h-10 bg-blue-100 border border-blue-200 rounded-md text-blue-600 shadow-md transition-opacity duration-100 opacity-100 group-hover:opacity-100"
        >
          <GripVertical className="h-6 w-6" />
        </div>

        <div
          className={`flex-1 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md `}
        >
          <div className="text-sm font-medium">{block.name || block.placeholder}</div>
        </div>
        {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  } else {
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        console.log(`[BlockRenderer ${block.id}] onKeyDown: Enter pressed, preventing default.`);
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace' && contentEditableRef.current?.innerText === '' && window.getSelection()?.anchorOffset === 0) {
          e.preventDefault();
          console.log(`[BlockRenderer ${block.id}] onKeyDown: Backspace on empty block, attempting to remove.`);
          if (allBlocks.length === 1 && allBlocks[0].id === block.id) {
              console.log(`[BlockRenderer ${block.id}] onKeyDown: Only block left, clearing content.`);
              updateTextBlock(block.id, ''); 
          } else {
              removeBlock(index);
          }
      }
    }

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      const newText = e.currentTarget.innerText;
      console.log(`[BlockRenderer ${block.id}] onInput: Current innerText: "${newText}". Calling updateTextBlock.`);
      updateTextBlock(block.id, newText);
    }

    const onBlur = () => {
      const text = contentEditableRef.current?.innerText ?? ''
      console.log(`[BlockRenderer ${block.id}] onBlur: Final text: "${text}". Block.value: "${block.value}".`);
      if (text === '' && allBlocks.length > 1) {
          console.log(`[BlockRenderer ${block.id}] onBlur: Empty text block and not the only block, removing.`);
          removeBlock(index);
      }
    }

    return (
      <div
        ref={blockRootRef}
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`relative flex-1 p-2 bg-white border border-gray-300 rounded-md flex items-center group`}
        >
            <div
              ref={connectDragSource}
              className="cursor-grab shrink-0 flex items-center justify-center w-10 h-10 -ml-3 mr-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-md transition-opacity duration-100 opacity-100 group-hover:opacity-100"
              style={{ position: 'relative', left: '0', top: '0', transform: 'none' }}
            >
              <GripVertical className="h-6 w-6" />
            </div>
            <div
                contentEditable
                suppressContentEditableWarning
                onKeyDown={onKeyDown}
                onInput={onInput}
                onBlur={onBlur}
                className="flex-1 min-h-[40px] text-sm outline-none w-full whitespace-pre-wrap py-2"
                style={{ wordBreak: 'break-word' }}
                ref={contentEditableRef}
            >
            </div>
            {(allBlocks.length > 1) || (block.type === 'text' && block.value !== '') ? (
                <button
                    onClick={() => {
                        console.log(`[BlockRenderer ${block.id}] Remove button clicked.`);
                        removeBlock(index);
                    }}
                    className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity"
                    aria-label={`Remove text block`}
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
}: {
  index: number;
  insertTextAt: (index: number, text?: string) => void;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      key={`hover-add-text-${index}`}
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
            console.log(`[HoverAddTextBlock] Add text button clicked at index ${index}.`);
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


/* ---------- VersionsPanel ---------- */

function VersionsPanel({
  versions,
  selectedVersionId,
  onSelectVersion,
  onRestoreVersion,
  isRestoring,
}: {
  versions: Version[]
  selectedVersionId: string | null
  onSelectVersion: (id: string) => void
  onRestoreVersion: (versionId: string) => void
  isRestoring: boolean;
}) {
  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  useEffect(() => {
    console.log('[VersionsPanel] useEffect: versions or selectedVersionId changed.');
    if (!selectedVersionId && versions.length > 0) {
      console.log('[VersionsPanel] No version selected, defaulting to latest.');
      onSelectVersion(versions[0].id);
    }
  }, [selectedVersionId, versions, onSelectVersion]);

  if (!selectedVersion) {
    console.log('[VersionsPanel] No selected version to display.');
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        No version selected.
      </div>
    );
  }

  console.log('[VersionsPanel] Displaying selected version:', selectedVersion.id, selectedVersion.notes);
  return (
    <div className="flex h-full min-h-0 flex-col p-4">
        <h3 className="font-semibold text-lg mb-2">{selectedVersion?.notes || 'No Notes'}</h3>
        <p className="text-sm text-gray-500 mb-4">Last Edited: {new Date(selectedVersion?.createdAt || '').toLocaleString()}</p>

        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Version Content</label>
            <Textarea
                readOnly
                value={selectedVersion?.content || ''}
                rows={10}
                className="font-mono overflow-y-auto bg-gray-50 dark:bg-gray-800"
                placeholder="No content available for this version."
            />
        </div>
        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Version Context</label>
            <Textarea
                readOnly
                value={selectedVersion?.context || ''}
                rows={5}
                className="font-mono overflow-y-auto bg-gray-50 dark:bg-gray-800"
                placeholder="No context available for this version."
            />
        </div>

        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Variables in this Version</label>
            {selectedVersion?.variables && selectedVersion.variables.length > 0 ? (
                <ul className="space-y-1">
                    {selectedVersion.variables.map(v => (
                        <li key={v.id} className="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-center justify-between">
                            <span className="font-semibold">{v.name}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">({v.placeholder})</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500">No variables for this version.</p>
            )}
        </div>
    </div>
  )
}
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


// Utility for deep comparison of arrays of objects (used in EditorPanel's useEffect)
function deepCompareBlocks(arr1: Block[], arr2: Block[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    const b1 = arr1[i];
    const b2 = arr2[i];
    if (b1.type !== b2.type || b1.id !== b2.id) return false; // Basic comparison for identity
    if (b1.type === 'text' && b1.value !== b2.value) return false;
    if (b1.type === 'variable' && (b1.placeholder !== b2.placeholder || b1.name !== b2.name || b1.varId !== b2.varId)) return false; // Added varId for variable block comparison
  }
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
function cuid(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 'c'; // CUIDs start with 'c'
  for (let i = 0; i < 24; i++) { // Generate 24 random alphanumeric characters
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
  projectId?: string // Keep projectId for context if needed for future advanced rendering
): Promise<string> {
  let renderedContent = content;
  let renderedContext = context;

  for (const variable of variables) {
    let valueToSubstitute = variableValues[variable.placeholder] || variable.defaultValue || '';

    // If it's a project data variable and we don't have a specific resolved value,
    // use a generic dynamic placeholder for the preview
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
export function PromptLab({ prompt, onBack, projectId }: { prompt: Prompt; onBack: () => void; projectId?: string }) {
  const { updatePrompt, snapshotPrompt, restorePromptVersion, resolveVariablePreview } = usePromptLab(projectId); // Get actions from usePromptLab hook

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables")
  const [showVariableBuilder, setShowVariableBuilder] = useState(false);
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})
  const [renderedPreview, setRenderedPreview] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  
  // Track mutation loading states
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);


  // When the prompt prop changes, ensure selected version is valid and update preview variables
  useEffect(() => {
    // console.log('[Prompt Lab] Root useEffect: Prompt prop changed, updating selectedVersionId and preview values.');
    if (prompt) {
      if (prompt.versions.length > 0) {
        // If no version is selected or the selected version is no longer in the list, select the latest
        if (!selectedVersionId || !prompt.versions.some((v) => v.id === selectedVersionId)) {
          setSelectedVersionId(prompt.versions[0].id)
        }
      } else if (selectedVersionId) {
        setSelectedVersionId(null)
      }
      
      const initialPreviewValues: Record<string, string> = {};
      prompt.variables.forEach(v => {
        // For manual variables, use default value in preview
        if (!v.source) {
          initialPreviewValues[v.placeholder] = v.defaultValue || '';
        } else {
          // For project data variables, initially show a generic placeholder.
          // The resolveVariablePreview will be called in VariableDiscoveryBuilder or could be called here for full live preview
          initialPreviewValues[v.placeholder] = `[${v.name} (dynamic)]`;
        }
      });
      setPreviewVariableValues(initialPreviewValues);
    }
  }, [prompt, selectedVersionId]);


  useEffect(() => {
    if (prompt) {
      // console.log('[Prompt Lab] Root useEffect: Generating preview...');
      const generatePreview = async () => {
        const preview = await renderPrompt(prompt.content, prompt.context || '', prompt.variables, previewVariableValues, projectId);
        setRenderedPreview(preview);
      };
      generatePreview();
    }
  }, [prompt, previewVariableValues, projectId]);


  const selectedVersion = useMemo(() => prompt?.versions.find((v) => v.id === selectedVersionId) || null, [prompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const handleUpdatePrompt = useCallback((patch: Partial<Prompt>) => {
    // Pass the entire variables array for updates if it's part of the patch
    // Ensure IDs are consistent if coming from client-side state
    if (patch.variables) {
      patch.variables = patch.variables.map(v => ({...v, id: v.id || cuid()})) as PromptVariable[];
    }
    updatePrompt(prompt.id, patch);
  }, [prompt.id, updatePrompt]);

  const handleSnapshot = useCallback(async (notes?: string) => {
    setIsSnapshotting(true);
    try {
      await snapshotPrompt(prompt.id, notes);
      toast.success("Prompt version saved!");
      setPendingNotes(''); // Clear notes after snapshot
    } catch (error) {
      console.error(`Failed to snapshot prompt ${prompt.id}:`, error);
      toast.error("Failed to save version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsSnapshotting(false);
    }
  }, [prompt.id, snapshotPrompt]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    setIsRestoring(true);
    try {
      await restorePromptVersion(prompt.id, versionId);
      toast.success("Prompt restored from version!");
    } catch (error) {
      console.error(`Failed to restore prompt ${prompt.id} from version ${versionId}:`, error);
      toast.error("Failed to restore version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsRestoring(false);
    }
  }, [prompt.id, restorePromptVersion]);

  const handleCreateVariable = useCallback((newVariable: Omit<PromptVariable, 'id'>) => {
    const variableWithId: PromptVariable = {
      ...newVariable,
      id: cuid(), // Generate client-side ID for the new variable
    };
    const updatedVariables = [...prompt.variables, variableWithId];
    handleUpdatePrompt({ variables: updatedVariables });
    setShowVariableBuilder(false);
  }, [prompt.variables, handleUpdatePrompt]);

  const handleRemoveVariable = useCallback((variableId: string) => {
    const updatedVariables = prompt.variables.filter(v => v.id !== variableId);
    handleUpdatePrompt({ variables: updatedVariables });
  }, [prompt.variables, handleUpdatePrompt]);


  // console.log('[Prompt Lab] Rendering: Main PromptLab component.', prompt.id, prompt.title);

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
                    // console.log(`[Prompt Lab] Left Tab changed to: ${index === 0 ? "versions" : "variables"}`);
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
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>

            {/* Right side */}
            <div className="saas-card h-full min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Tabs value={rightTab} onValueChange={(v) => {
                    setRightTab(v as any);
                    // console.log(`[Prompt Lab] Right Tab changed to: ${v}`);
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
                          prompt={prompt}
                          onUpdate={handleUpdatePrompt}
                          onSnapshot={handleSnapshot}
                          pendingNotes={pendingNotes}
                          setPendingNotes={setPendingNotes}
                          isSnapshotting={isSnapshotting} // Pass isSnapshotting prop
                        />
                    </TabsContent>

                    {/* Version Details Panel */}
                    <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <VersionsPanel
                        versions={prompt.versions || []}
                        selectedVersionId={selectedVersionId}
                        onSelectVersion={setSelectedVersionId}
                        onRestoreVersion={handleRestoreVersion}
                        isRestoring={isRestoring} // Pass isRestoring prop
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

        {/* NEW: Variable Discovery Builder */}
        <VariableDiscoveryBuilder
          open={showVariableBuilder}
          onOpenChange={setShowVariableBuilder}
          onCreate={handleCreateVariable}
          projectId={projectId}
          resolveVariablePreview={resolveVariablePreview} // Pass the resolver hook
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
    } else {
        console.warn(`[Prompt Lab] [VariableItem ${variable.name}] useEffect: Drag source element not found for ID: ${variable.id}-drag-source`);
    }
  }, [drag, preview, variable.id, variable.name]);

  return (
    <div
      id={variable.id + '-drag-source'}
      className={`cursor-grab rounded px-2 py-1 mb-2 border ${
        isDragging ? 'opacity-0' : 'bg-gray-100' // Original item disappears when dragging starts
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
  | { type: 'variable'; id: string; varId: string; placeholder: string; name: string } // `varId` links to PromptVariable.id

function parseContentToBlocks(content: string, variables: PromptVariable[]): Block[] {
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
          tempBlocks.push({ type: 'text', id: cuid('t-'), value: currentText });
          currentText = '';
        }
        tempBlocks.push({ type: 'variable', id: cuid('v-'), varId: matchedVar.id, placeholder: matchedVar.placeholder, name: matchedVar.name });
      } else {
        currentText += part;
      }
    });
  } else {
    currentText = content; // If no variables, the whole content is text
  }

  if (currentText !== '') {
    tempBlocks.push({ type: 'text', id: cuid('t-'), value: currentText });
  }

  // Refined block cleaning logic
  let finalBlocks: Block[] = [];
  tempBlocks.forEach((block, idx) => {
    if (block.type === 'text' && block.value === '') {
      // If the current block is an empty text block, and it's not the first/last
      // AND it's adjacent to another empty text block (or it's just a placeholder empty block)
      if (
        (idx > 0 && tempBlocks[idx - 1].type === 'text' && tempBlocks[idx - 1].value === '') ||
        (idx < tempBlocks.length - 1 && tempBlocks[idx + 1].type === 'text' && tempBlocks[idx + 1].value === '')
      ) {
        // Skip it if it's redundant. If it's an isolated empty block, keep it.
        if (!((idx === 0 || idx === tempBlocks.length - 1) && tempBlocks.length === 1)) {
            return;
        }
      }
    }
    finalBlocks.push(block);
  });
  
  // Ensure there's always at least one editable text block if content is empty or only variables
  if (finalBlocks.length === 0 || (finalBlocks.length === 1 && finalBlocks[0].type === 'variable')) {
    finalBlocks.push({ type: 'text', id: cuid('t-initial-empty-fallback'), value: '' });
  }
  
  // If the first block is an empty text block and there are other blocks, shift it
  if (finalBlocks.length > 1 && finalBlocks[0].type === 'text' && finalBlocks[0].value === '') {
    finalBlocks.shift();
  }
  // If the last block is an empty text block and there are other blocks, pop it
  if (finalBlocks.length > 1 && finalBlocks[finalBlocks.length - 1].type === 'text' && finalBlocks[finalBlocks.length - 1].value === '') {
    finalBlocks.pop();
  }

  // If after all processing, it's empty, add a single empty text block as fallback
  if (finalBlocks.length === 0) {
    return [{ type: 'text', id: cuid('t-final-empty-fallback'), value: '' }];
  }

  return finalBlocks;
}


function serializeBlocks(blocks: Block[]): string {
  const serialized = blocks
    .filter(b => !(b.type === 'text' && b.value === '')) // Filter out purely empty text blocks during serialization
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
  isSnapshotting, // <-- Added prop
}: {
  prompt: Prompt
  onUpdate: (patch: Partial<Prompt>) => void
  onSnapshot: (notes?: string) => void
  pendingNotes: string;
  setPendingNotes: (notes: string) => void;
  isSnapshotting: boolean; // <-- Added prop type
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const initialBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    return initialBlocks;
  });

  // Utility function to log the current blocks array in a readable format
  const logBlocks = useCallback((message: string, currentBlocks: Block[]) => {
    const formattedBlocks = currentBlocks.map(b =>
      b.type === 'text' ? `[TEXT:"${b.value.substring(0, Math.min(b.value.length, 30))}..."]` : `[VAR:${b.name || b.placeholder} (varId: ${b.varId})]`
    ).join(' | ');
    // console.log(`[Prompt Lab] [EditorPanel] --- BLOCKS STATE UPDATE --- ${message}\nCURRENT BLOCKS: ${formattedBlocks}`);
  }, []);


  // Effect to re-parse blocks when prompt.content or prompt.variables from API changes
  useEffect(() => {
    const newBlocks = parseContentToBlocks(prompt.content || '', prompt.variables || []);
    if (!deepCompareBlocks(blocks, newBlocks)) {
      setBlocks(newBlocks);
      logBlocks('After prompt.content/variables re-parse (and deep compare)', newBlocks);
    }
  }, [prompt.content, prompt.variables]); // blocks should NOT be a dependency here, it's the state being set

  // Effect to serialize current blocks state and call onUpdate if content changed
  useEffect(() => {
    const serialized = serializeBlocks(blocks);
    if (serialized !== prompt.content) {
      onUpdate({ content: serialized });
    }
  }, [blocks, onUpdate, prompt.content]); // `prompt.content` as dependency for comparison


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
    setBlocks(prev => {
        let updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        
        if (value === '' && prev.length > 1) {
             updated = updated.filter(b => !(b.type === 'text' && b.id === id && b.value === ''));
        }

        logBlocks(`After updating text block ${id} to "${value.substring(0, Math.min(value.length, 30))}..."`, updated);
        return updated;
    });
  }, [logBlocks]);

  const removeBlock = useCallback((index: number) => {
    setBlocks(prev => {
      let copy = [...prev];
      if (index < 0 || index >= copy.length) {
          return prev;
      }

      copy.splice(index, 1); 
      
      if (copy.length === 0) {
        copy.push({ type: 'text', id: cuid('t-empty-after-remove'), value: '' });
      }

      logBlocks(`After removing block at index ${index}`, copy);
      return copy
    })
  }, [blocks, logBlocks]);

  const moveBlock = useCallback((from: number, to: number) => {
    setBlocks(prev => {
      let copy = [...prev];
      if (from < 0 || from >= copy.length || to < 0 || to > copy.length) {
          return prev;
      }

      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);

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
        return;
      }

      let targetIndex = blocks.length;
      if (blocks.length === 0) {
        targetIndex = 0;
      }

      if (monitor.getItemType() === ItemTypes.VARIABLE) {
        insertVariableAt(targetIndex, item);
      } else if (monitor.getItemType() === ItemTypes.BLOCK) {
        const dragIndex = item.index;
        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && dragIndex < targetIndex) || // Dragging N to after N-1
                             (dragIndex === targetIndex + 1 && targetIndex < dragIndex); // Dragging N to before N+1

        if (isNoRealMove) {
          return;
        }

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
  }), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething]);


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
            {blocks.length === 0 && !isDraggingSomething ? (
                <div className="flex-1 text-center py-12 text-gray-400">
                    Drag variables or click "+ Add text" to start building your prompt.
                    <button
                      onClick={() => insertTextAt(0, '')}
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
                            key={`block-${b.id}`}
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
                            key={`hover-insert-after-${b.id}-${i}`}
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
            onClick={() => { onSnapshot(pendingNotes || 'New version'); }}
            className="btn-primary"
            disabled={isSnapshotting} // Now uses the prop
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
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [localTextContent, setLocalTextContent] = useState(block.type === 'text' ? block.value : '');

  useEffect(() => {
    if (block.type === 'text') {
      if (localTextContent !== block.value) {
        setLocalTextContent(block.value);
      }
      if (contentEditableRef.current && contentEditableRef.current.innerText !== block.value && document.activeElement !== contentEditableRef.current) {
        contentEditableRef.current.innerText = block.value;
      }
    }
  }, [block.type, block.value]);

  const [{ isDragging, canDrag }, dragRef, preview] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: {
      id: block.id,
      index,
      type: block.type,
      value: block.type === 'text' ? localTextContent : block.placeholder,
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
  }), [block.id, index, block.type, localTextContent, block.placeholder, block.name, block.varId]);

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
          insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && targetIndex === index + 1) || // dragging from N to after N
                             (dragIndex === targetIndex + 1 && targetIndex === index); // dragging from N to before N

        if (isNoRealMove) {
          return;
        }

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
        key={`block-root-${block.id}`}
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
        return;
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
      setLocalTextContent(e.currentTarget.innerText);
    }

    const onBlur = () => {
      const text = contentEditableRef.current?.innerText ?? ''
      if (text === '' && allBlocks.length > 1) {
          removeBlock(index);
      } else if (localTextContent !== block.value) {
        updateTextBlock(block.id, localTextContent);
      }
    }

    return (
      <div
        key={`block-root-${block.id}`}
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
  isRestoring, // <-- Added prop
}: {
  versions: Version[]
  selectedVersionId: string | null
  onSelectVersion: (id: string) => void
  onRestoreVersion: (versionId: string) => void
  isRestoring: boolean; // <-- Added prop type
}) {
  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  // const { loading: isRestoring } = usePromptLab(); // OLD: Removed, now passed as prop

  // If no version is selected, default to the latest version for display if available
  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      onSelectVersion(versions[0].id);
    }
  }, [selectedVersionId, versions, onSelectVersion]);

  if (!selectedVersion) {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        No version selected.
      </div>
    );
  }

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

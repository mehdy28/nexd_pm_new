// components/prompt-lab/prompt-lab.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { PromptVariableType, type Prompt, type Version, type PromptVariable, type PromptVariableSource, type ContentBlock } from '@/components/prompt-lab/store';
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
// import { useDebounce } from 'use-debounce'; // Removed useDebounce

// Adjusted Block type definition to match ContentBlock from GraphQL
type Block = ContentBlock;

// Utility for deep comparison of arrays of objects (used in EditorPanel's useEffect)
// IMPORTANT: This comparison should be robust.
// We need to ensure that the `id` generation doesn't cause false negatives.
function deepCompareBlocks(arr1: Block[], arr2: Block[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    const b1 = arr1[i];
    const b2 = arr2[i];

    // Compare essential identifying properties and type first
    if (b1.id !== b2.id || b1.type !== b2.type) {
      return false;
    }

    // Then compare type-specific values
    if (b1.type === 'text') {
      if (b1.value !== b2.value) {
        return false;
      }
    } else if (b1.type === 'variable') {
      // For variables, compare varId (points to the actual variable object) and name/placeholder
      if (b1.varId !== b2.varId || b1.placeholder !== b2.placeholder || b1.name !== b2.name) {
        return false;
      }
    }
    // If there are other block types, add comparisons for their specific properties here
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
function cuid(prefix: string = ''): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/* Utility to render prompt by substituting placeholder text */
async function renderPrompt(
  contentBlocks: Block[],
  context: string,
  variables: PromptVariable[],
  variableValues: Record<string, string>,
  projectId?: string
): Promise<string> {
  let renderedContentParts: string[] = [];

  for (const block of contentBlocks) {
    if (block.type === 'text') {
      renderedContentParts.push(block.value);
    } else if (block.type === 'variable') {
      const variable = variables.find(v => v.id === block.varId);
      if (variable) {
        let valueToSubstitute = variableValues[variable.placeholder] || variable.defaultValue || '';

        if (variable.source && (!variableValues[variable.placeholder] || variableValues[variable.placeholder] === 'N/A')) {
          valueToSubstitute = `[${variable.name} (dynamic)]`;
        }

        const highlightedValue = `[[${valueToSubstitute}]]`;
        renderedContentParts.push(highlightedValue);
      } else {
        renderedContentParts.push(`[[UNKNOWN_VAR: ${block.placeholder}]]`);
      }
    }

  }
  const renderedContent = renderedContentParts.join('');

  let renderedContext = context;
  for (const variable of variables) {
    let valueToSubstitute = variableValues[variable.placeholder] || variable.defaultValue || '';
    if (variable.source && (!variableValues[variable.placeholder] || variableValues[variable.placeholder] === 'N/A')) {
      valueToSubstitute = `[${variable.name} (dynamic)]`;
    }
    const highlightedValue = `[[${valueToSubstitute}]]`;
    const regex = new RegExp(variable.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
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

// Helper to convert ContentBlock[] to a displayable string (for versions panel)
function stringifyBlocksForDisplay(blocks: Block[]): string {
  return blocks.map(block => {
    if (block.type === 'text') {
      return block.value;
    } else if (block.type === 'variable') {
      return `{{${block.name || block.placeholder}}}`;
    }
    return '';
  }).join('');
}

/* ---------- MAIN COMPONENT ---------- */
export function PromptLab({ prompt, onBack, projectId }: { prompt: Prompt; onBack: () => void; projectId?: string; }) {
  console.log(`[data loading sequence] [PromptLab] Component Rendering START - Prompt ID: ${prompt?.id}.`);
  console.log(`[data loading sequence] [PromptLab] Prompt object received (partial): title=${prompt?.title}, content.length=${prompt?.content?.length || 0}, variables.length=${prompt?.variables?.length || 0}`);

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

  const lastInitializedPromptId = useRef<string | null>(null);

  // --- Effect for state initialization/reset based on prompt ---
  useEffect(() => {
    console.log(`[data loading sequence] [PromptLab] useEffect (init/reset) RUNNING - prompt ID: ${prompt?.id}, current lastInitializedPromptId: ${lastInitializedPromptId.current}`);

    if (prompt) {
      if (prompt.id !== lastInitializedPromptId.current) {
        console.log(`[data loading sequence] [PromptLab] Action: Initializing states for NEW prompt ID: ${prompt.id}.`);
        if (prompt.versions && prompt.versions.length > 0) {
          if (!selectedVersionId || !prompt.versions.some((v) => v.id === selectedVersionId)) {
            console.log(`[data loading sequence] [PromptLab] Versions available, selecting latest: ${prompt.versions[0].id}`);
            setSelectedVersionId(prompt.versions[0].id);
          }
        } else {
          console.log('[data loading sequence] [PromptLab] No versions available, setting selectedVersionId to null.');
          setSelectedVersionId(null);
        }

        const initialPreviewValues: Record<string, string> = {};
        if (prompt.variables) {
          prompt.variables.forEach(v => {
            if (!v.source) {
              initialPreviewValues[v.placeholder] = v.defaultValue || '';
            } else {
              initialPreviewValues[v.placeholder] = `[${v.name} (dynamic)]`;
            }
          });
        }
        console.log(`[data loading sequence] [PromptLab] Initializing previewVariableValues with ${Object.keys(initialPreviewValues).length} variables.`);
        setPreviewVariableValues(initialPreviewValues);

        lastInitializedPromptId.current = prompt.id;
        console.log(`[data loading sequence] [PromptLab] Completed initialization for prompt ID: ${prompt.id}.`);
      } else {
        console.log(`[data loading sequence] [PromptLab] Prompt ID ${prompt.id} already initialized, skipping full state reset.`);
        if (prompt.versions && prompt.versions.length > 0 && (!selectedVersionId || !prompt.versions.some((v) => v.id === selectedVersionId))) {
          console.log(`[data loading sequence] [PromptLab] Re-selecting latest version for current prompt ${prompt.id}.`);
          setSelectedVersionId(prompt.versions[0].id);
        }

        const currentPreviewVars = JSON.stringify(Object.keys(previewVariableValues).sort());
        const newPromptVars = JSON.stringify((prompt.variables || []).map(v => v.placeholder).sort());
        if (currentPreviewVars !== newPromptVars) {
          console.log(`[data loading sequence] [PromptLab] Variables changed for current prompt ${prompt.id}, re-initializing preview values.`);
          const updatedPreviewValues: Record<string, string> = {};
          (prompt.variables || []).forEach(v => {
            if (!v.source) {
              updatedPreviewValues[v.placeholder] = v.defaultValue || '';
            } else {
              updatedPreviewValues[v.placeholder] = `[${v.name} (dynamic)]`;
            }
          });
          setPreviewVariableValues(updatedPreviewValues);
        }
      }
    } else {
      console.log('[data loading sequence] [PromptLab] Condition: prompt is NULL/UNDEFINED. Clearing states.');
      lastInitializedPromptId.current = null;
      setSelectedVersionId(null);
      setPreviewVariableValues({});
      setRenderedPreview("Select a prompt or create a new one.");
    }

  }, [prompt]);

  // --- Effect for preview rendering ---
  useEffect(() => {
    console.log(`[data loading sequence] [PromptLab] useEffect (preview render) RUNNING - prompt ID: ${prompt?.id}, previewVariableValues length: ${Object.keys(previewVariableValues).length}`);
    if (!prompt) {
      console.log('[data loading sequence] [PromptLab] Condition: prompt is NULL. Setting renderedPreview to "Select a prompt or create a new one."');
      setRenderedPreview("Select a prompt or create a new one.");
      return;
    }
    console.log('[data loading sequence] [PromptLab] Action: Generating preview based on prompt and previewVariableValues.');
    const generatePreview = async () => {
      const preview = await renderPrompt(prompt.content || [], prompt.context || '', prompt.variables || [], previewVariableValues, projectId);
      setRenderedPreview(preview);
      console.log('[data loading sequence] [PromptLab] Preview rendering complete.');
    };
    generatePreview();
  }, [prompt, previewVariableValues, projectId]);

  const selectedVersion = useMemo(() => prompt?.versions?.find((v) => v.id === selectedVersionId) || null, [prompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => { })
  }

  // Modified handleUpdatePrompt to accept callbacks for optimistic UI
  const handleUpdatePrompt = useCallback((
    patch: Partial<Prompt>,
    onCompletedCallback?: (updatedData?: Prompt) => void,
    onErrorCallback?: () => void
  ) => {
    console.log(`[data loading sequence] [PromptLab] handleUpdatePrompt Called for prompt ${prompt.id} with patch:`, patch);
    const patchedVariables = patch.variables ? patch.variables.map(v => ({ ...v, id: v.id || cuid('patch-var-') })) as PromptVariable[] : undefined;
    const patchedContent = patch.content ? patch.content.map(b => ({ ...b, id: b.id || cuid('patch-block-') })) : undefined;
    updatePrompt(prompt.id, {
      ...patch,
      variables: patchedVariables,
      content: patchedContent,
    }, onCompletedCallback, onErrorCallback); // Pass callbacks to the hook's updatePrompt
  }, [prompt.id, updatePrompt]);

  const handleSnapshot = useCallback(async (notes?: string) => {
    setIsSnapshotting(true);
    console.log(`[data loading sequence] [PromptLab] handleSnapshot: Attempting to snapshot prompt ${prompt.id} with notes: ${notes}`);
    try {
      await snapshotPrompt(prompt.id, notes);
      toast.success("Prompt version saved!");
      setPendingNotes('');
      console.log('[data loading sequence] [PromptLab] Snapshot successful.');
    } catch (error) {
      console.error(`[data loading sequence] [PromptLab] Failed to snapshot prompt ${prompt.id}:`, error);
      toast.error("Failed to save version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsSnapshotting(false);
      console.log('[data loading sequence] [PromptLab] Snapshot operation finished.');
    }
  }, [prompt.id, snapshotPrompt]);


  const handleRestoreVersion = useCallback(async (versionId: string) => {
    setIsRestoring(true);
    console.log(`[data loading sequence] [PromptLab] handleRestoreVersion: Attempting to restore prompt ${prompt.id} from version ${versionId}`);
    try {
      await restorePromptVersion(prompt.id, versionId);
      toast.success("Prompt restored from version!");
      console.log('[data loading sequence] [PromptLab] Restore successful.');
    } catch (error) {
      console.error(`[data loading sequence] [PromptLab] Failed to restore prompt ${prompt.id} from version ${versionId}:`, error);
      toast.error("Failed to restore version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsRestoring(false);
      console.log('[data loading sequence] [PromptLab] Restore operation finished.');
    }
  }, [prompt.id, restorePromptVersion]);

  const handleCreateVariable = useCallback((newVariable: Omit<PromptVariable, 'id'>) => {
    console.log(`[data loading sequence] [PromptLab] handleCreateVariable: Creating new variable: ${newVariable.name}`);
    if (!prompt) {
      console.warn("[data loading sequence] [PromptLab] Cannot create variable: prompt is null.");
      return;
    }
    const variableWithId: PromptVariable = {
      ...newVariable,
      id: cuid('p-var-'),
    };
    const updatedVariables = [...prompt.variables, variableWithId];
    console.log(`[data loading sequence] [PromptLab] Calling handleUpdatePrompt with updated variables count: ${updatedVariables.length}`);
    handleUpdatePrompt({ variables: updatedVariables });
    setShowVariableBuilder(false);
  }, [prompt?.variables, handleUpdatePrompt]);

  const handleRemoveVariable = useCallback((variableId: string) => {
    if (!prompt) {
      console.warn("[data loading sequence] [PromptLab] Cannot remove variable: prompt is null.");
      return;
    }
    console.log(`[data loading sequence] [PromptLab] handleRemoveVariable: Removing variable with ID: ${variableId}`);
    const updatedVariables = prompt.variables.filter(v => v.id !== variableId);
    console.log(`[data loading sequence] [PromptLab] Calling handleUpdatePrompt with updated variables count: ${updatedVariables.length}`);
    handleUpdatePrompt({ variables: updatedVariables });
  }, [prompt?.variables, handleUpdatePrompt]);

  console.log(`[data loading sequence] [PromptLab] Rendering MAIN UI for prompt ID: ${prompt.id}. Prompt data is considered fully loaded.`);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="page-scroller pt-0 p-1 pb-0 h-full min-h-0">
        <div className="h-[85vh] overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 pb-0 md:grid-cols-[320px_1fr]">

            <div className="saas-card h-full min-h-0 flex flex-col">
              <Tab.Group
                selectedIndex={leftTab === "versions" ? 0 : 1}
                onChange={(index) => {
                  setLeftTab(index === 0 ? "versions" : "variables");
                  console.log('[data loading sequence] [PromptLab] Left Tab changed to:', index === 0 ? "Versions" : "Variables");
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
                  <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
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
                  </Tab.Panel>

                  <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                    <>
                      <div className="flex flex-col gap-2 border-b p-3" style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}>
                        <h3 className="font-semibold">Variables</h3>
                        <Button className="w-full h-9 btn-primary" onClick={() => {
                          console.log('[data loading sequence] [PromptLab] Variables tab: Create New Variable button clicked.');
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
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>

            <div className="saas-card h-full min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Tabs value={rightTab} onValueChange={(v) => {
                  setRightTab(v as any);
                  console.log('[data loading sequence] [PromptLab] Right Tab changed to:', v);
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
                        isSnapshotting={isSnapshotting}
                      />
                    </TabsContent>

                    <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <VersionsPanel
                        versions={prompt.versions}
                        selectedVersionId={selectedVersionId}
                        onSelectVersion={setSelectedVersionId}
                        onRestoreVersion={handleRestoreVersion}
                        isRestoring={isRestoring}
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
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

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
      className={`cursor-grab rounded px-2 py-1 mb-2 border ${isDragging ? 'opacity-0' : 'bg-gray-100'} flex items-center justify-between group`}
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

// Helper to safely assign IDs to blocks if they don't have one
function assignBlockIds(blocks: Block[]): Block[] {
    return blocks.map(block => ({ ...block, id: block.id || cuid('b-assign-') }));
}


function parseContentToBlocks(content: Block[], variables: PromptVariable[]): Block[] {
  // First, ensure all incoming blocks from content have stable IDs if they don't already
  // This is crucial for deep comparison later.
  let blocksWithStableIds = assignBlockIds(content);

  const consolidatedBlocks: Block[] = [];
  if (blocksWithStableIds.length > 0) {
    blocksWithStableIds.forEach((block) => {
      if (block.type === 'text') {
        const lastConsolidated = consolidatedBlocks[consolidatedBlocks.length - 1];
        if (lastConsolidated && lastConsolidated.type === 'text') {
          // If merging text blocks, preserve the ID of the *first* block in the merged sequence
          // Or generate a new stable ID if that seems safer. For now, keep the last one's ID.
          lastConsolidated.value += block.value;
        } else {
          consolidatedBlocks.push({ ...block }); // Use the block with its existing/assigned ID
        }
      } else {
        consolidatedBlocks.push({ ...block }); // Use the block with its existing/assigned ID
      }
    });
  }

  // Ensure there's always at least one editable text block if content is empty or only variables
  if (consolidatedBlocks.length === 0 || consolidatedBlocks.every(b => b.type === 'variable')) {
    // Only add a fallback if there's genuinely nothing editable.
    // Use a fixed ID or a special temporary one that doesn't conflict.
    if (!consolidatedBlocks.some(b => b.type === 'text' && b.id === 'fixed-empty-fallback-block-id')) {
      consolidatedBlocks.push({ type: 'text', id: 'fixed-empty-fallback-block-id', value: '' });
    }
  }

  return consolidatedBlocks;
}

function serializeBlocks(blocks: Block[]): Block[] {
  // Filter out empty text blocks, but only if there's more than one block.
  // This ensures a single empty text block can exist for editing.
  const filteredBlocks = blocks.filter(b => !(b.type === 'text' && b.value === '' && blocks.length > 1));

  // Ensure all blocks have IDs before serialization.
  // This is primarily for the backend, but also for Apollo Client caching.
  const blocksWithIds = filteredBlocks.map(b => b.id ? b : { ...b, id: cuid('serialized-block-') });

  return blocksWithIds;
}

/* ---------- EditorPanel: Enhanced Prompt Creation ---------- */
function EditorPanel({
  prompt,
  onUpdate,
  onSnapshot,
  pendingNotes,
  setPendingNotes,
  isSnapshotting,
}: {
  prompt: Prompt
  onUpdate: (patch: Partial<Prompt>, onCompletedCallback?: (updatedData?: Prompt) => void, onErrorCallback?: () => void) => void
  onSnapshot: (notes?: string) => void
  pendingNotes: string;
  setPendingNotes: (notes: string) => void;
  isSnapshotting: boolean;
}) {
  console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Render.`);

  const [localTitle, setLocalTitle] = useState('');
  const [localContext, setLocalContext] = useState('');
  const [localModel, setLocalModel] = useState('gpt-4o');
  const [blocks, setBlocks] = useState<Block[]>([]);

  const isTitleEditing = useRef(false);
  const isContextEditing = useRef(false);
  const initializedPromptId = useRef<string | null>(null);

  // This ref stores the last *successfully committed* state from props.
  const lastCommittedPropsState = useRef<Partial<Prompt>>({});
  // New ref to store blocks before an optimistic update for reversion
  const lastKnownGoodBlocks = useRef<Block[]>([]);


  // --- Initialization Effect ---
  // This effect runs once when the 'prompt' prop changes to a new, fully loaded prompt.
  // It sets all local states from the incoming prop data.
  useEffect(() => {
    console.log(`[data loading sequence] [EditorPanel ${prompt.id}] useEffect (INITIALIZATION). prompt.id=${prompt.id}, initializedPromptId.current=${initializedPromptId.current}`);

    if (prompt.id !== initializedPromptId.current) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] INITIALIZING FROM PROPS: prompt is valid and ID is new. Setting local states.`);
      setLocalTitle(prompt.title || '');
      setLocalContext(prompt.context || '');
      setLocalModel(prompt.model || 'gpt-4o');
      const parsedBlocks = parseContentToBlocks(prompt.content || [], prompt.variables || []);
      setBlocks(parsedBlocks);
      setPendingNotes('');
      initializedPromptId.current = prompt.id;
      lastCommittedPropsState.current = {
        title: prompt.title,
        context: prompt.context,
        model: prompt.model,
        content: parsedBlocks // Store the parsed blocks for accurate comparison
      };
      lastKnownGoodBlocks.current = parsedBlocks; // Initialize last known good blocks
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] INITIALIZATION COMPLETE. lastCommittedPropsState and lastKnownGoodBlocks set.`);
    } else {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] INITIALIZATION skipped: already initialized for this prompt ID. `);
    }

  }, [prompt]);

  // --- Sync Effect (for external updates like restore version or initial details load) ---
  // This effect runs to keep local states in sync with 'prompt' prop, unless the user is actively editing.
  // Crucial for handling flicker: it should only update local `blocks` if the incoming `prompt.content`
  // from props genuinely differs from `lastKnownGoodBlocks.current` *and* there's no optimistic update pending.
  useEffect(() => {
    console.log(`[data loading sequence] [EditorPanel ${prompt.id}] useEffect (UPDATE sync). `);

    // Ensure we are initialized for this prompt.
    if (prompt.id !== initializedPromptId.current) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync skipped: not initialized for this prompt ID.`);
      return;
    }

    let changed = false;

    // Only sync from props if not actively editing AND local state differs from prop.
    if (!isTitleEditing.current && localTitle !== prompt.title) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync: Syncing localTitle: "${localTitle}" -> "${prompt.title}"`);
      setLocalTitle(prompt.title || '');
      changed = true;
    }
    if (!isContextEditing.current && localContext !== prompt.context) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync: Syncing localContext: "${localContext.substring(0, Math.min(localContext.length, 20))}..." -> "${(prompt.context || '').substring(0, Math.min((prompt.context || '').length, 20))}..."`);
      setLocalContext(prompt.context || '');
      changed = true;
    }
    if (localModel !== prompt.model) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync: Syncing localModel: "${localModel}" -> "${prompt.model}"`);
      setLocalModel(prompt.model || 'gpt-4o');
      changed = true;
    }

    const newBlocksFromProps = parseContentToBlocks(prompt.content || [], prompt.variables || []);
    // This is the key change for flicker:
    // Only update `blocks` from props if it genuinely differs from the `lastKnownGoodBlocks.current`
    // (which holds the last state that was either fetched OR successfully optimistically updated).
    if (!deepCompareBlocks(lastKnownGoodBlocks.current, newBlocksFromProps)) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync: Mismatch between last known good blocks and props. Re-parsing and setting blocks.`);
      setBlocks(newBlocksFromProps);
      lastKnownGoodBlocks.current = newBlocksFromProps; // Update last known good to reflect incoming props
      changed = true;
    } else {
        console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync: Props content matches last known good. Skipping blocks update to prevent flicker.`);
    }


    // If an external change forced a sync, update lastCommittedPropsState
    if (changed) {
        lastCommittedPropsState.current = {
            title: prompt.title,
            context: prompt.context,
            model: prompt.model,
            content: newBlocksFromProps
        };
        console.log(`[data loading sequence] [EditorPanel ${prompt.id}] UPDATE sync: lastCommittedPropsState updated due to external sync.`);
    }

  }, [
    prompt.content, prompt.variables, prompt.title, prompt.context, prompt.model,
    initializedPromptId.current,
    localTitle, localContext, localModel, // Include local states to react if they differ from props
  ]); // Removed 'blocks' from deps, as 'lastKnownGoodBlocks.current' is now the comparison point

  const logBlocks = useCallback((message: string, currentBlocks: Block[]) => {
    const formattedBlocks = currentBlocks.map(b =>
      b.type === 'text' ? `[TEXT:"${b.value.substring(0, Math.min(b.value.length, 30))}..."] (id:${b.id})` : `[VAR:${b.name || b.placeholder} (varId: ${b.varId}, id:${b.id})]`
    ).join(' | ');
    console.log(`[data loading sequence] [EditorPanel ${prompt.id}] --- BLOCKS STATE UPDATE --- ${message}\nCURRENT BLOCKS: ${formattedBlocks}`);
  }, [prompt.id]);

  // Removed debouncedLocalStateForPatch and its useEffect.
  // Now, update actions will be more direct.

  // New: Handlers for direct updates on blur/change for title, context, model
  const handleTitleBlur = useCallback(() => {
    isTitleEditing.current = false;
    console.log('[data loading sequence] [EditorPanel] isTitleEditing: false');
    if (localTitle !== (lastCommittedPropsState.current.title || '')) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Title blur: Sending update for title: "${localTitle}"`);
      // No optimistic UI for these text fields, just update on blur and let the backend response trigger state sync.
      // Update lastCommittedPropsState immediately to prevent re-sending the same patch before the query refetch completes.
      lastCommittedPropsState.current = { ...lastCommittedPropsState.current, title: localTitle };
      onUpdate({ title: localTitle || "Untitled Prompt" });
    }
  }, [localTitle, onUpdate, prompt.id]);

  const handleContextBlur = useCallback(() => {
    isContextEditing.current = false;
    console.log('[data loading sequence] [EditorPanel] isContextEditing: false');
    if (localContext !== (lastCommittedPropsState.current.context || '')) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Context blur: Sending update for context.`);
      lastCommittedPropsState.current = { ...lastCommittedPropsState.current, context: localContext };
      onUpdate({ context: localContext });
    }
  }, [localContext, onUpdate, prompt.id]);

  const handleModelChange = useCallback((newModel: string) => {
    console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Model select changed (local state):`, newModel);
    setLocalModel(newModel);
    if (newModel !== (lastCommittedPropsState.current.model || 'gpt-4o')) {
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Model change: Sending update for model: "${newModel}"`);
      lastCommittedPropsState.current = { ...lastCommittedPropsState.current, model: newModel };
      onUpdate({ model: newModel });
    }
  }, [onUpdate, prompt.id]);

  // New: Unified content update that will also trigger a prompt update
  const handleContentBlocksUpdate = useCallback((newBlocks: Block[], action: string = 'internal') => {
      const newSerializedContent = serializeBlocks(newBlocks);

      // Only send an update if content actually changed from the last committed state
      if (!deepCompareBlocks(newSerializedContent, lastCommittedPropsState.current.content || [])) {
          console.log(`[data loading sequence] [EditorPanel ${prompt.id}] handleContentBlocksUpdate triggered by ${action}: Content changed. Sending update.`);
          // Optimistic update for `blocks` state has already occurred in the calling function (e.g., moveBlock)

          onUpdate(
            { content: newSerializedContent },
            (updatedData?: Prompt) => { // onCompleted callback
              // If the server data matches our optimistic state, prevent re-render or flicker
              if (updatedData && deepCompareBlocks(updatedData.content || [], newSerializedContent)) {
                  console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Mutation for content successful and matches optimistic UI. Avoiding flicker.`);
                  // Explicitly update lastCommittedPropsState to reflect the server's confirmed state
                  lastCommittedPropsState.current = { ...lastCommittedPropsState.current, content: newSerializedContent };
              } else {
                  console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Mutation for content successful but server data differs or is null. Re-syncing from server.`);
                  // The `usePrompts` hook will handle reconciliation by triggering a re-fetch if needed.
                  // `useEffect (UPDATE sync)` will handle the prop change when details come back.
              }
              toast.success("Content saved!", { duration: 1000 });
            },
            () => { // onError callback
              // On error: Revert blocks state to last known good state
              console.error(`[data loading sequence] [EditorPanel ${prompt.id}] Mutation for content failed. Reverting UI.`);
              setBlocks(lastKnownGoodBlocks.current); // Revert to previous state
              toast.error("Failed to save content. Reverted.", { duration: 3000 });
              // Revert lastCommittedPropsState to reflect the old state as the server didn't accept the change
              lastCommittedPropsState.current = { ...lastCommittedPropsState.current, content: lastKnownGoodBlocks.current };
            }
          );
      } else {
          console.log(`[data loading sequence] [EditorPanel ${prompt.id}] handleContentBlocksUpdate triggered by ${action}: Content state updated, but no diff to last committed. No mutation sent.`);
          // If no mutation sent, `lastKnownGoodBlocks` is already updated by the individual action (e.g. moveBlock, updateTextBlock).
          // We also need to update `lastCommittedPropsState.current.content` to ensure subsequent `handleContentBlocksUpdate` calls
          // correctly detect whether a mutation is actually needed.
          lastCommittedPropsState.current = { ...lastCommittedPropsState.current, content: newSerializedContent };
      }
  }, [onUpdate, prompt.id]);


  const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id: string; name: string }) => {
    setBlocks(prev => {
      lastKnownGoodBlocks.current = prev; // Save current state for potential revert
      let copy = [...prev];
      const newVarBlock: Block = { type: 'variable', id: cuid('v-insert-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name };
      copy.splice(index, 0, newVarBlock);
      logBlocks(`After directly inserting variable "${variable.placeholder}" at index ${index} (optimistic)`, copy);
      handleContentBlocksUpdate(copy, `insertVariableAt:${variable.id}`); // Trigger mutation after optimistic update
      return copy;
    });
  }, [logBlocks, handleContentBlocksUpdate]);

  const insertTextAt = useCallback((index: number, text = '') => {
    setBlocks(prev => {
      lastKnownGoodBlocks.current = prev; // Save current state for potential revert
      let copy = [...prev];
      const newBlock: Block = { type: 'text', id: cuid('t-insert-'), value: text }
      copy.splice(index, 0, newBlock)
      logBlocks(`After directly inserting text block at index ${index} (optimistic)`, copy);
      handleContentBlocksUpdate(copy, `insertTextAt`); // Trigger mutation after optimistic update
      return copy
    })
  }, [logBlocks, handleContentBlocksUpdate]);

  const updateTextBlock = useCallback((id: string, value: string) => {
    setBlocks(prev => {
      lastKnownGoodBlocks.current = prev; // Save current state for potential revert
      let updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);

      const blockToRemove = updated.find(b => b.type === 'text' && b.id === id && b.value === '');
      if (blockToRemove && updated.length > 1 && blockToRemove.id !== 'fixed-empty-fallback-block-id') {
        updated = updated.filter(b => b.id !== id);
      }

      if (updated.length === 0 || updated.every(b => b.type === 'variable')) {
        if (!updated.some(b => b.type === 'text' && b.id === 'fixed-empty-fallback-block-id')) {
          updated.push({ type: 'text', id: 'fixed-empty-fallback-block-id', value: '' });
        }
      } else {
        if (updated.filter(b => b.type === 'text' && b.id === 'fixed-empty-fallback-block-id').length > 1) {
            updated = updated.filter(b => !(b.type === 'text' && b.id === 'fixed-empty-fallback-block-id' && b.value === ''));
            if (!updated.some(b => b.type === 'text' && b.id === 'fixed-empty-fallback-block-id')) {
                updated.push({ type: 'text', id: 'fixed-empty-fallback-block-id', value: '' });
            }
        }
      }
      handleContentBlocksUpdate(updated, `updateTextBlock:${id}`); // Trigger mutation after optimistic update
      return updated;
    });
  }, [handleContentBlocksUpdate]);

  const removeBlock = useCallback((index: number) => {
    console.log(`[data loading sequence] [EditorPanel ${prompt.id}] removeBlock called for index: ${index}`);
    setBlocks(prev => {
      lastKnownGoodBlocks.current = prev; // Save current state for potential revert
      let copy = [...prev];
      if (index < 0 || index >= copy.length) {
        console.warn(`[data loading sequence] [EditorPanel ${prompt.id}] removeBlock: Invalid index ${index}.`);
        return prev;
      }

      const removedBlock = copy[index];
      copy.splice(index, 1);
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}] removeBlock: Removed block of type ${removedBlock.type} with ID ${removedBlock.id}.`);

      if (copy.length === 0 || copy.every(b => b.type === 'variable')) {
        if (!copy.some(b => b.type === 'text' && b.id === 'fixed-empty-fallback-block-id')) {
          console.log('[data loading sequence] [EditorPanel] removeBlock: Adding empty fallback text block.');
          copy.push({ type: 'text', id: 'fixed-empty-fallback-block-id', value: '' });
        }
      }
      logBlocks(`After removing block at index ${index} (optimistic)`, copy);
      handleContentBlocksUpdate(copy, `removeBlock:${index}`); // Trigger mutation after optimistic update
      return copy
    })
  }, [logBlocks, prompt.id, handleContentBlocksUpdate]);

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[data loading sequence] [EditorPanel ${prompt.id}] moveBlock called from index: ${from} to index: ${to}`);
    setBlocks(prev => {
      lastKnownGoodBlocks.current = prev; // Save current state for potential revert
      let copy = [...prev];
      if (from < 0 || from >= copy.length || to < 0 || to > copy.length) {
        console.warn(`[data loading sequence] [EditorPanel ${prompt.id}] moveBlock: Invalid indices from ${from} to ${to}.`);
        return prev;
      }

      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);

      logBlocks(`After moving block from ${from} to ${to} (optimistic)`, copy);
      handleContentBlocksUpdate(copy, `moveBlock:${from}-${to}`); // Trigger mutation after optimistic update
      return copy;
    });
  }, [logBlocks, prompt.id, handleContentBlocksUpdate]);

  const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const [{ isOverBlockContainer, canDropBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    drop: (item: any, monitor) => {
      if (monitor.didDrop()) {
        console.log('[data loading sequence] [EditorPanel][Drop] Drop handled by a nested target, ignoring.');
        return;
      }
      console.log(`[data loading sequence] [EditorPanel ${prompt.id}][Drop] Item dropped into container.`, item);

      let targetIndex = blocks.length;
      if (blocks.length === 0) {
        targetIndex = 0;
      } else {
        const fallbackIndex = blocks.findIndex(b => b.id === 'fixed-empty-fallback-block-id');
        if (fallbackIndex !== -1) {
            targetIndex = fallbackIndex;
        }
      }


      if (monitor.getItemType() === ItemTypes.VARIABLE) {
        console.log(`[data loading sequence] [EditorPanel ${prompt.id}][Drop] Inserting variable at index ${targetIndex}.`);
        insertVariableAt(targetIndex, item);
      } else if (monitor.getItemType() === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        const isNoRealMove = (dragIndex === targetIndex) ||
          (dragIndex + 1 === targetIndex && dragIndex < targetIndex) ||
          (dragIndex === targetIndex + 1 && targetIndex < dragIndex);

        if (isNoRealMove) {
          console.log('[data loading sequence] [EditorPanel][Drop] No real move detected, ignoring block drop.');
          return;
        }

        console.log(`[data loading sequence] [EditorPanel ${prompt.id}][Drop] Moving block from ${dragIndex} to ${targetIndex}.`);
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

  }), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething, prompt.id, blocks]); // Added blocks to deps for accurate targetIndex

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="saas-section-header rounded-t-lg">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={localTitle}
            onChange={(e) => {
              console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Title input changed (local state):`, e.target.value);
              setLocalTitle(e.target.value);
            }}
            onFocus={() => { isTitleEditing.current = true; console.log('[data loading sequence] [EditorPanel] isTitleEditing: true'); }}
            onBlur={handleTitleBlur} // Direct update on blur
            className="h-10 text-sm font-medium"
            placeholder="Prompt title"
          />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={localModel}
            onChange={(e) => handleModelChange(e.target.value)} // Direct update on change
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
              console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Context textarea changed (local state):`, e.target.value.substring(0, 50) + '...');
              setLocalContext(e.target.value);
            }}
            onFocus={() => { isContextEditing.current = true; console.log('[data loading sequence] [EditorPanel] isContextEditing: true'); }}
            onBlur={handleContextBlur} // Direct update on blur
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
            {/* Render conditional text for empty state only if no blocks and nothing is being dragged */}
            {blocks.length === 0 && !isDraggingSomething ? (
                <div className="flex-1 text-center py-12 text-gray-400">
                    Drag variables or click "+ Add text" to start building your prompt.
                    <button
                      onClick={() => {
                        console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Add text button clicked (empty state).`);
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
                        {/* Only show "Add text" hover between blocks or at the very beginning/end */}
                        {(i === 0) && (
                            <HoverAddTextBlock
                                key={`hover-insert-before-${b.id}`} // Use a distinct key
                                index={0}
                                insertTextAt={insertTextAt}
                            />
                        )}
                        <BlockRenderer
                            key={b.id} // Ensure a stable key for BlockRenderer
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

            {/* Empty container drop target */}
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
              console.log(`[data loading sequence] [EditorPanel ${prompt.id}] Save button clicked.`);
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
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (block.type === 'text') {
      // Only update innerText if the current DOM value differs from block.value AND it's not currently focused
      if (contentEditableRef.current && contentEditableRef.current.innerText !== block.value && document.activeElement !== contentEditableRef.current) {
        contentEditableRef.current.innerText = block.value;
      }
    }
  }, [block.type, block.value]); // Dependencies should be stable

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
      // Allow dragging of the fixed empty fallback block only if there are other blocks
      // Or if it's not a fallback block
      return block.id !== 'fixed-empty-fallback-block-id' || allBlocks.length > 1;
    },
    collect: (m) => {
      const dragging = m.isDragging();
      const currentCanDrag = m.canDrag();
      return { isDragging: dragging, canDrag: currentCanDrag };
    },
  }), [block.id, index, block.type, block.value, block.placeholder, block.name, block.varId, allBlocks.length]); // Added allBlocks.length for canDrag

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

      // Prevent dropping a block onto itself
      if (draggingItemType === ItemTypes.BLOCK && (item as { id: string }).id === block.id) {
        if (localDropTargetPosition !== null) {
          setLocalDropTargetPosition(null);
        }
        return;
      }

      // Prevent dropping a block just before/after itself if it's the only block
      if (draggingItemType === ItemTypes.BLOCK && (item as { index: number }).index === index) {
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
          (dragIndex + 1 === targetIndex && dragIndex < targetIndex) ||
          (dragIndex === targetIndex + 1 && targetIndex < dragIndex);

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
        ref={blockRootRef}
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}

        <div
          ref={connectDragSource}
          className={`cursor-grab shrink-0 flex items-center justify-center w-10 h-10 bg-blue-100 border border-blue-200 rounded-md text-blue-600 shadow-md transition-opacity duration-100 ${canDrag ? 'opacity-100' : 'opacity-50 cursor-not-allowed'} group-hover:opacity-100`}
        >
          <GripVertical className="h-6 w-6" />
        </div>

        <div
          className={`flex-1 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md `}
        >
          <div className="text-sm font-medium">{block.name || block.placeholder}</div>
          <button
            onClick={() => {
              removeBlock(index);
            }}
            className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity"
            aria-label={`Remove variable block`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )

  } else { // type === 'text'
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        return;
      }
      // Allow backspace only if content is empty or selection is at start
      if (e.key === 'Backspace' && contentEditableRef.current?.innerText === '' && window.getSelection()?.anchorOffset === 0) {
        e.preventDefault();
        // If it's the last remaining block or the fixed fallback block, don't remove, just clear value
        if (allBlocks.length === 1 && allBlocks[0].id === block.id || block.id === 'fixed-empty-fallback-block-id') {
          updateTextBlock(block.id, '');
        } else {
          removeBlock(index);
        }
      }
    }

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      const newText = e.currentTarget.innerText;
      updateTextBlock(block.id, newText);
    }

    const onBlur = () => {
      const text = contentEditableRef.current?.innerText ?? ''
      // Only remove if it's not the last remaining block AND it's not the fixed fallback block AND it's empty
      if (text === '' && allBlocks.length > 1 && block.id !== 'fixed-empty-fallback-block-id') {
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
            className={`cursor-grab shrink-0 flex items-center justify-center w-10 h-10 -ml-3 mr-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-md transition-opacity duration-100 ${canDrag ? 'opacity-100' : 'opacity-50 cursor-not-allowed'} group-hover:opacity-100`}
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
          {/* Show remove button only if not the last block OR it's not the fixed fallback AND it's not empty */}
          {(allBlocks.length > 1 || (block.type === 'text' && block.value !== '') && block.id !== 'fixed-empty-fallback-block-id') ? (
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
      <div className={`absolute top-0 w-full h-full bg-transparent transition-all duration-100 ease-in-out ${isHovering ? 'bg-gray-100/50' : 'bg-transparent'}`}></div>

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
    console.log('[data loading sequence] [VersionsPanel] useEffect: versions or selectedVersionId changed. Versions count:', versions.length, 'selectedVersionId:', selectedVersionId);
    if (!selectedVersionId && versions.length > 0) {
      console.log('[data loading sequence] [VersionsPanel] No version selected, defaulting to latest:', versions[0].id);
      onSelectVersion(versions[0].id);
    }
  }, [selectedVersionId, versions, onSelectVersion]);

  if (!selectedVersion) {
    console.log('[data loading sequence] [VersionsPanel] No selected version to display. Rendering placeholder.');
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        No version selected.
      </div>
    );
  }

  console.log('[data loading sequence] [VersionsPanel] Displaying selected version:', selectedVersion.id, selectedVersion.notes);
  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <h3 className="font-semibold text-lg mb-2">{selectedVersion.notes || 'No Notes'}</h3>
      <p className="text-sm text-gray-500 mb-4">Last Edited: {new Date(selectedVersion.createdAt).toLocaleString()}</p>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Version Content</label>
        <Textarea
          readOnly
          value={stringifyBlocksForDisplay(selectedVersion.content || [])}
          rows={10}
          className="font-mono overflow-y-auto bg-gray-50 dark:bg-gray-800"
          placeholder="No content available for this version."
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Version Context</label>
        <Textarea
          readOnly
          value={selectedVersion.context || ''}
          rows={5}
          className="font-mono overflow-y-auto bg-gray-50 dark:bg-gray-800"
          placeholder="No context available for this version."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Variables in this Version</label>
        {selectedVersion.variables && selectedVersion.variables.length > 0 ? (
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

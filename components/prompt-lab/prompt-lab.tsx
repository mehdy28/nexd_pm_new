'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { PromptVariableType, type Prompt, type Version, type PromptVariable, type PromptVariableSource } from '@/components/prompt-lab/store';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, Plus, GitCommit, Text, Trash2, GripVertical, Loader2 } from "lucide-react"
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"
import { VariableDiscoveryBuilder } from "./variable-discovery-builder"
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { usePromptDetails } from "@/hooks/usePromptDetails";


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
      if ((b1.value ?? '') !== (b2.value ?? '')) {
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

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node: T) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else if ('current' in ref) (ref as any).current = node;
    });
  };
}

function cuid(prefix: string = ''): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function renderPrompt(
  contentBlocks: Block[],
  context: string,
  variables: PromptVariable[],
  variableValues: Record<string, string>,
  projectId?: string
): Promise<string> {
  let renderedContent = '';

  renderedContent = contentBlocks.map(block => {
    if (block.type === 'text') {
      return block.value ?? '';
    } else if (block.type === 'variable') {
      const matchingVariable = variables.find(v => v.id === block.varId);
      const displayValue = variableValues[block.placeholder] || (matchingVariable?.defaultValue || '');

      if (displayValue) {
        return `**${displayValue}**`;
      } else if (matchingVariable?.source) {
        return `**${matchingVariable.name} (dynamic)**`;
      }
      return `**${block.placeholder}**`;
    }
    return '';
  }).join('');

  let renderedContext = context ?? '';

  for (const variable of variables) {
    let valueToSubstitute = variableValues[variable.placeholder] || variable.defaultValue || '';

    if (valueToSubstitute) {
      valueToSubstitute = `**${valueToSubstitute}**`;
    } else if (variable.source) {
       valueToSubstitute = `**${variable.name} (dynamic)**`;
    } else {
      valueToSubstitute = `**${variable.placeholder}**`;
    }

    const regex = new RegExp(variable.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');

    if (renderedContext.includes(variable.placeholder)) {
        renderedContext = renderedContext.replace(regex, valueToSubstitute);
    }
  }

  const lines = [];

  const contentPartsWithNewlines = contentBlocks.map(block => {
    if (block.type === 'text') {
      return block.value ?? '';
    } else if (block.type === 'variable') {
      const matchingVariable = variables.find(v => v.id === block.varId);
      const displayValue = variableValues[block.placeholder] || (matchingVariable?.defaultValue || '');

      if (displayValue) {
        return `**${displayValue}**`;
      } else if (matchingVariable?.source) {
        return `**${matchingVariable.name} (dynamic)**`;
      }
      return `**${block.placeholder}**`;
    }
    return '';
  });

  const finalRenderedContent = contentPartsWithNewlines.filter(part => part.trim() !== '').join('\n');


  if (finalRenderedContent) {
    lines.push(finalRenderedContent);
  }

  if (renderedContext) {
    if (finalRenderedContent) {
      lines.push("\n");
    }
    lines.push(renderedContext);
  }

  return lines.join("\n");
}

/* ---------- MAIN COMPONENT ---------- */
export function PromptLab({ prompt, onBack, projectId }: { prompt: Prompt; onBack: () => void; projectId?: string }) {
  const {
    updatePromptDetails,
    snapshotPrompt,
    restorePromptVersion,
    updateVersionDescription,
    selectedPromptDetails,
    fetchVersionContent,
    loadingVersionContent,
    currentLoadedVersionContent,
    loadingDetails
  } = usePromptDetails(prompt.id, projectId);

  const currentPrompt = selectedPromptDetails || prompt;


  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
  const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables")
  const [showVariableBuilder, setShowVariableBuilder] = useState(false);
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})
  const [renderedPreview, setRenderedPreview] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");

  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);


  // Memoized content, context, and variables for the editor.
  const editorContent = useMemo(() => {
    if (selectedVersionId !== null && currentLoadedVersionContent?.id === selectedVersionId) {
      console.log('[PromptLab] [Trace: EditorContentMemo] Using loaded version content for editor.');
      return currentLoadedVersionContent.content;
    }
    console.log('[PromptLab] [Trace: EditorContentMemo] Using active prompt content for editor.');
    return currentPrompt.content;
  }, [currentPrompt.content, selectedVersionId, currentLoadedVersionContent]);

  const editorContext = useMemo(() => {
    if (selectedVersionId !== null && currentLoadedVersionContent?.id === selectedVersionId) {
      console.log('[PromptLab] [Trace: EditorContextMemo] Using loaded version context for editor.');
      return currentLoadedVersionContent.context ?? '';
    }
    console.log('[PromptLab] [Trace: EditorContextMemo] Using active prompt context.');
    return currentPrompt.context ?? '';
  }, [currentPrompt.context, selectedVersionId, currentLoadedVersionContent]);

  const editorVariables = useMemo(() => {
    if (selectedVersionId !== null && currentLoadedVersionContent?.id === selectedVersionId) {
      console.log('[PromptLab] [Trace: EditorVariablesMemo] Using loaded version variables for editor.');
      return currentLoadedVersionContent.variables;
    }
    console.log('[PromptLab] [Trace: EditorVariablesMemo] Using active prompt variables.');
    return currentPrompt.variables;
  }, [currentPrompt.variables, selectedVersionId, currentLoadedVersionContent]);

  // Determine the name of the currently displayed version
  const currentVersionName = useMemo(() => {
    // If selectedVersionId is null, it implicitly means the currently active prompt state.
    // The name of this "active" state should be derived from the main prompt's title.
    if (selectedVersionId === null) {
      return currentPrompt.title || "Untitled Prompt (Active)"; // Use main prompt title
    }
    const version = currentPrompt.versions.find(v => v.id === selectedVersionId);
    return version?.notes || "Untitled Version";
  }, [selectedVersionId, currentPrompt.title, currentPrompt.versions]);


  // Combined loading state for the EditorPanel's actual content.
  const isLoadingEditorContent = loadingDetails || (selectedVersionId !== null && loadingVersionContent);


  // Effect to manage selected version and trigger content fetch
  useEffect(() => {
    console.log('[PromptLab] [Trace: RootEffect] prompt prop or selectedVersionId changed. Prompt ID:', currentPrompt.id, 'Versions:', currentPrompt.versions.length, 'Selected Version ID:', selectedVersionId);
    if (currentPrompt) {
      const versions = currentPrompt.versions || [];
      const hasVersions = versions.length > 0;

      // Ensure a version is always selected (either a historical one or implied "Active Prompt")
      if (selectedVersionId === undefined) { // Initial load, default to active
        console.log('[PromptLab] [Trace: RootEffect] Initial load, defaulting to Active Prompt (null).');
        setSelectedVersionId(null);
      } else if (selectedVersionId !== null && !versions.some(v => v.id === selectedVersionId)) {
        // A historical version was selected, but it's no longer in the list (e.g., deleted or refetched with old ID)
        console.log('[PromptLab] [Trace: RootEffect] Selected historical version not found, defaulting to Active Prompt (null).');
        setSelectedVersionId(null);
      }

      // Logic to trigger fetching content for a selected historical version
      if (selectedVersionId !== null && currentPrompt.id && currentLoadedVersionContent?.id !== selectedVersionId) {
        console.log(`[PromptLab] [Trace: RootEffect] Historical version ${selectedVersionId} selected, and its content is not yet loaded. Triggering fetch.`);
        // --- FIX IS HERE ---
        // fetchVersionContent(currentPrompt.id, selectedVersionId); // ORIGINAL: Passed two args
        fetchVersionContent(selectedVersionId); // CORRECTED: Pass only versionId, as the hook closes over prompt.id
      } else if (selectedVersionId === null) {
        console.log('[PromptLab] [Trace: RootEffect] Active Prompt selected, editor will show active content.');
      }

      // Update preview variables when main prompt variables change
      const initialPreviewValues: Record<string, string> = {};
      currentPrompt.variables.forEach(v => {
        if (!v.source) {
          initialPreviewValues[v.placeholder] = v.defaultValue ?? '';
        } else {
          initialPreviewValues[v.placeholder] = `[${v.name} (dynamic)]`;
        }
      });
      console.log('[PromptLab] [Trace: RootEffect] Updating previewVariableValues based on prompt.variables. Count:', currentPrompt.variables.length);
      setPreviewVariableValues(initialPreviewValues);
    }
  }, [currentPrompt, selectedVersionId, fetchVersionContent, currentLoadedVersionContent, loadingDetails]);


  useEffect(() => {
    if (currentPrompt) {
      console.log('[PromptLab] [Trace: PreviewEffect] Generating preview based on editorContent, editorContext, editorVariables, and previewVariableValues.');
      const generatePreview = async () => {
        const preview = await renderPrompt(editorContent, editorContext, editorVariables, previewVariableValues, projectId);
        setRenderedPreview(preview);
      };
      generatePreview();
    }
  }, [currentPrompt, editorContent, editorContext, editorVariables, previewVariableValues, projectId]);

  // selectedVersionMetadata is only for the metadata of the selected historical version
  const selectedVersionMetadata = useMemo(() => currentPrompt?.versions.find((v) => v.id === selectedVersionId) || null, [currentPrompt, selectedVersionId])

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const handleUpdatePrompt = useCallback((patch: Partial<Prompt>) => {
    console.log('[PromptLab] [Trace: HandleUpdate] handleUpdatePrompt called with patch keys:', Object.keys(patch));

    if (patch.variables) {
      patch.variables = patch.variables.map(v => {
        const { __typename, ...variableWithoutTypename } = v as PromptVariable & { __typename?: string };
        return { ...variableWithoutTypename, id: variableWithoutTypename.id || cuid('patch-var-') };
      }) as PromptVariable[];
      console.log('[PromptLab] [Trace: HandleUpdate] Variables in patch adjusted (IDs ensured, __typename removed). New count:', patch.variables.length);
    }

    if (patch.content && Array.isArray(patch.content)) {
        console.log('[PromptLab] [Trace: HandleUpdate] Content patch is an array of blocks, ensuring correct type.');

        const cleanedContent = patch.content.map(block => {
          const { __typename, ...blockWithoutTypename } = block;

          if (blockWithoutTypename.type === 'text') {
            const { varId, placeholder, name, ...rest } = blockWithoutTypename;
            return { ...rest, value: rest.value ?? '' };
          } else if (blockWithoutTypename.type === 'variable') {
            const { value, ...rest } = blockWithoutTypename;
            return rest;
          }
          return blockWithoutTypename;
        });

        console.log('[PromptLab] [Trace: HandleUpdate] Sending cleaned content payload:', JSON.stringify(cleanedContent, null, 2));
        patch.content = cleanedContent as unknown as Block[];
    }
    updatePromptDetails(currentPrompt.id, patch);
  }, [currentPrompt.id, updatePromptDetails]);

  const handleSnapshot = useCallback(async (notes?: string) => {
    setIsSnapshotting(true);
    console.log('[PromptLab] [Trace: HandleSnapshot] Attempting to snapshot prompt', currentPrompt.id, 'with notes:', notes);
    try {
      await snapshotPrompt(notes);
      toast.success("Prompt version saved!");
      setPendingNotes('');
      setSelectedVersionId(null); // After snapshot, the new snapshot becomes the 'active' one.
    } catch (error) {
      console.error(`[PromptLab] [Error: HandleSnapshot] Failed to snapshot prompt ${currentPrompt.id}:`, error);
      toast.error("Failed to save version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsSnapshotting(false);
      console.log('[PromptLab] [Trace: HandleSnapshot] Snapshot operation finished.');
    }
  }, [currentPrompt.id, snapshotPrompt]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    setIsRestoring(true);
    console.log('[PromptLab] [Trace: HandleRestore] Attempting to restore prompt', currentPrompt.id, 'from version', versionId);
    try {
      await restorePromptVersion(versionId);
      toast.success("Prompt restored from version!");
      setSelectedVersionId(null); // After restore, the main prompt is active
    } catch (error) {
      console.error(`[PromptLab] [Error: HandleRestore] Failed to restore prompt ${currentPrompt.id} from version ${versionId}:`, error);
      toast.error("Failed to restore version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
      setIsRestoring(false);
      console.log('[PromptLab] [Trace: HandleRestore] Restore operation finished.');
    }
  }, [currentPrompt.id, restorePromptVersion]);

  const handleCreateVariable = useCallback((newVariable: Omit<PromptVariable, 'id'>) => {
    console.log('[PromptLab] [Trace: HandleCreateVar] Creating new variable:', newVariable.name);
    const variableWithId: PromptVariable = {
      ...newVariable,
      id: cuid('p-var-'),
    };
    const updatedVariables = [...currentPrompt.variables, variableWithId];
    console.log('[PromptLab] [Trace: HandleCreateVar] Calling handleUpdatePrompt with updated variables count:', updatedVariables.length);
    handleUpdatePrompt({ variables: updatedVariables });
    setShowVariableBuilder(false);
  }, [currentPrompt.variables, handleUpdatePrompt]);

  const handleRemoveVariable = useCallback((variableId: string) => {
    console.log('[PromptLab] [Trace: HandleRemoveVar] Removing variable with ID:', variableId);
    const updatedVariables = currentPrompt.variables.filter(v => v.id !== variableId);
    console.log('[PromptLab] [Trace: HandleRemoveVar] Calling handleUpdatePrompt with updated variables count:', updatedVariables.length);
    handleUpdatePrompt({ variables: updatedVariables });
  }, [currentPrompt.variables, handleUpdatePrompt]);

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
                    console.log('[PromptLab] [Trace: LeftTabChange] Left Tab changed to:', index === 0 ? "Versions" : "Variables");
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
                      <Button className="ml-auto h-9 btn-primary" onClick={() => handleSnapshot(pendingNotes || `Version saved on ${new Date().toLocaleString()}`)} disabled={isSnapshotting}>
                        {isSnapshotting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} New
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      {currentPrompt.versions.length === 0 ? (
                        <div className="text-sm text-slate-500">No versions yet. Make changes and save a snapshot to create one.</div>
                      ) : (
                        <ul className="space-y-2">
                          {/* Entry for the currently active (main) prompt state */}
                            <li className="rounded-lg border p-3 hover:bg-slate-50 transition">
                                <div className="flex items-start gap-2">
                                    <button
                                        className={`flex-1 text-left rounded-md p-2 -m-2
                                                  ${selectedVersionId === null ? 'bg-blue-100 border-blue-300' : ''}`}
                                        onClick={() => setSelectedVersionId(null)}
                                        title={currentPrompt.title || "Active Prompt"}
                                    >
                                        <div className="text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis"> {/* Apply proper truncation */}
                                            {currentPrompt.title || "Active Prompt"}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {new Date(currentPrompt.updatedAt).toLocaleString()}
                                        </div>
                                    </button>
                                </div>
                            </li>

                          {currentPrompt.versions.map((v) => (
                            <li key={v.id} className="rounded-lg border p-3 hover:bg-slate-50 transition">
                              <div className="flex items-start gap-2">
                                <button
                                    className={`flex-1 text-left rounded-md p-2 -m-2
                                                  ${selectedVersionId === v.id ? 'bg-blue-100 border-blue-300' : ''}`}
                                    onClick={() => setSelectedVersionId(v.id)}
                                    title={v.notes}
                                >
                                  <div className="text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis"> {/* Apply proper truncation */}
                                    {v.notes}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
                                </button>
                                {selectedVersionId !== v.id && ( // Only show restore if not the currently selected version
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
                      <Button className="w-full h-9 btn-primary" onClick={() => {
                        console.log('[PromptLab] [Trace: VarTab] Variables tab: Create New Variable button clicked.');
                        setShowVariableBuilder(true);
                      }}>
                        <Plus className="mr-1 h-4 w-4" /> Create New Variable
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      {currentPrompt.variables.length === 0 ? (
                        <div className="text-sm text-slate-500">No variables yet. Click "Create New Variable" to get started.</div>
                      ) : (
                        <ul className="space-y-2">
                          {currentPrompt.variables.map((v) => (
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
            <div className="saas-card h-full min-h-0 flex flex-col overflow-hidden relative">
                {/* Loader overlay for the right panel */}
                {(isLoadingEditorContent) && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Tabs value={rightTab} onValueChange={(v) => {
                    setRightTab(v as any);
                    console.log('[PromptLab] [Trace: RightTabChange] Right Tab changed to:', v);
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
                          prompt={currentPrompt}
                          onUpdate={handleUpdatePrompt}
                          onSnapshot={handleSnapshot}
                          pendingNotes={pendingNotes}
                          setPendingNotes={setPendingNotes}
                          isSnapshotting={isSnapshotting}
                          contentToDisplay={editorContent}
                          contextToDisplay={editorContext}
                          variablesToDisplay={editorVariables}
                          isEditingEnabled={!isLoadingEditorContent}
                          currentVersionName={currentVersionName} // Pass version name to editor panel
                        />
                    </TabsContent>

                    <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                      <VersionsPanel
                        promptId={currentPrompt.id}
                        versions={currentPrompt.versions || []}
                        selectedVersionId={selectedVersionId}
                        onSelectVersion={setSelectedVersionId}
                        onRestoreVersion={handleRestoreVersion}
                        updateVersionDescription={updateVersionDescription}
                        isRestoring={isRestoring}
                        contentToDisplay={editorContent}
                        contextToDisplay={editorContext}
                        variablesToDisplay={editorVariables}
                        loadingVersionContent={loadingVersionContent}
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="m-0 outline-none p-4 flex-1 flex flex-col">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">Preview</div>
                        <Button size="sm" onClick={() => copy(renderedPreview)} className="h-8 btn-primary">
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </Button>
                      </div>

                      <pre
                        className="font-mono whitespace-pre-wrap bg-[#f8f8f8] text-[#333] border border-[#e0e0e0] rounded-md p-2 w-full"
                        style={{
                          lineHeight: "1.5",
                          whiteSpace: "pre-wrap",
                          wordWrap: "break-word",
                        }}
                      >
                        {renderedPreview}
                      </pre>

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
      className={`cursor-grab rounded px-2 py-1 mb-2 border ${
        isDragging ? 'opacity-0' : 'bg-gray-100'
      } flex items-center justify-between group`}
    >
      <div>
        <div className="font-semibold overflow-hidden whitespace-nowrap text-ellipsis">{variable.name}</div> {/* Truncate variable name */}
        <div className="text-xs text-gray-500 mt-1">({variable.placeholder})</div> {/* Placeholder below name */}
      </div>
      <button
        onClick={() => onRemove(variable.id)}
        className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity"
        aria-label={`Remove variable ${variable.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}


/* ---------- BLOCK-BASED EDITOR ---------- */

type Block =
  | { type: 'text'; id: string; value: string; __typename: 'ContentBlock' }
  | { type: 'variable'; id: string; varId: string; placeholder: string; name: string; __typename: 'ContentBlock' }

/* ---------- EditorPanel: Enhanced Prompt Creation ---------- */
function EditorPanel({
  prompt,
  onUpdate,
  onSnapshot,
  pendingNotes,
  setPendingNotes,
  isSnapshotting,
  contentToDisplay,
  contextToDisplay,
  variablesToDisplay,
  isEditingEnabled,
  currentVersionName, // NEW: Version name prop
}: {
  prompt: Prompt
  onUpdate: (patch: Partial<Prompt>) => void
  onSnapshot: (notes?: string) => void
  pendingNotes: string;
  setPendingNotes: (notes: string) => void;
  isSnapshotting: boolean;
  contentToDisplay: Block[];
  contextToDisplay: string;
  variablesToDisplay: PromptVariable[];
  isEditingEnabled: boolean;
  currentVersionName: string; // NEW
}) {
  const componentId = useMemo(() => cuid('editor-'), []);
  console.log(`[EditorPanel ${componentId}] [Trace: Render] Rendered with prompt ID: ${prompt.id}, Title: "${prompt.title}", Content length: ${contentToDisplay.length}`);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [localTitle, setLocalTitle] = useState('');
  const [localContext, setLocalContext] = useState('');
  const [localModel, setLocalModel] = useState('');

  const hasDataLoadedRef = useRef(false);
  const isFirstDebounceBlocks = useRef(true);
  const isFirstDebounceTitle = useRef(true);
  const isFirstDebounceContext = useRef(true);
  const isFirstDebounceModel = useRef(true);

  const lastKnownPropValues = useRef({
    id: '',
    title: '',
    context: '',
    model: '',
    content: [] as Block[],
  });

  // Effect to synchronize local state with *props* (prompt.title/model, and content/contextToDisplay)
  useEffect(() => {
    console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Syncing local states with props. Prompt ID: ${prompt.id}. isEditingEnabled: ${isEditingEnabled}.`);

    if (prompt.id) {
        const currentContent = contentToDisplay ?? [];
        const currentContext = contextToDisplay ?? '';

        // Check if prompt ID or the *displayed content/context* has truly changed,
        const contentChanged = !deepCompareBlocks(currentContent, lastKnownPropValues.current.content);
        const contextChanged = currentContext !== (lastKnownPropValues.current.context ?? '');

        const isNewPromptOrMajorContentChange = prompt.id !== lastKnownPropValues.current.id || contentChanged || contextChanged;

        if (isNewPromptOrMajorContentChange || !hasDataLoadedRef.current) {
            console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] New prompt/major content change or initial load. Resetting local states.`);

            const normalizedInitialBlocks = currentContent.length > 0
                                            ? currentContent.map(b => ({ ...b, __typename: 'ContentBlock' })) as Block[]
                                            : [{ type: 'text', id: cuid('t-initial-empty'), value: '', __typename: 'ContentBlock' }];

            setBlocks(normalizedInitialBlocks);
            setLocalTitle(prompt.title);
            setLocalContext(currentContext);
            setLocalModel(prompt.model);
            setPendingNotes('');

            lastKnownPropValues.current = {
                id: prompt.id,
                title: prompt.title,
                context: currentContext,
                model: prompt.model,
                content: normalizedInitialBlocks,
            };
            hasDataLoadedRef.current = true;
            isFirstDebounceBlocks.current = true;
            isFirstDebounceTitle.current = true;
            isFirstDebounceContext.current = true;
            isFirstDebounceModel.current = true;

            console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] lastKnownPropValues updated. hasDataLoadedRef set to true. All isFirstDebounce flags reset.`);
        } else {
            console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Minor prop updates. Performing granular updates if local state is stale.`);

            if (prompt.title !== localTitle && prompt.title !== lastKnownPropValues.current.title) {
                console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Prop title updated to "${prompt.title}", updating localTitle.`);
                setLocalTitle(prompt.title);
                lastKnownPropValues.current.title = prompt.title;
            }
            if (currentContext !== localContext && currentContext !== (lastKnownPropValues.current.context ?? '')) {
                console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Prop context updated, updating localContext.`);
                setLocalContext(currentContext);
                lastKnownPropValues.current.context = currentContext;
            }
            if (prompt.model !== localModel && prompt.model !== lastKnownPropValues.current.model) {
                console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Prop model updated to "${prompt.model}", updating localModel.`);
                setLocalModel(prompt.model);
                lastKnownPropValues.current.model = prompt.model;
            }

            const normalizedCurrentPropContent = currentContent.length > 0
                                                    ? currentContent.map(b => ({ ...b, __typename: 'ContentBlock' })) as Block[]
                                                    : [{ type: 'text', id: cuid('t-normalized-empty-sync'), value: '', __typename: 'ContentBlock' }];

            if (!deepCompareBlocks(blocks, normalizedCurrentPropContent) && !deepCompareBlocks(lastKnownPropValues.current.content, normalizedCurrentPropContent)) {
                console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Prop content updated, updating blocks state.`);
                setBlocks(normalizedCurrentPropContent);
                lastKnownPropValues.current.content = normalizedCurrentPropContent;
            }
        }
    } else {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_SyncProps] Prompt ID is undefined/null. Skipping sync.`);
    }
  }, [prompt.id, prompt.title, prompt.model, contentToDisplay, contextToDisplay, componentId, isEditingEnabled]);

  const logBlocks = useCallback((message: string, currentBlocks: Block[]) => {
    const formattedBlocks = currentBlocks.map(b =>
      b.type === 'text' ? `[TEXT:"${(b.value ?? '').substring(0, Math.min((b.value ?? '').length, 30))}..."] (id:${b.id})` : `[VAR:${b.name || b.placeholder} (varId: ${b.varId}, id:${b.id})]`
    ).join(' | ');
    console.log(`[EditorPanel ${componentId}] --- BLOCKS STATE UPDATE --- ${message}\nCURRENT BLOCKS: ${formattedBlocks}`);
  }, [componentId]);

  const [debouncedBlocks] = useDebounce(blocks, 500);

  useEffect(() => {
    console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedBlocks] debouncedBlocks changed. Value: `, debouncedBlocks);

    if (!isEditingEnabled) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedBlocks] Skipping update: isEditingEnabled is false.`);
        return;
    }

    if (isFirstDebounceBlocks.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedBlocks] First debounce run for blocks. Marking as processed. Skipping update.`);
        isFirstDebounceBlocks.current = false;
        return;
    }

    if (!hasDataLoadedRef.current) {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedBlocks] Skipping update: hasDataLoadedRef=${hasDataLoadedRef.current}. Data not yet loaded.`);
      return;
    }

    const currentContentProp = (contentToDisplay ?? []) as Block[];
    const normalizedCurrentPropContent = currentContentProp.length > 0
                                            ? currentContentProp.map(b => ({ ...b, __typename: 'ContentBlock' })) as Block[]
                                            : [{ type: 'text', id: cuid('t-normalized-empty-debounced'), value: '', __typename: 'ContentBlock' }];

    if (!deepCompareBlocks(normalizedCurrentPropContent, debouncedBlocks) && !deepCompareBlocks(lastKnownPropValues.current.content, debouncedBlocks)) {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedBlocks] Debounced blocks differ from prop content AND last known sent value. Calling onUpdate. Debounced:`, debouncedBlocks, "Prop:", normalizedCurrentPropContent, "LastSent:", lastKnownPropValues.current.content);
      onUpdate({ content: debouncedBlocks });
      lastKnownPropValues.current.content = debouncedBlocks;
    } else {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedBlocks] Debounced blocks match prop content OR last sent value. No update needed. Debounced:`, debouncedBlocks, "Prop:", normalizedCurrentPropContent, "LastSent:", lastKnownPropValues.current.content);
    }
  }, [debouncedBlocks, onUpdate, contentToDisplay, prompt.id, componentId, isEditingEnabled]);


  const [debouncedLocalTitle] = useDebounce(localTitle, 300);
  const [debouncedLocalContext] = useDebounce(localContext, 300);
  const [debouncedLocalModel] = useDebounce(localModel, 300);

  useEffect(() => {
    console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedTitle] debouncedLocalTitle changed. Value: "${debouncedLocalTitle}"`);
    if (!isEditingEnabled) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedTitle] Skipping update: isEditingEnabled is false.`);
        return;
    }
    if (isFirstDebounceTitle.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedTitle] First debounce run for title. Marking as processed. Skipping update.`);
        isFirstDebounceTitle.current = false;
        return;
    }
    if (!hasDataLoadedRef.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedTitle] Skipping update: hasDataLoadedRef=${hasDataLoadedRef.current}. Data not yet loaded.`);
        return;
    }

    if (debouncedLocalTitle !== prompt.title && debouncedLocalTitle !== lastKnownPropValues.current.title) {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedTitle] Debounced title "${debouncedLocalTitle}" differs from prop title "${prompt.title}" AND last sent "${lastKnownPropValues.current.title}". Calling onUpdate.`);
      onUpdate({ title: debouncedLocalTitle });
      lastKnownPropValues.current.title = debouncedLocalTitle;
    } else {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedTitle] Debounced title "${debouncedLocalTitle}" matches prop title "${prompt.title}" OR last sent value "${lastKnownPropValues.current.title}". No update needed.`);
    }
  }, [debouncedLocalTitle, prompt.title, onUpdate, componentId, isEditingEnabled]);

  useEffect(() => {
    const safeDebouncedLocalContext = debouncedLocalContext ?? '';
    const safeContextToDisplay = contextToDisplay ?? '';

    console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedContext] debouncedLocalContext changed. Value: "${safeDebouncedLocalContext.substring(0, Math.min(safeDebouncedLocalContext.length, 50))}..."`);
    if (!isEditingEnabled) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedContext] Skipping update: isEditingEnabled is false.`);
        return;
    }
    if (isFirstDebounceContext.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedContext] First debounce run for context. Marking as processed. Skipping update.`);
        isFirstDebounceContext.current = false;
        return;
    }
    if (!hasDataLoadedRef.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedContext] Skipping update: hasDataLoadedRef=${hasDataLoadedRef.current}. Data not yet loaded.`);
        return;
    }

    if (safeDebouncedLocalContext !== safeContextToDisplay && safeDebouncedLocalContext !== (lastKnownPropValues.current.context ?? '')) {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedContext] Debounced context "${safeDebouncedLocalContext.substring(0, Math.min(safeDebouncedLocalContext.length, 50))}..." differs from prop context "${safeContextToDisplay.substring(0, Math.min(safeContextToDisplay.length, 50))}..." AND last sent. Calling onUpdate.`);
      onUpdate({ context: safeDebouncedLocalContext });
      lastKnownPropValues.current.context = safeDebouncedLocalContext;
    } else {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedContext] Debounced context matches prop context OR last sent value. No update needed.`);
    }
  }, [debouncedLocalContext, contextToDisplay, onUpdate, componentId, isEditingEnabled]);

  useEffect(() => {
    console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedModel] debouncedLocalModel changed. Value: "${debouncedLocalModel}"`);
    if (!isEditingEnabled) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedModel] Skipping update: isEditingEnabled is false.`);
        return;
    }
    if (isFirstDebounceModel.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedModel] First debounce run for model. Marking as processed. Skipping update.`);
        isFirstDebounceModel.current = false;
        return;
    }
    if (!hasDataLoadedRef.current) {
        console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedModel] Skipping update: hasDataLoadedRef=${hasDataLoadedRef.current}. Data not yet loaded.`);
        return;
    }

    if (debouncedLocalModel !== prompt.model && debouncedLocalModel !== lastKnownPropValues.current.model) {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedModel] Debounced model "${debouncedLocalModel}" differs from prop model "${prompt.model}" AND last sent. Calling onUpdate.`);
      onUpdate({ model: debouncedLocalModel });
      lastKnownPropValues.current.model = debouncedLocalModel;
    } else {
      console.log(`[EditorPanel ${componentId}] [Trace: Effect_DebouncedModel] Debounced model matches prop model OR last sent value. No update needed.`);
    }
  }, [debouncedLocalModel, prompt.model, onUpdate, componentId, isEditingEnabled]);


  const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id: string; name: string }) => {
    setBlocks(prev => {
      let copy = [...prev];
      const newVarBlock: Block = { type: 'variable', id: cuid('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name, __typename: 'ContentBlock' };
      copy.splice(index, 0, newVarBlock);
      logBlocks(`After directly inserting variable "${variable.placeholder}" at index ${index}`, copy);
      return copy;
    });
  }, [logBlocks]);


  const insertTextAt = useCallback((index: number, text = '') => {
    setBlocks(prev => {
      let copy = [...prev];
      const newBlock: Block = { type: 'text', id: cuid('t-'), value: text, __typename: 'ContentBlock' }
      copy.splice(index, 0, newBlock)
      logBlocks(`After directly inserting text block at index ${index}`, copy);
      return copy
    })
  }, [logBlocks]);

  const updateTextBlock = useCallback((id: string, value: string) => {
    console.log(`[EditorPanel ${componentId}] [Trace: UpdateTextBlock] updateTextBlock called for block ID: ${id}, new value: "${value}". Propagating to blocks state.`);
    setBlocks(prev => {
        let updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);

        const nonTextBlocksExist = updated.some(b => b.type === 'variable');
        const currentTextBlocksCount = updated.filter(b => b.type === 'text').length;

        if (value === '' && !nonTextBlocksExist && currentTextBlocksCount === 1 && updated.find(b => b.id === id) === updated[0]) {
             console.log(`[EditorPanel ${componentId}] [Trace: UpdateTextBlock] Only text block and it became empty, keeping it.`);
        } else if (value === '' && updated.length > 1) {
             console.log(`[EditorPanel ${componentId}] [Trace: UpdateTextBlock] Removing empty text block ${id} as there are other blocks.`);
             updated = updated.filter(b => !(b.type === 'text' && b.id === id));
             if (updated.length === 0) {
                console.log('[EditorPanel] [Trace: UpdateTextBlock] All blocks removed, adding empty fallback after text block update.');
                updated.push({ type: 'text', id: cuid('t-empty-fallback-after-update'), value: '', __typename: 'ContentBlock' });
             }
        }
        else if (updated.length === 0) {
            console.log('[EditorPanel] [Trace: UpdateTextBlock] All blocks removed, adding empty fallback (safeguard).');
            updated.push({ type: 'text', id: cuid('t-empty-fallback-safeguard'), value: '', __typename: 'ContentBlock' });
        }


        logBlocks(`After updating text block ${id} to "${(value ?? '').substring(0, Math.min((value ?? '').length, 30))}..."`, updated);
        return updated;
    });
  }, [logBlocks, componentId]);

  const removeBlock = useCallback((index: number) => {
    console.log(`[EditorPanel ${componentId}] [Trace: RemoveBlock] removeBlock called for index: ${index}`);
    setBlocks(prev => {
      let copy = [...prev];
      if (index < 0 || index >= copy.length) {
          console.warn(`[EditorPanel ${componentId}] [Trace: RemoveBlock] Invalid index ${index}.`);
          return prev;
      }

      copy.splice(index, 1);
      console.log(`[EditorPanel ${componentId}] [Trace: RemoveBlock] Removed block at index ${index}.`);

      if (copy.length === 0) {
        console.log('[EditorPanel] [Trace: RemoveBlock] No blocks left, adding empty fallback.');
        copy.push({ type: 'text', id: cuid('t-empty-after-remove'), value: '', __typename: 'ContentBlock' });
      }

      logBlocks(`After removing block at index ${index}`, copy);
      return copy
    })
  }, [logBlocks, componentId]);

  const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[EditorPanel ${componentId}] [Trace: MoveBlock] moveBlock called from index: ${from} to index: ${to}`);
    setBlocks(prev => {
      let copy = [...prev];
      if (from < 0 || from >= copy.length || to < 0 || to > copy.length) {
          console.warn(`[EditorPanel ${componentId}] [Trace: MoveBlock] Invalid indices from ${from} to ${to}.`);
          return prev;
      }

      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);

      logBlocks(`After moving block from ${from} to ${to}`, copy);
      return copy;
    });
  }, [logBlocks, componentId]);

  const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const [{ isOverBlockContainer, canDropBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    drop: (item: any, monitor) => {
      if (!isEditingEnabled) return;

      if (monitor.didDrop()) {
        console.log('[EditorPanel][DropContainer] Drop handled by a nested target, ignoring.');
        return;
      }
      console.log(`[EditorPanel ${componentId}][DropContainer] Item dropped into container.`, item);

      let targetIndex = blocks.length;
      if (blocks.length === 0) {
        targetIndex = 0;
      }

      if (monitor.getItemType() === ItemTypes.VARIABLE) {
        console.log(`[EditorPanel ${componentId}][DropContainer] Inserting variable at index ${targetIndex}.`);
        insertVariableAt(targetIndex, item);
      } else if (monitor.getItemType() === ItemTypes.BLOCK) {
        const dragIndex = item.index;
        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && dragIndex < targetIndex) ||
                             (dragIndex === targetIndex + 1 && targetIndex < dragIndex);

        if (isNoRealMove) {
          console.log('[EditorPanel][DropContainer] No real move detected, ignoring block drop.');
          return;
        }

        console.log(`[EditorPanel ${componentId}][DropContainer] Moving block from ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex;
      }
    },
    collect: (monitor) => {
        const isOver = monitor.isOver({ shallow: true });
        const canDrop = monitor.canDrop() && isEditingEnabled;
        return {
            isOverBlockContainer: isOver,
            canDropBlockContainer: canDrop,
        };
    },
  }), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething, componentId, isEditingEnabled]);


  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="saas-section-header rounded-t-lg">
        {/* NEW: Display version name */}
        <h2 className="text-xl font-bold mb-2 px-3 pt-2 overflow-hidden whitespace-nowrap text-ellipsis">{currentVersionName}</h2>
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={localTitle}
            onChange={(e) => {
              console.log(`[EditorPanel ${componentId}] [Trace: InputTitle] Title input changed (local state):`, e.target.value);
              setLocalTitle(e.target.value);
            }}
            className="h-10 text-sm font-medium"
            placeholder="Untitled Prompt"
            disabled={!isEditingEnabled}
          />
          <select
            className="h-10 rounded-md border bg-background px-3 p-4 text-sm"
            value={localModel}
            onChange={(e) => {
              console.log(`[EditorPanel ${componentId}] [Trace: SelectModel] Model select changed (local state):`, e.target.value);
              setLocalModel(e.target.value);
            }}
            title="Target model"
            disabled={!isEditingEnabled}
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
              const val = e.target.value ?? '';
              console.log(`[EditorPanel ${componentId}] [Trace: InputContext] Context textarea changed (local state):`, val.substring(0, Math.min(val.length, 50)) + '...');
              setLocalContext(val);
            }}
            rows={6}
            className="overflow-y-auto"
            placeholder="Add domain, audience, constraints, style guides, and examples. Use {{variables}} if needed."
            disabled={!isEditingEnabled}
          />
        </section>

        <section className="rounded-lg border p-4 mb-4">
          <div className="mb-2 text-sm font-medium">Prompt content</div>
          <div
            ref={dropBlockContainer}
            className={`flex flex-col gap-2 min-h-[300px] border rounded p-3
                        ${isOverBlockContainer && canDropBlockContainer && isDraggingSomething && isEditingEnabled ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}
                        ${!isEditingEnabled ? 'bg-gray-100/50 cursor-not-allowed' : ''}`}
          >
            {blocks.length === 0 && !isDraggingSomething ? (
                <div className="flex-1 text-center py-12 text-gray-400">
                    {!isEditingEnabled ? (
                        'This version has no content and cannot be edited.'
                    ) : (
                        <>
                            Drag variables or click "+ Add text" to start building your prompt.
                            <button
                              onClick={() => {
                                console.log(`[EditorPanel ${componentId}] [Trace: EmptyStateAddText] Add text button clicked (empty state).`);
                                insertTextAt(0, '');
                              }}
                              className="mt-4 px-3 py-1 border rounded-md text-sm text-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center mx-auto"
                            >
                              <Text className="mr-1 h-4 w-4" /> Add text
                            </button>
                        </>
                    )}
                </div>
            ) : (
                blocks.map((b, i) => (
                    <React.Fragment key={`block-fragment-${b.id}`}>
                        {i === 0 && isEditingEnabled && (
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
                            componentId={componentId}
                            isEditingEnabled={isEditingEnabled}
                        />
                        {i + 1 === blocks.length && isEditingEnabled && (
                          <HoverAddTextBlock
                              key={`hover-insert-after-${b.id}`}
                              index={i + 1}
                              insertTextAt={insertTextAt}
                          />
                        )}
                    </React.Fragment>
                ))
            )}

            {blocks.length === 0 && isOverBlockContainer && canDropBlockContainer && isDraggingSomething && isEditingEnabled && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-indigo-400 rounded-md bg-indigo-50 text-indigo-700 h-24">
                    Drop item here
                </div>
            )}
            {blocks.length === 0 && !isEditingEnabled && (
                 <div className="flex-1 text-center py-12 text-gray-400">This version has no content and cannot be edited.</div>
            )}
          </div>
        </section>

        <section className="flex items-center gap-2">
          <Input
            placeholder="Notes for this version"
            value={pendingNotes}
            onChange={(e) => setPendingNotes(e.target.value)}
            className="flex-1"
            disabled={!isEditingEnabled}
          />
          <Button
            onClick={() => {
              console.log(`[EditorPanel ${componentId}] [Trace: SaveButton] Save button clicked.`);
              onSnapshot(pendingNotes || `Version saved on ${new Date().toLocaleString()}`);
            }}
            className="btn-primary"
            disabled={isSnapshotting || !isEditingEnabled}
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
  componentId,
  isEditingEnabled,
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
  componentId: string;
  isEditingEnabled: boolean;
}) {
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  console.log(`[BlockRenderer ${block.id}] [Trace: Render] Rendered. Type: ${block.type}, Value: "${(block.type === 'text' ? (block.value ?? '') : 'N/A').substring(0,20)}"`);

  useEffect(() => {
    if (block.type === 'text') {
      const safeBlockValue = block.value ?? '';
      console.log(`[BlockRenderer ${block.id}] [Trace: TextBlockEffect] block.value changed to "${safeBlockValue}".`);
      if (contentEditableRef.current && contentEditableRef.current.innerText !== safeBlockValue && document.activeElement !== contentEditableRef.current) {
        console.log(`[BlockRenderer ${block.id}] [Trace: TextBlockEffect] DOM innerText differs from block.value and not active. Setting innerText.`);
        contentEditableRef.current.innerText = safeBlockValue;
      } else if (contentEditableRef.current && document.activeElement === contentEditableRef.current) {
        console.log(`[BlockRenderer ${block.id}] [Trace: TextBlockEffect] Component is active, avoiding DOM update to prevent disrupting user input.`);
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
      const can = isEditingEnabled;
      console.log(`[BlockRenderer ${block.id}] [Trace: DragCanDrag] Can drag check. Item: ${block.type}. isEditingEnabled: ${isEditingEnabled}. Result: ${can}`);
      return can;
    },
    collect: (m) => {
        const dragging = m.isDragging();
        const currentCanDrag = m.canDrag();
        console.log(`[BlockRenderer ${block.id}] [Trace: DragCollect] isDragging: ${dragging}, canDrag: ${currentCanDrag}`);
        return { isDragging: dragging, canDrag: currentCanDrag };
    },
  }), [block.id, index, block.type, block.value, block.placeholder, block.name, block.varId, isEditingEnabled]);

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
      if (!isEditingEnabled) return;

      if (!wrapperRef.current) {
        return;
      }
      if (!monitor.isOver({ shallow: true })) {
        if (localDropTargetPosition !== null) {
            console.log(`[BlockRenderer ${block.id}] [Trace: DropHover] Monitor not shallow over, clearing localDropTargetPosition.`);
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
            console.log(`[BlockRenderer ${block.id}] [Trace: DropHover] Dragging block onto itself, clearing localDropTargetPosition.`);
            setLocalDropTargetPosition(null);
        }
        return;
      }

      if (draggingItemType === ItemTypes.BLOCK || draggingItemType === ItemTypes.VARIABLE) {
        newDropPosition = hoverClientY < hoverMiddleY ? 'before' : 'after';
      }

      if (localDropTargetPosition !== newDropPosition) {
        console.log(`[BlockRenderer ${block.id}] [Trace: DropHover] Updating localDropTargetPosition from ${localDropTargetPosition} to ${newDropPosition}.`);
        setLocalDropTargetPosition(newDropPosition);
      }
    },
    drop(item: any, monitor) {
      if (!isEditingEnabled) return;

      const dragItemType = monitor.getItemType();

      console.log(`[BlockRenderer ${block.id}] [Trace: DropDrop] Item dropped. Type: ${String(dragItemType)}, Item ID: ${item.id}.`);
      setLocalDropTargetPosition(null);

      if (monitor.didDrop()) {
        console.log(`[BlockRenderer ${block.id}] [Trace: DropDrop] Drop already handled by another target, skipping.`);
        return;
      }

      let targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

      if (dragItemType === ItemTypes.VARIABLE) {
          console.log(`[BlockRenderer ${block.id}][DropDrop] Inserting variable at index ${targetIndex}.`);
          insertVariableAt(targetIndex, item);
      } else if (dragItemType === ItemTypes.BLOCK) {
        const dragIndex = item.index;

        const isNoRealMove = (dragIndex === targetIndex) ||
                             (dragIndex + 1 === targetIndex && dragIndex < targetIndex) ||
                             (dragIndex === targetIndex + 1 && targetIndex < dragIndex);

        if (isNoRealMove) {
          console.log('[BlockRenderer][DropDrop] No real move detected, ignoring block drop.');
          return;
        }

        console.log(`[BlockRenderer ${block.id}][DropDrop] Moving block from ${dragIndex} to ${targetIndex}.`);
        moveBlock(dragIndex, targetIndex);
        item.index = targetIndex;
      }
    },
    collect: (monitor) => {
        const isOverVal = monitor.isOver({ shallow: true });
        const canDropVal = monitor.canDrop() && isEditingEnabled;
        console.log(`[BlockRenderer ${block.id}] [Trace: DropCollect] isOver: ${isOverVal}, canDrop: ${canDropVal}`);
        return {
            isOver: isOverVal,
            canDrop: canDropVal,
        };
    },
  }), [index, insertVariableAt, moveBlock, localDropTargetPosition, block.id, allBlocks.length, isEditingEnabled]);

  const blockRootRef = mergeRefs(wrapperRef, dropRef);

  const showPlaceholderAbove = isOver && canDrop && localDropTargetPosition === 'before' && isDraggingSomething;
  const showPlaceholderBelow = isOver && canDrop && localDropTargetPosition === 'after' && isDraggingSomething;

  const commonClasses = `relative w-full rounded-md shadow-sm transition-all duration-100 ease-in-out`;

  if (block.type === 'variable') {
    return (
      <div
        ref={blockRootRef}
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group ${!isEditingEnabled ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}

        <div
          ref={connectDragSource}
          className={`cursor-grab shrink-0 flex items-center justify-center w-10 h-10 bg-blue-100 border border-blue-200 rounded-md text-blue-600 shadow-md transition-opacity duration-100 opacity-100 group-hover:opacity-100 ${!isEditingEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <GripVertical className="h-6 w-6" />
        </div>

        <div
          className={`flex-1 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md `}
        >
          <div className="text-sm font-medium">{block.name || block.placeholder}</div>
          {(allBlocks.length > 1 && isEditingEnabled) ? (
                <button
                    onClick={() => {
                        console.log(`[BlockRenderer ${block.id}] [Trace: RemoveButton] Remove variable button clicked.`);
                        removeBlock(index);
                    }}
                    className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity"
                    aria-label={`Remove variable block`}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            ) : null}
        </div>
        {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
      </div>
    )
  } else {
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditingEnabled) {
          e.preventDefault();
          return;
      }
      console.log(`[BlockRenderer ${block.id}] [Trace: TextKeyDown] Key down: ${e.key}`);
      if (e.key === 'Enter' && !e.shiftKey) {
        console.log(`[BlockRenderer ${block.id}] [Trace: TextKeyDown] Enter pressed, allowing default for new line.`);
        return;
      }
      if (e.key === 'Backspace' && contentEditableRef.current?.innerText === '' && window.getSelection()?.anchorOffset === 0) {
          e.preventDefault();
          console.log(`[BlockRenderer ${block.id}] [Trace: TextKeyDown] Backspace on empty block with cursor at start.`);
          if (allBlocks.length === 1 && allBlocks[0].id === block.id) {
              console.log(`[BlockRenderer ${block.id}] [Trace: TextKeyDown] Only block left, preventing removal.`);
              updateTextBlock(block.id, '');
          } else {
              console.log(`[BlockRenderer ${block.id}] [Trace: TextKeyDown] Removing block at index ${index}.`);
              removeBlock(index);
          }
      }
    }

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      if (!isEditingEnabled) return;
      const newText = e.currentTarget.innerText;
      console.log(`[BlockRenderer ${block.id}] [Trace: TextOnInput] Current innerText: "${(newText ?? '').substring(0, Math.min((newText ?? '').length, 50))}...". Calling updateTextBlock.`);
      updateTextBlock(block.id, newText);
    }

    const onBlur = () => {
      if (!isEditingEnabled) return;
      const text = contentEditableRef.current?.innerText ?? ''
      console.log(`[BlockRenderer ${block.id}] [Trace: TextOnBlur] Final text: "${(text ?? '').substring(0, Math.min((text ?? '').length, 50))}...". Block.value: "${(block.value ?? '').substring(0, Math.min((block.value ?? '').length, 50))}...".`);
      if (text === '' && allBlocks.length > 1) {
          console.log(`[BlockRenderer ${block.id}] [Trace: TextOnBlur] Empty text block and not the only block, removing.`);
          removeBlock(index);
      }
    }

    return (
      <div
        ref={blockRootRef}
        className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group ${!isEditingEnabled ? 'opacity-70' : ''}`}
      >
        {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        <div
          className={`relative flex-1 p-2 bg-white border border-gray-300 rounded-md flex items-center group ${!isEditingEnabled ? 'bg-gray-50' : ''}`}
        >
            <div
              ref={connectDragSource}
              className={`cursor-grab shrink-0 flex items-center justify-center w-10 h-10 -ml-3 mr-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-md transition-opacity duration-100 opacity-100 group-hover:opacity-100 ${!isEditingEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
              style={{ position: 'relative', left: '0', top: '0', transform: 'none' }}
            >
              <GripVertical className="h-6 w-6" />
            </div>
            <div
                contentEditable={isEditingEnabled}
                suppressContentEditableWarning
                onKeyDown={onKeyDown}
                onInput={onInput}
                onBlur={onBlur}
                className={`flex-1 min-h-[40px] text-sm outline-none w-full whitespace-pre-wrap py-2 ${!isEditingEnabled ? 'text-gray-700' : ''}`}
                style={{ wordBreak: 'break-word' }}
                ref={contentEditableRef}
            >
            </div>
            {( (allBlocks.length > 1) || (block.type === 'text' && (block.value ?? '') !== '') ) && isEditingEnabled ? (
                <button
                    onClick={() => {
                        console.log(`[BlockRenderer ${block.id}] [Trace: RemoveButton] Remove button clicked.`);
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
      <div className={`absolute top-0 w-full h-full bg-transparent transition-all duration-100 ease-in-out
                      ${isHovering ? 'bg-gray-100/50' : 'bg-transparent'}`}></div>

      {isHovering && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            console.log(`[HoverAddTextBlock] [Trace: ButtonClick] Add text button clicked at index ${index}.`);
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
        const variableItem = item as { id: string; placeholder: string; name?: string; __typename?: string };
        return (
          <div className="bg-blue-200 border border-blue-400 rounded-md px-3 py-1 shadow-md opacity-90">
            <span className="font-semibold">{variableItem.name || variableItem.placeholder}</span>
            <span className="text-xs text-blue-700 ml-2">(Drag Variable)</span>
          </div>
        );
      case ItemTypes.BLOCK:
        const blockItem = item as { originalBlock: Block };
        const blockToRender = blockItem.originalBlock;

        const { __typename: _, ...blockRenderData } = blockToRender;

        if (blockRenderData.type === 'variable') {
          return (
            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md shadow-md opacity-90">
              <div className="text-sm font-medium">{blockRenderData.name || blockRenderData.placeholder}</div>
            </div>
          );
        } else {
          return (
            <div className="relative p-2 bg-white border border-gray-300 rounded-md flex items-center shadow-md opacity-90">
              <div
                  className="flex-1 min-h-[40px] text-sm w-full whitespace-pre-wrap"
                  style={{ minWidth: '100px', maxWidth: '300px' }}
              >
                  {(blockRenderData.value ?? '').substring(0, Math.min((blockRenderData.value ?? '').length, 100)) + ((blockRenderData.value ?? '').length > 100 ? '...' : '')}
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
  promptId,
  versions,
  selectedVersionId,
  onSelectVersion,
  onRestoreVersion,
  updateVersionDescription,
  isRestoring,
  contentToDisplay,
  contextToDisplay,
  variablesToDisplay,
  loadingVersionContent,
}: {
  promptId: string;
  versions: Version[]
  selectedVersionId: string | null
  onSelectVersion: (id: string) => void
  onRestoreVersion: (versionId: string) => void
  updateVersionDescription: (promptId: string, versionId: string, description: string) => void;
  isRestoring: boolean;
  contentToDisplay: Block[];
  contextToDisplay: string;
  variablesToDisplay: PromptVariable[];
  loadingVersionContent: boolean;
}) {
  const selectedVersionMetadata = versions.find(v => v.id === selectedVersionId);

  const [localVersionDescription, setLocalVersionDescription] = useState<string>('');
  const [debouncedVersionDescription] = useDebounce(localVersionDescription, 500);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedVersionMetadata) {
      setLocalVersionDescription(selectedVersionMetadata.description ?? '');
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
      }
    } else {
      setLocalVersionDescription('');
    }
  }, [selectedVersionMetadata]);

  useEffect(() => {
    if (selectedVersionMetadata && debouncedVersionDescription !== (selectedVersionMetadata.description ?? '')) {
      console.log(`[VersionsPanel] [Trace: DebounceDescEffect] Saving debounced description for version ${selectedVersionMetadata.id}`);
      updateVersionDescription(promptId, selectedVersionMetadata.id, debouncedVersionDescription);
    }
  }, [debouncedVersionDescription, selectedVersionMetadata, promptId, updateVersionDescription]);


  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value ?? '';
    setLocalVersionDescription(val);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    console.log('[VersionsPanel] [Trace: Effect] versions or selectedVersionId changed.');
    // The parent PromptLab component now handles the initial selection of null/active
    // This panel just reflects the selectedVersionId from parent
  }, [selectedVersionId, versions, onSelectVersion]);

  const displayContentForPanel = contentToDisplay;
  const displayContextForPanel = contextToDisplay;
  const displayVariablesForPanel = variablesToDisplay;

  if (!selectedVersionMetadata && selectedVersionId !== null) { // This case means selectedVersionId is not null but no metadata found (e.g. initial load before content fetch)
    return (
        <div className="grid h-full place-items-center text-sm text-slate-500">
            {loadingVersionContent ? (
                <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Loading version details...</p>
                </>
            ) : (
                <p>Select a version from the left panel.</p> // Or handle error if version ID doesn't exist
            )}
        </div>
    );
  }

  // Determine the name to display in the header of the details panel
  const panelVersionName = selectedVersionId === null
      ? "Active Prompt"
      : selectedVersionMetadata?.notes || "Untitled Version";


  return (
    <div className="flex h-full min-h-0 flex-col p-4">
        <h3 className="font-semibold text-lg mb-2">{panelVersionName}</h3>
        <p className="text-sm text-gray-500 mb-4">Last Edited: {new Date(selectedVersionMetadata?.createdAt || '').toLocaleString()}</p>

        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Version Description</label>
            <Textarea
                ref={textAreaRef}
                value={localVersionDescription}
                onChange={handleDescriptionChange}
                placeholder="Add a detailed description for this version..."
                className="resize-none border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minHeight: '100px', height: 'auto', overflowY: 'hidden', background: 'transparent' }}
            />
        </div>

        {/* Conditionally render version content, context, variables based on loading state */}
        {loadingVersionContent ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Version Content</label>
                <Textarea
                    readOnly
                    value={JSON.stringify(displayContentForPanel.map(b => {
                      const { __typename, ...rest } = b;
                      return rest;
                    }), null, 2) || ''}
                    className="font-mono border border-gray-300 rounded-md p-2 text-sm resize-none"
                    style={{ minHeight: '150px', height: 'auto', overflowY: 'hidden', background: 'transparent' }}
                    placeholder="No content available for this version."
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Version Context</label>
                <Textarea
                    readOnly
                    value={displayContextForPanel || ''}
                    className="font-mono border border-gray-300 rounded-md p-2 text-sm resize-none"
                    style={{ minHeight: '100px', height: 'auto', overflowY: 'hidden', background: 'transparent' }}
                    placeholder="No context available for this version."
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Variables in this Version</label>
                {displayVariablesForPanel && displayVariablesForPanel.length > 0 ? (
                    <ul className="space-y-1">
                        {displayVariablesForPanel.map(v => (
                            <li key={v.id} className="text-sm p-2 rounded flex items-center justify-between border border-gray-200" style={{ background: 'transparent' }}>
                                <span className="font-semibold">{v.name}</span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">({v.placeholder})</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No variables for this version.</p>
                )}
            </div>
          </>
        )}
    </div>
  )
}

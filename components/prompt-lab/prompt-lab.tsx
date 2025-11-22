// components/prompt-lab/prompt-lab.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback, useId } from "react"
import { PromptVariableType, type Prompt, type Version, type PromptVariable, type PromptVariableSource, type Block } from '@/components/prompt-lab/store';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Copy, Plus, GitCommit, Text, Trash2, GripVertical, Loader2, Sparkles } from "lucide-react"
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Tab } from "@headlessui/react"
import { VariableDiscoveryBuilder } from "./variable-discovery-builder"
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";
import { useUpdatePromptAiEnhancedContent } from "@/hooks/usePromptsAi";

function deepCompareBlocks(arr1: Block[], arr2: Block[]): boolean {
if (arr1.length !== arr2.length) {
console.log('[deepCompareBlocks] Different lengths: ', arr1.length, arr2.length);
return false;
}
for (let i = 0; i < arr1.length; i++) {
const b1 = arr1[i];
const b2 = arr2[i];
if (b1.type !== b2.type) {
console.log(`[deepCompareBlocks] Block ${i}: Different types, ${b1.type}, ${b2.type}`);
return false;
}
if (b1.type === 'text') {
if ((b1.value ?? '') !== (b2.value ?? '')) {
console.log(`[deepCompareBlocks] Block ${i} (text): Different values, ${b1.value}, ${b2.value}`);
return false;
}
} else if (b1.type === 'variable') {
if (b1.varId !== b2.varId || b1.placeholder !== b2.placeholder || b1.name !== b2.name) {
console.log(`[deepCompareBlocks] Block ${i} (variable): Different identity, { b1_varId: ${b1.varId}, b1_ph: ${b1.placeholder}, b1_name: ${b1.name} }, { b2_varId: ${b2.varId}, b2_ph: ${b2.placeholder}, b2_name: ${b2.name} }`);
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

const generateClientKey = (prefix: string = ''): string => {
return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function renderPrompt(
contentBlocks: Block[],
context: string,
variables: PromptVariable[],
variableValues: Record<string, string>,
projectId?: string
): Promise<string> {
console.groupCollapsed('[renderPrompt] Generating prompt preview.');
console.log('Input contentBlocks:', contentBlocks);
console.log('Input context:', context);
console.log('Input variables:', variables);
console.log('Input variableValues:', variableValues);

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
const finalString = lines.join("\n");
console.log('Final rendered string:', finalString);
console.groupEnd();
return finalString;

}

const AnimatedDots = () => {
const [dots, setDots] = useState('');
useEffect(() => {
const interval = setInterval(() => {
setDots(d => (d.length >= 3 ? '' : d + '.'));
}, 300);
return () => clearInterval(interval);
}, []);
return <span className="ml-1 w-4 inline-block text-left">{dots}</span>;
};

interface PromptLabProps {
prompt: Prompt;
onBack: () => void;
projectId?: string;
isLoading: boolean;
error: string | null;
refetch: () => void;
updatePromptDetails: (promptId: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions' | 'activeVersion'>>) => void;
updatePromptVersion: (promptId: string, versionId: string, updates: Partial<Version>) => void;
snapshotPrompt: (notes?: string) => Promise<any>;
setActivePromptVersion: (versionId: string) => Promise<any>;
updateVersionDescription: (promptId: string, versionId: string, description: string) => void;
fetchVersionContent: (versionId: string) => void;
loadingVersionContent: boolean;
versionContentError: string | null;
currentLoadedVersionContent: { id: string; content: Block[]; context: string; variables: PromptVariable[]; aiEnhancedContent?: string | null } | null;
}

export function PromptLab({
prompt: currentPrompt,
onBack,
projectId,
isLoading: isLoadingDetails,
error: detailsError,
refetch: refetchPromptDetails,
updatePromptDetails,
updatePromptVersion,
snapshotPrompt,
setActivePromptVersion,
updateVersionDescription,
fetchVersionContent,
loadingVersionContent,
versionContentError,
currentLoadedVersionContent,
}: PromptLabProps) {
console.log('[PromptLab] Rendering. Props received:', { currentPrompt, projectId, isLoadingDetails, error: detailsError, loadingVersionContent, versionContentError, currentLoadedVersionContent });

const { updatePrompt: enhancePrompt } = useUpdatePromptAiEnhancedContent();

const rawSortedVersions = useMemo(() => {
    if (!currentPrompt.versions) return [];
    return [...currentPrompt.versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [currentPrompt.versions]);

const activeVersionId = useMemo(() => {
    if (currentPrompt.activeVersion?.id) {
        return currentPrompt.activeVersion.id;
    }
    const activeInList = currentPrompt.versions?.find((v: Version & { isActive?: boolean }) => v.isActive);
    if (activeInList) {
        return activeInList.id;
    }
    if (rawSortedVersions.length > 0) {
        return rawSortedVersions[0].id;
    }
    return null;
}, [currentPrompt.activeVersion, currentPrompt.versions, rawSortedVersions]);

const sortedVersionsWithStatus = useMemo(() => {
    if (!currentPrompt.versions) return [];
    return [...currentPrompt.versions]
        .map(v => ({
            ...v,
            isActive: v.id === activeVersionId, // Explicitly assign isActive based on robust ID
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [currentPrompt.versions, activeVersionId]);


const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

useEffect(() => {
    console.groupCollapsed('[PromptLab] Sync selectedVersionId effect triggered.');
    console.log('Robustly determined activeVersionId:', activeVersionId);
    console.log('Current selectedVersionId state:', selectedVersionId);

    if (activeVersionId && (!selectedVersionId || !currentPrompt.versions.some(v => v.id === selectedVersionId))) {
        console.log(`[PromptLab] Initializing/resetting selectedVersionId to active version ID: ${activeVersionId}`);
        setSelectedVersionId(activeVersionId);
    }
    console.groupEnd();
}, [activeVersionId, selectedVersionId, currentPrompt.versions]);


useEffect(() => {
    console.groupCollapsed('[PromptLab] Fetch content effect triggered.');
    console.log('selectedVersionId:', selectedVersionId);
    console.log('activeVersionId:', activeVersionId);
    if (selectedVersionId && selectedVersionId !== activeVersionId) {
        console.log(`[PromptLab] Fetching content for non-active version: ${selectedVersionId}`);
        fetchVersionContent(selectedVersionId);
    } else {
        console.log('[PromptLab] No fetch needed. Selected version is active or null.');
    }
    console.groupEnd();
}, [selectedVersionId, activeVersionId, fetchVersionContent]);

const isSelectedVersionActive = selectedVersionId === activeVersionId;

const { contentToDisplay, contextToDisplay, variablesToDisplay, notesToDisplay, aiEnhancedContentToDisplay } = useMemo(() => {
    console.groupCollapsed('[PromptLab] Recalculating display data (useMemo).');
    console.log('isSelectedVersionActive:', isSelectedVersionActive);
    console.log('activeVersionId:', activeVersionId);
    console.log('currentPrompt.activeVersion (live content):', currentPrompt.activeVersion);
    console.log('currentLoadedVersionContent (for non-active):', currentLoadedVersionContent);
    console.log('selectedVersionId:', selectedVersionId);

    if (isSelectedVersionActive && currentPrompt.activeVersion) {
        console.log('[PromptLab] Using data from active version (live content).');
        const result = {
            contentToDisplay: currentPrompt.activeVersion.content ?? [],
            contextToDisplay: currentPrompt.activeVersion.context ?? '',
            variablesToDisplay: currentPrompt.activeVersion.variables ?? [],
            notesToDisplay: currentPrompt.versions.find(v => v.id === activeVersionId)?.notes ?? 'Untitled Version',
            aiEnhancedContentToDisplay: currentPrompt.activeVersion.aiEnhancedContent ?? null,
        };
        console.log('Data to display:', result);
        console.groupEnd();
        return result;
    }
    if (currentLoadedVersionContent && currentLoadedVersionContent.id === selectedVersionId) {
        console.log('[PromptLab] Using data from loaded non-active version.');
        const result = {
            contentToDisplay: currentLoadedVersionContent.content ?? [],
            contextToDisplay: currentLoadedVersionContent.context ?? '',
            variablesToDisplay: currentLoadedVersionContent.variables ?? [],
            notesToDisplay: currentPrompt.versions.find(v => v.id === selectedVersionId)?.notes ?? 'Untitled Version',
            aiEnhancedContentToDisplay: currentLoadedVersionContent.aiEnhancedContent ?? null,
        };
        console.log('Data to display:', result);
        console.groupEnd();
        return result;
    }
    console.log('[PromptLab] No data source found, returning empty defaults.');
    const result = { contentToDisplay: [], contextToDisplay: '', variablesToDisplay: [], notesToDisplay: 'Untitled Version', aiEnhancedContentToDisplay: null };
    console.log('Data to display:', result);
    console.groupEnd();
    return result;
}, [isSelectedVersionActive, currentPrompt.activeVersion, currentPrompt.versions, currentLoadedVersionContent, selectedVersionId, activeVersionId]);

console.log('[PromptLab] Data ready for EditorPanel:', { contentToDisplay, contextToDisplay, variablesToDisplay, notesToDisplay });

const isEditorContentLoading = loadingVersionContent && !isSelectedVersionActive;

const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables")
const [showVariableBuilder, setShowVariableBuilder] = useState(false);
const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({})
const [renderedPreview, setRenderedPreview] = useState("");
const [pendingNotes, setPendingNotes] = useState("");
const [isSnapshotting, setIsSnapshotting] = useState(false);
const [isSettingActive, setIsSettingActive] = useState(false);
const [isEnhancing, setIsEnhancing] = useState(false);
const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
const [enhancementError, setEnhancementError] = useState<string | null>(null);
const [copiedStatus, setCopiedStatus] = useState<'original' | 'enhanced' | null>(null);

const enhancementPhases = useMemo(() => ['Thinking', 'Analysing', 'Preparing'], []);
const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(-1);

useEffect(() => {
    console.groupCollapsed('[PromptLab] Initializing preview values effect triggered.');
    console.log('variablesToDisplay:', variablesToDisplay);
    const initialPreviewValues: Record<string, string> = {};
    (variablesToDisplay || []).forEach(v => {
        if (!v.source) {
            initialPreviewValues[v.placeholder] = v.defaultValue ?? '';
        } else {
            initialPreviewValues[v.placeholder] = `[${v.name} (dynamic)]`;
        }
    });
    console.log('Setting initial previewVariableValues:', initialPreviewValues);
    setPreviewVariableValues(initialPreviewValues);
    console.groupEnd();
}, [variablesToDisplay]);


useEffect(() => {
    const generatePreview = async () => {
        console.log('[PromptLab] Regenerating preview string.');
        const preview = await renderPrompt(contentToDisplay, contextToDisplay, variablesToDisplay, previewVariableValues, projectId);
        setRenderedPreview(preview);
    };
    generatePreview();
}, [contentToDisplay, contextToDisplay, variablesToDisplay, previewVariableValues, projectId]);

useEffect(() => {
    console.log('[PromptLab] Syncing aiEnhancedContentToDisplay to enhancedResult state:', aiEnhancedContentToDisplay);
    setEnhancedResult(aiEnhancedContentToDisplay ?? null);
}, [aiEnhancedContentToDisplay]);

useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isEnhancing) {
        setCurrentPhaseIndex(0);
        interval = setInterval(() => {
            setCurrentPhaseIndex(prevIndex => {
                if (prevIndex < enhancementPhases.length) {
                    return prevIndex + 1;
                }
                clearInterval(interval!);
                return prevIndex;
            });
        }, 1500);
    } else {
        setCurrentPhaseIndex(-1);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
}, [isEnhancing, enhancementPhases.length]);

const handleUpdateVersion = useCallback((patch: Partial<Version>) => {
    console.groupCollapsed('[PromptLab] handleUpdateVersion called.');
    console.log('Selected Version ID:', selectedVersionId);
    console.log('Incoming patch:', patch);

    if (!selectedVersionId) {
        toast.error("No version selected to update.");
        console.error('[PromptLab] handleUpdateVersion aborted: No version selected.');
        console.groupEnd();
        return;
    }

    if (patch.variables) {
        patch.variables = patch.variables.map(v => {
            const { __typename, ...variableWithoutTypename } = v as PromptVariable & { __typename?: string };
            return { ...variableWithoutTypename, id: variableWithoutTypename.id || generateClientKey('patch-var-') };
        }) as PromptVariable[];
    }

    if (patch.content && Array.isArray(patch.content)) {
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
        patch.content = cleanedContent as unknown as Block[];
    }
    
    const versionPatch: Partial<Version> = { ...patch };
    if ('title' in patch) {
         delete versionPatch.title;
    }

    console.log('Dispatching updatePromptVersion with promptId:', currentPrompt.id, 'versionId:', selectedVersionId, 'and patch:', versionPatch);
    updatePromptVersion(currentPrompt.id, selectedVersionId, versionPatch);
    console.groupEnd();

}, [currentPrompt.id, selectedVersionId, updatePromptVersion]);

const handleUpdatePrompt = useCallback((patch: Partial<Prompt>) => {
    console.log('[PromptLab] handleUpdatePrompt called with patch:', patch);
    updatePromptDetails(currentPrompt.id, patch);
}, [currentPrompt.id, updatePromptDetails]);


const handleSnapshot = useCallback(async (notes?: string) => {
    setIsSnapshotting(true);
    console.group('[PromptLab] [Trace: HandleSnapshot] Attempting to snapshot prompt');
    console.log('Prompt ID:', currentPrompt.id);
    console.log('Notes:', notes);
    try {
        await snapshotPrompt(notes);
        toast.success("New prompt version saved!");
        setPendingNotes('');
    } catch (error) {
        console.error(`[PromptLab] [Error: HandleSnapshot] Failed to snapshot prompt ${currentPrompt.id}:`, error);
        toast.error("Failed to save version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
        setIsSnapshotting(false);
        console.log('[PromptLab] [Trace: HandleSnapshot] Snapshot operation finished.');
        console.groupEnd();
    }
}, [currentPrompt.id, snapshotPrompt]);

const handleSetActiveVersion = useCallback(async (versionId: string) => {
    setIsSettingActive(true);
    console.group('[PromptLab] [Trace: SetActive] Attempting to set active version');
    console.log('Version ID:', versionId);
    console.log('Prompt ID:', currentPrompt.id);
    try {
        await setActivePromptVersion(versionId);
        toast.success("Version set as active!");
    } catch (error) {
        console.error(`[PromptLab] [Error: SetActive] Failed to set active version ${versionId}:`, error);
        toast.error("Failed to set active version", { description: (error as any).message || 'An unknown error occurred.' });
    } finally {
        setIsSettingActive(false);
        console.log('[PromptLab] [Trace: SetActive] Restore operation finished.');
        console.groupEnd();
    }
}, [currentPrompt.id, setActivePromptVersion]);

const handleCreateVariable = useCallback((newVariable: Omit<PromptVariable, 'id'>) => {
    console.groupCollapsed('[PromptLab] handleCreateVariable called.');
    console.log('New variable data:', newVariable);
    const variableWithId: PromptVariable = {
        ...newVariable,
        id: generateClientKey('p-var-'),
    };
    const updatedVariables = [...variablesToDisplay, variableWithId];
    console.log('New variables array:', updatedVariables);
    handleUpdateVersion({ variables: updatedVariables });
    setShowVariableBuilder(false);
    console.groupEnd();
}, [variablesToDisplay, handleUpdateVersion]);

const handleRemoveVariable = useCallback((variableId: string) => {
    console.groupCollapsed('[PromptLab] handleRemoveVariable called.');
    console.log('Variable ID to remove:', variableId);
    const updatedVariables = variablesToDisplay.filter(v => v.id !== variableId);
    console.log('New variables array:', updatedVariables);
    handleUpdateVersion({ variables: updatedVariables });
    console.groupEnd();
}, [variablesToDisplay, handleUpdateVersion]);

const handleEnhancePrompt = useCallback(async () => {
    console.group('[PromptLab] handleEnhancePrompt started.');
    if (!selectedVersionId) {
        toast.error("Cannot enhance prompt", { description: "Please select a version to enhance." });
        console.error('[PromptLab] Enhancement aborted: No version selected.');
        console.groupEnd();
        return;
    }
    setIsEnhancing(true);
    setEnhancedResult(null);
    setEnhancementError(null);
    const minAnimationTime = enhancementPhases.length * 1500;
    const startTime = Date.now();

    console.log('Enhancing prompt ID:', currentPrompt.id, 'version ID:', selectedVersionId);
    console.log('Content being sent for enhancement:', renderedPreview);

    try {
        const { data } = await enhancePrompt({
            variables: {
                input: {
                    promptId: currentPrompt.id,
                    versionId: selectedVersionId,
                    content: renderedPreview,
                },
            },
        });
        console.log('Enhancement API response data:', data);
        if (data?.updatePromptAiEnhancedContent) {
            setEnhancedResult(data.updatePromptAiEnhancedContent);
            toast.success("Prompt enhanced successfully!");
        }
    } catch (error: any) {
        console.error("Error enhancing prompt:", error);
        setEnhancementError(error.message || "An unknown error occurred while enhancing the prompt.");
        toast.error("Enhancement Failed", { description: error.message });
    } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = minAnimationTime - elapsedTime;
        if (remainingTime > 0) {
            setTimeout(() => setIsEnhancing(false), remainingTime);
        } else {
            setIsEnhancing(false);
        }
        console.log('[PromptLab] Enhancement flow finished.');
        console.groupEnd();
    }
}, [currentPrompt.id, selectedVersionId, renderedPreview, enhancePrompt, enhancementPhases]);

if (isLoadingDetails && !currentPrompt) {
    return <LoadingPlaceholder message="Loading prompt details..." />
}
if (detailsError) {
    return <ErrorPlaceholder error={new Error(detailsError)} onRetry={refetchPromptDetails} />
}
if (!isLoadingDetails && (!currentPrompt.versions || currentPrompt.versions.length === 0)) {
    return <ErrorPlaceholder error={{ message: "This prompt has no versions and cannot be displayed." }} />;
}

function copy(text: string, type: 'original' | 'enhanced') {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedStatus(type);
        setTimeout(() => setCopiedStatus(null), 2000);
        toast.success("Copied to clipboard!");
    }).catch(() => {
        toast.error("Failed to copy.");
    });
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
                            onChange={(index) => {
                                setLeftTab(index === 0 ? "versions" : "variables");
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
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                                        {(sortedVersionsWithStatus.length === 0) ? (
                                            <div className="text-sm text-slate-500 p-4 text-center">No versions yet. Make changes and save a snapshot to create one.</div>
                                        ) : (
                                            <ul className="space-y-2">
                                                {sortedVersionsWithStatus.map((v) => {
                                                    const isSelected = selectedVersionId === v.id;
                                                    const isActive = v.isActive;

                                                    return (
                                                        <li key={v.id}>
                                                            <button
                                                                className={`w-full text-left rounded-lg border p-3 transition-all duration-150 flex flex-col gap-1
                                                                    ${isSelected
                                                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                                        : 'hover:bg-slate-50'
                                                                    }
                                                                    ${isActive && !isSelected
                                                                        ? 'border-green-300'
                                                                        : ''
                                                                    }`}
                                                                onClick={() => {
                                                                    console.log(`[PromptLab] Version button clicked. Setting selectedVersionId to: ${v.id}`);
                                                                    setSelectedVersionId(v.id)
                                                                }}
                                                                title={v.notes || 'Untitled Version'}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div className="text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis pr-2">
                                                                        {v.notes || 'Untitled Version'}
                                                                    </div>
                                                                    {isActive && <div className="text-xs bg-green-100 text-green-800 font-medium px-2 py-0.5 rounded-full flex-shrink-0">Active</div>}
                                                                </div>
                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {new Date(v.createdAt).toLocaleString()}
                                                                </div>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </Tab.Panel>

                                {/* Variables tab */}
                                <Tab.Panel className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                                    <div className="flex flex-col gap-2 border-b p-3" style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}>
                                        <h3 className="font-semibold">Variables</h3>
                                        <Button className="w-full h-9 btn-primary" onClick={() => { setShowVariableBuilder(true); }}>
                                            <Plus className="mr-1 h-4 w-4" /> Create New Variable
                                        </Button>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                                        {variablesToDisplay.length === 0 ? (
                                            <div className="text-sm text-slate-500">No variables yet. Click "Create New Variable" to get started.</div>
                                        ) : (
                                            <ul className="space-y-2">
                                                {variablesToDisplay.map((v) => (
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
                        {(isLoadingDetails || isEditorContentLoading) && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        )}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <Tabs value={rightTab} onValueChange={(v) => { setRightTab(v as any); }} className="flex h-full flex-col">
                                <div className="flex justify-between items-center border-b pr-3" style={{ borderColor: "var(--border)" }}>
                                    <TabsList className="h-11 bg-transparent">
                                        <TabsTrigger value="editor">Editor</TabsTrigger>
                                        <TabsTrigger value="version-details">Version Details</TabsTrigger>
                                        <TabsTrigger value="preview">Preview</TabsTrigger>
                                    </TabsList>
                                    <div>
                                        {isSelectedVersionActive ? (
                                            <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-md">Active</span>
                                        ) : (
                                            selectedVersionId && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetActiveVersion(selectedVersionId)}
                                                    disabled={isSettingActive}
                                                    className="h-8"
                                                >
                                                    {isSettingActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    Set as Active
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div className="min-h-0 flex-1 overflow-y-auto">
                                    <TabsContent value="editor" className="m-0 outline-none flex-1 overflow-y-auto">
                                        <EditorPanel
                                            prompt={currentPrompt}
                                            onUpdateVersion={handleUpdateVersion}
                                            onUpdatePrompt={handleUpdatePrompt}
                                            onSnapshot={handleSnapshot}
                                            pendingNotes={pendingNotes}
                                            setPendingNotes={setPendingNotes}
                                            isSnapshotting={isSnapshotting}
                                            contentToDisplay={contentToDisplay}
                                            contextToDisplay={contextToDisplay}
                                            notesToDisplay={notesToDisplay}
                                            isEditingEnabled={!isLoadingDetails && !isEditorContentLoading}
                                            versionId={selectedVersionId}
                                        />
                                    </TabsContent>

                                    <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                                        <VersionsPanel
                                            promptId={currentPrompt.id}
                                            versions={currentPrompt.versions || []}
                                            selectedVersionId={selectedVersionId}
                                            updateVersionDescription={updateVersionDescription}
                                            contentToDisplay={contentToDisplay}
                                            contextToDisplay={contextToDisplay}
                                            variablesToDisplay={variablesToDisplay}
                                        />
                                    </TabsContent>

                                    <TabsContent value="preview" className="m-0 outline-none p-4 flex-1 flex flex-col">
                                        <div className="mb-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Original Preview</div>
                                                <Button size="sm" onClick={() => copy(renderedPreview, 'original')} className="h-8 btn-primary" disabled={copiedStatus === 'original'}>
                                                    {copiedStatus === 'original' ? '✓ Copied!' : <><Copy className="mr-1 h-4 w-4" />Copy</>}
                                                </Button>
                                            </div>
                                            <pre className="font-mono whitespace-pre-wrap bg-[#f8f8f8] text-[#333] border border-[#e0e0e0] rounded-md p-2 w-full"
                                                style={{ lineHeight: "1.5", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                                                {renderedPreview}
                                            </pre>
                                        </div>

                                        <div className="mt-4 pt-4 border-t">
                                            <Button onClick={handleEnhancePrompt} disabled={isEnhancing} className="btn-primary w-full sm:w-auto">
                                                {isEnhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                Enhance Prompt with AI
                                            </Button>
                                            <div className="mt-4">
                                                {isEnhancing && (
                                                    <div className="py-2 text-sm">
                                                        {enhancementPhases.map((phase, index) => {
                                                            if (index > currentPhaseIndex) return null;
                                                            const isCompleted = index < currentPhaseIndex;
                                                            const isActive = index === currentPhaseIndex && index < enhancementPhases.length;
                                                            return (
                                                                <div key={phase} className="flex items-center mb-2 last:mb-0 transition-opacity duration-300">
                                                                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                                                                        {isCompleted ? <span className="text-green-500 font-bold">✓</span> : isActive ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                                                                    </div>
                                                                    <span className={`${isCompleted ? 'text-slate-400' : 'text-slate-700'}`}>{phase}</span>
                                                                    {isActive && <AnimatedDots />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {enhancementError && (
                                                    <div className="p-4 border rounded-md bg-red-50 text-red-700 border-red-200">
                                                        <h4 className="font-bold">Error</h4>
                                                        <p>{enhancementError}</p>
                                                    </div>
                                                )}
                                                {enhancedResult && !isEnhancing && (
                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <div className="text-sm font-medium text-green-700">AI Enhanced Result</div>
                                                            <Button size="sm" onClick={() => copy(enhancedResult, 'enhanced')} className="h-8 btn-primary" disabled={copiedStatus === 'enhanced'}>
                                                                {copiedStatus === 'enhanced' ? '✓ Copied!' : <><Copy className="mr-1 h-4 w-4" />Copy</>}
                                                            </Button>
                                                        </div>
                                                        <pre className="font-mono whitespace-pre-wrap bg-green-50 text-green-900 border border-green-200 rounded-md p-2 w-full"
                                                            style={{ lineHeight: "1.5", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                                                            {enhancedResult}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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

function VariableItem({ variable, onRemove }: { variable: PromptVariable; onRemove: (id: string) => void }) {
const [{ isDragging }, drag, preview] = useDrag(() => ({
type: ItemTypes.VARIABLE,
item: { id: variable.id, placeholder: variable.placeholder, name: variable.name },
collect: (monitor) => {
const dragging = monitor.isDragging();
if (dragging) {
console.log(`[VariableItem] Started dragging variable: ${variable.name} (${variable.id})`);
}
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
            <div className="font-semibold overflow-hidden whitespace-nowrap text-ellipsis">{variable.name}</div>
            <div className="text-xs text-gray-500 mt-1">({variable.placeholder})</div>
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

function EditorPanel({
prompt,
onUpdateVersion,
onUpdatePrompt,
onSnapshot,
pendingNotes,
setPendingNotes,
isSnapshotting,
contentToDisplay,
contextToDisplay,
notesToDisplay,
isEditingEnabled,
versionId,
}: {
prompt: Prompt
onUpdateVersion: (patch: Partial<Version>) => void
onUpdatePrompt: (patch: Partial<Prompt>) => void
onSnapshot: (notes?: string) => void
pendingNotes: string;
setPendingNotes: (notes: string) => void;
isSnapshotting: boolean;
contentToDisplay: Block[];
contextToDisplay: string;
notesToDisplay: string;
isEditingEnabled: boolean;
versionId: string | null;
}) {
console.log('[EditorPanel] Rendering. Props received:', { prompt, versionId, contentToDisplay, contextToDisplay, notesToDisplay, isEditingEnabled });
const [blocks, setBlocks] = useState<Block[]>([]);
const [localNotes, setLocalNotes] = useState('');
const [localContext, setLocalContext] = useState('');
const [localModel, setLocalModel] = useState('');
const isSwitchingVersions = useRef(true);

useEffect(() => {
    console.groupCollapsed(`[EditorPanel] SyncEffect triggered for versionId: ${versionId}`);
    if (versionId && isEditingEnabled) {
        console.log(`[EditorPanel] [Trace: SyncEffect] Syncing state for versionId: ${versionId}`);
        isSwitchingVersions.current = true;
        
        setLocalNotes(notesToDisplay);
        setLocalContext(contextToDisplay);
        setBlocks((contentToDisplay || []).map(b => ({ ...b })));
        setLocalModel(prompt.model);
        
        const timer = setTimeout(() => {
            console.log(`[EditorPanel] Version sync complete for ${versionId}. Debounced updates are now enabled.`);
            isSwitchingVersions.current = false;
        }, 500);

        return () => clearTimeout(timer);
    } else {
        console.log('[EditorPanel] [Trace: SyncEffect] Skipping sync because versionId is null or editing is disabled.');
    }
    console.groupEnd();
}, [versionId, contentToDisplay, contextToDisplay, notesToDisplay, prompt.model, isEditingEnabled]);

const [debouncedBlocks] = useDebounce(blocks, 500);
const [debouncedLocalNotes] = useDebounce(localNotes, 300);
const [debouncedLocalContext] = useDebounce(localContext, 300);
const [debouncedLocalModel] = useDebounce(localModel, 300);

useEffect(() => {
    if (isSwitchingVersions.current || !isEditingEnabled) return;
    if (!deepCompareBlocks(debouncedBlocks, contentToDisplay)) {
        console.log('[EditorPanel] Debounced blocks are different from props. Calling onUpdateVersion.');
        onUpdateVersion({ content: debouncedBlocks });
    }
}, [debouncedBlocks, contentToDisplay, isEditingEnabled, onUpdateVersion]);

useEffect(() => {
    if (isSwitchingVersions.current || !isEditingEnabled) return;
    if (debouncedLocalNotes !== notesToDisplay) {
        console.log('[EditorPanel] Debounced notes are different from props. Calling onUpdateVersion.');
        onUpdateVersion({ notes: debouncedLocalNotes });
    }
}, [debouncedLocalNotes, notesToDisplay, isEditingEnabled, onUpdateVersion]);

useEffect(() => {
    if (isSwitchingVersions.current || !isEditingEnabled) return;
    if (debouncedLocalContext !== contextToDisplay) {
        console.log('[EditorPanel] Debounced context is different from props. Calling onUpdateVersion.');
        onUpdateVersion({ context: debouncedLocalContext });
    }
}, [debouncedLocalContext, contextToDisplay, isEditingEnabled, onUpdateVersion]);

useEffect(() => {
    if (isSwitchingVersions.current || !isEditingEnabled) return;
    if (debouncedLocalModel !== prompt.model) {
        console.log('[EditorPanel] Debounced model is different from props. Calling onUpdatePrompt.');
        onUpdatePrompt({ model: debouncedLocalModel });
    }
}, [debouncedLocalModel, prompt.model, isEditingEnabled, onUpdatePrompt]);


const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id: string; name: string }) => {
    console.log(`[EditorPanel] Inserting variable at index ${index}:`, variable);
    setBlocks(prev => {
        let copy = [...prev];
        const newVarBlock: Block = { type: 'variable', id: generateClientKey('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name };
        copy.splice(index, 0, newVarBlock);
        console.log('[EditorPanel] New blocks state after variable insertion:', copy);
        return copy;
    });
}, []);

const insertTextAt = useCallback((index: number, text = '') => {
    console.log(`[EditorPanel] Inserting new text block at index ${index} with content: "${text}"`);
    setBlocks(prev => {
        let copy = [...prev];
        const newBlock: Block = { type: 'text', id: generateClientKey('t-'), value: text }
        copy.splice(index, 0, newBlock)
        console.log('[EditorPanel] New blocks state after text insertion:', copy);
        return copy
    })
}, []);

const updateTextBlock = useCallback((id: string, value: string) => {
    console.log(`[EditorPanel] Updating text block ID ${id} with new value: "${value}"`);
    setBlocks(prev => {
        let updated = prev.map(b => b.type === 'text' && b.id === id ? { ...b, value } : b);
        if (value === '' && updated.length > 1) {
            updated = updated.filter(b => !(b.type === 'text' && b.id === id));
            if (updated.length === 0) {
                 updated.push({ type: 'text', id: generateClientKey('t-empty-fallback-after-update'), value: '' });
            }
        } else if (updated.length === 0) {
            updated.push({ type: 'text', id: generateClientKey('t-empty-fallback-safeguard'), value: '' });
        }
        return updated;
    });
}, []);

const removeBlock = useCallback((index: number) => {
    console.log(`[EditorPanel] Removing block at index ${index}.`);
    setBlocks(prev => {
        let copy = [...prev];
        if (index < 0 || index >= copy.length) return prev;
        copy.splice(index, 1);
        if (copy.length === 0) {
            copy.push({ type: 'text', id: generateClientKey('t-empty-after-remove'), value: '' });
        }
        console.log('[EditorPanel] New blocks state after removal:', copy);
        return copy
    })
}, []);

const moveBlock = useCallback((from: number, to: number) => {
    console.log(`[EditorPanel] Moving block from index ${from} to ${to}.`);
    setBlocks(prev => {
        let copy = [...prev];
        if (from < 0 || from >= copy.length || to < 0 || to > copy.length) return prev;
        const [item] = copy.splice(from, 1);
        copy.splice(to, 0, item);
        console.log('[EditorPanel] New blocks state after move:', copy);
        return copy;
    });
}, []);

const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({ isDragging: monitor.isDragging() }));

const [{ isOverBlockContainer, canDropBlockContainer }, dropBlockContainer] = useDrop(() => ({
    accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
    drop: (item: any, monitor) => {
        if (!isEditingEnabled || monitor.didDrop()) return;
        console.groupCollapsed(`[EditorPanel] Drop event on main container.`);
        console.log('Dropped item:', item);
        let targetIndex = blocks.length === 0 ? 0 : blocks.length;
        console.log(`Target index (end of list): ${targetIndex}`);
        if (monitor.getItemType() === ItemTypes.VARIABLE) {
            insertVariableAt(targetIndex, item);
        } else if (monitor.getItemType() === ItemTypes.BLOCK) {
            const dragIndex = item.index;
            if (dragIndex === targetIndex || dragIndex + 1 === targetIndex) {
                console.log('Drop is a no-op, skipping move.');
                console.groupEnd();
                return;
            }
            moveBlock(dragIndex, targetIndex);
            item.index = targetIndex;
        }
        console.groupEnd();
    },
    collect: (monitor) => ({
        isOverBlockContainer: monitor.isOver({ shallow: true }),
        canDropBlockContainer: monitor.canDrop() && isEditingEnabled,
    }),
}), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething, isEditingEnabled]);

return (
    <div className="flex h-full min-h-0 flex-col">
        <div className="saas-section-header pr-4 rounded-t-lg">
            <h2 className="text-xl font-bold mb-2 px-3 pt-2 overflow-hidden whitespace-nowrap text-ellipsis">{prompt.title}</h2>
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                    value={localNotes}
                    onChange={(e) => { setLocalNotes(e.target.value); }}
                    className="h-10 text-sm font-medium"
                    placeholder={"Version Notes"}
                    disabled={!isEditingEnabled}
                />
                <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={localModel}
                    onChange={(e) => { setLocalModel(e.target.value); }}
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
                    onChange={(e) => { setLocalContext(e.target.value ?? ''); }}
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
                    className={`flex flex-col gap-2 min-h-[300px] border rounded p-3 ${isOverBlockContainer && canDropBlockContainer && isDraggingSomething && isEditingEnabled ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'} ${!isEditingEnabled ? 'bg-gray-100/50 cursor-not-allowed' : ''}`}
                >
                    {blocks.length === 0 && !isDraggingSomething ? (
                        <div className="flex-1 text-center py-12 text-gray-400">
                            {!isEditingEnabled ? 'This version has no content and cannot be edited.' :
                                <>
                                    Drag variables or click "+ Add text" to start.
                                    <button onClick={() => insertTextAt(0, '')} className="mt-4 px-3 py-1 border rounded-md text-sm text-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center mx-auto">
                                        <Text className="mr-1 h-4 w-4" /> Add text
                                    </button>
                                </>
                            }
                        </div>
                    ) : (
                        blocks.map((b, i) => (
                            <React.Fragment key={`block-fragment-${b.id || i}`}>
                                {i === 0 && isEditingEnabled && <HoverAddTextBlock key={`hover-insert-before-first`} index={0} insertTextAt={insertTextAt} />}
                                <BlockRenderer key={b.id || i} block={b} index={i} allBlocks={blocks} updateTextBlock={updateTextBlock} removeBlock={removeBlock} moveBlock={moveBlock} insertVariableAt={insertVariableAt} isDraggingSomething={isDraggingSomething} insertTextAt={insertTextAt} isEditingEnabled={isEditingEnabled} />
                                {i + 1 === blocks.length && isEditingEnabled && <HoverAddTextBlock key={`hover-insert-after-${b.id || i}`} index={i + 1} insertTextAt={insertTextAt} />}
                            </React.Fragment>
                        ))
                    )}
                    {blocks.length === 0 && isOverBlockContainer && canDropBlockContainer && isDraggingSomething && isEditingEnabled && (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-indigo-400 rounded-md bg-indigo-50 text-indigo-700 h-24">Drop item here</div>
                    )}
                    {blocks.length === 0 && !isEditingEnabled && (
                        <div className="flex-1 text-center py-12 text-gray-400">This version has no content and cannot be edited.</div>
                    )}
                </div>
            </section>
            <section className="border-t pt-4">
                <h3 className="text-md font-semibold mb-2">Create a new version from "{notesToDisplay}"</h3>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Notes for this new version (e.g., 'Added JSON output formatting')"
                        value={pendingNotes}
                        onChange={(e) => setPendingNotes(e.target.value)}
                        className="flex-1"
                        disabled={!isEditingEnabled}
                    />
                    <Button
                        onClick={() => { onSnapshot(pendingNotes || `Version saved on ${new Date().toLocaleString()}`); }}
                        className="btn-primary bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                        disabled={isSnapshotting || !isEditingEnabled}
                    >
                        {isSnapshotting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <GitCommit className="mr-1 h-4 w-4" />}
                        Save New Version
                    </Button>
                </div>
            </section>
        </div>
    </div>
)

}

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
isEditingEnabled: boolean;
}) {
const contentEditableRef = useRef<HTMLDivElement | null>(null);
const wrapperRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
    if (block.type === 'text') {
        const safeBlockValue = block.value ?? '';
        if (contentEditableRef.current && contentEditableRef.current.innerText !== safeBlockValue && document.activeElement !== contentEditableRef.current) {
            // console.log(`[BlockRenderer ${block.id}] Syncing innerText from prop value.`);
            contentEditableRef.current.innerText = safeBlockValue;
        }
    }
}, [block.type, block.value, block.id]);

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
    canDrag: () => isEditingEnabled,
    collect: (m) => ({ isDragging: m.isDragging(), canDrag: m.canDrag() }),
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
        if (!isEditingEnabled || !wrapperRef.current || !monitor.isOver({ shallow: true })) {
            if (localDropTargetPosition !== null) setLocalDropTargetPosition(null);
            return;
        }
        const hoverBoundingRect = wrapperRef.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        let newDropPosition: 'before' | 'after' | null = null;
        const draggingItemType = monitor.getItemType();
        if (draggingItemType === ItemTypes.BLOCK && (item as { id: string }).id === block.id) {
            if (localDropTargetPosition !== null) setLocalDropTargetPosition(null);
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
        if (!isEditingEnabled || monitor.didDrop()) return;
        const dragItemType = monitor.getItemType();
        console.groupCollapsed(`[BlockRenderer ${block.id}] Drop event occurred.`);
        console.log('Dropped item:', item);
        setLocalDropTargetPosition(null);
        let targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;
        console.log(`Drop position: ${localDropTargetPosition}, resulting target index: ${targetIndex}`);
        if (dragItemType === ItemTypes.VARIABLE) {
            insertVariableAt(targetIndex, item);
        } else if (dragItemType === ItemTypes.BLOCK) {
            const dragIndex = item.index;
            const isNoRealMove = (dragIndex === targetIndex) || (dragIndex + 1 === targetIndex && dragIndex < targetIndex) || (dragIndex === targetIndex + 1 && targetIndex < dragIndex);
            if (isNoRealMove) {
                console.log('Drop is a no-op, skipping move.');
                console.groupEnd();
                return
            };
            moveBlock(dragIndex, targetIndex);
            item.index = targetIndex;
        }
        console.groupEnd();
    },
    collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop() && isEditingEnabled,
    }),
}), [index, insertVariableAt, moveBlock, localDropTargetPosition, block.id, allBlocks.length, isEditingEnabled]);

const blockRootRef = mergeRefs(wrapperRef, dropRef);
const showPlaceholderAbove = isOver && canDrop && localDropTargetPosition === 'before' && isDraggingSomething;
const showPlaceholderBelow = isOver && canDrop && localDropTargetPosition === 'after' && isDraggingSomething;
const commonClasses = 'relative w-full rounded-md shadow-sm transition-all duration-100 ease-in-out';

if (block.type === 'variable') {
    return (
        <div ref={blockRootRef} className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group ${!isEditingEnabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
            <div ref={connectDragSource} className={`cursor-grab shrink-0 flex items-center justify-center w-10 h-10 bg-blue-100 border border-blue-200 rounded-md text-blue-600 shadow-md transition-opacity duration-100 opacity-100 group-hover:opacity-100 ${!isEditingEnabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                <GripVertical className="h-6 w-6" />
            </div>
            <div className="flex-1 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-medium">{block.name || block.placeholder}</div>
                {(allBlocks.length > 1 && isEditingEnabled) ? (
                    <button onClick={() => removeBlock(index)} className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity" aria-label="Remove variable block">
                        <Trash2 className="h-4 w-4" />
                    </button>
                ) : null}
            </div>
            {showPlaceholderBelow && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
        </div>
    )
} else {
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isEditingEnabled) { e.preventDefault(); return; }
        if (e.key === 'Enter' && !e.shiftKey) return;
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
        if (!isEditingEnabled) return;
        updateTextBlock(block.id, e.currentTarget.innerText);
    }
    const onBlur = () => {
        if (!isEditingEnabled) return;
        const text = contentEditableRef.current?.innerText ?? ''
        if (text === '' && allBlocks.length > 1) {
            removeBlock(index);
        }
    }
    return (
        <div ref={blockRootRef} className={`${commonClasses} ${isDragging ? 'opacity-50' : ''} flex items-center gap-2 pr-2 group ${!isEditingEnabled ? 'opacity-70' : ''}`}>
            {showPlaceholderAbove && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-sm z-10" />}
            <div className={`relative flex-1 p-2 bg-white border border-gray-300 rounded-md flex items-center group ${!isEditingEnabled ? 'bg-gray-50' : ''}`}>
                <div ref={connectDragSource} className={`cursor-grab shrink-0 flex items-center justify-center w-10 h-10 -ml-3 mr-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-md transition-opacity duration-100 opacity-100 group-hover:opacity-100 ${!isEditingEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    style={{ position: 'relative', left: '0', top: '0', transform: 'none' }}>
                    <GripVertical className="h-6 w-6" />
                </div>
                <div contentEditable={isEditingEnabled} suppressContentEditableWarning onKeyDown={onKeyDown} onInput={onInput} onBlur={onBlur}
                    className={`flex-1 min-h-[40px] text-sm outline-none w-full whitespace-pre-wrap py-2 ${!isEditingEnabled ? 'text-gray-700' : ''}`}
                    style={{ wordBreak: 'break-word' }} ref={contentEditableRef}>
                </div>
                {((allBlocks.length > 1) || (block.type === 'text' && (block.value ?? '') !== '')) && isEditingEnabled ? (
                    <button onClick={() => removeBlock(index)} className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity" aria-label="Remove text block">
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

function HoverAddTextBlock({ index, insertTextAt }: { index: number; insertTextAt: (index: number, text?: string) => void; }) {
const [isHovering, setIsHovering] = useState(false);
return (
<div className={`relative h-6 w-full flex justify-center items-center py-1 transition-all duration-100 ease-in-out group`} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
<div className={`absolute top-0 w-full h-full bg-transparent transition-all duration-100 ease-in-out ${isHovering ? 'bg-gray-100/50' : 'bg-transparent'}`}></div>
{isHovering && (
<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); insertTextAt(index); setIsHovering(false); }}
className="relative z-10 h-6 px-2 py-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-100 ease-in-out transform scale-90 group-hover:scale-100">
<Text className="mr-1 h-3 w-3" /> Add text
</Button>
)}
</div>
);
}

function CustomDragLayer() {
const { itemType, isDragging, item, currentOffset } = useDragLayer((monitor) => ({
item: monitor.getItem(),
itemType: monitor.getItemType(),
currentOffset: monitor.getClientOffset(),
isDragging: monitor.isDragging(),
}));
if (!isDragging || !currentOffset || !item) return null;
const layerStyles: React.CSSProperties = {
position: 'fixed', pointerEvents: 'none', zIndex: 9999, left: 0, top: 0,
transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
};
const renderItem = () => {
switch (itemType) {
case ItemTypes.VARIABLE:
const variableItem = item as { id: string; placeholder: string; name?: string; };
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
<div className="flex-1 min-h-[40px] text-sm w-full whitespace-pre-wrap" style={{ minWidth: '100px', maxWidth: '300px' }}>
{(blockRenderData.value ?? '').substring(0, 100) + ((blockRenderData.value ?? '').length > 100 ? '...' : '')}
</div>
</div>
);
}
case 'NATIVE_HTML':
return (
<div className="bg-red-200 border border-red-400 rounded-md px-3 py-1 shadow-md opacity-90">
<span className="font-semibold text-red-800">Dragging HTML Element</span>
<span className="text-xs text-red-700 ml-2">(Native Drag)</span>
</div>
);
default: return null;
}
};
return (<div style={layerStyles}>{renderItem()}</div>);
}

function VersionsPanel({
promptId,
versions,
selectedVersionId,
updateVersionDescription,
contentToDisplay,
contextToDisplay,
variablesToDisplay,
}: {
promptId: string;
versions: Version[]
selectedVersionId: string | null
updateVersionDescription: (promptId: string, versionId: string, description: string) => void;
contentToDisplay: Block[];
contextToDisplay: string;
variablesToDisplay: PromptVariable[];
}) {
console.log('[VersionsPanel] Rendering. Props:', { promptId, versions, selectedVersionId, contentToDisplay, contextToDisplay, variablesToDisplay });
const selectedVersionMetadata = versions.find(v => v.id === selectedVersionId);
const [localVersionDescription, setLocalVersionDescription] = useState<string>('');
const [debouncedVersionDescription] = useDebounce(localVersionDescription, 500);
const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

useEffect(() => {
    console.groupCollapsed(`[VersionsPanel] Sync description effect for versionId: ${selectedVersionId}`);
    if (selectedVersionMetadata) {
        console.log('Syncing description from metadata:', selectedVersionMetadata.description);
        setLocalVersionDescription(selectedVersionMetadata.description ?? '');
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    } else {
        console.log('No selected version metadata found, clearing description.');
        setLocalVersionDescription('');
    }
    console.groupEnd();
}, [selectedVersionMetadata]);

useEffect(() => {
    if (selectedVersionMetadata && debouncedVersionDescription !== (selectedVersionMetadata.description ?? '')) {
        console.log(`[VersionsPanel] Debounced description changed. Calling updateVersionDescription for version ${selectedVersionMetadata.id} with new description:`, debouncedVersionDescription);
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

const displayContentForPanel = contentToDisplay;
const displayContextForPanel = contextToDisplay;
const displayVariablesForPanel = variablesToDisplay;

if (!selectedVersionMetadata) {
    return (
        <div className="grid h-full place-items-center text-sm text-slate-500">
            <p>Select a version to see its details.</p>
        </div>
    );
}

const panelVersionName = selectedVersionMetadata?.notes || "Untitled Version";

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
    </div>
)

}
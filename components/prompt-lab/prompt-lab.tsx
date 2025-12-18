//components/prompt-lab/prompt-lab.tsx
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
import { ManualVariableDiscoveryBuilder } from "./manual-variable-discovery-builder"
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";
import { useUpdatePromptAiEnhancedContent } from "@/hooks/usePromptsAi";
import { useLazyQuery, gql } from "@apollo/client";
import { RESOLVE_PROMPT_VARIABLE_QUERY } from "@/graphql/queries/projectPromptVariablesQuerries";
import { useGetModelProfiles } from "@/hooks/useModelProfiles";

// --- HELPER: Deep Compare ---
function deepCompareBlocks(arr1: Block[], arr2: Block[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        const b1 = arr1[i];
        const b2 = arr2[i];
        if (b1.type !== b2.type) return false;
        if (b1.type === 'text') {
            if ((b1.value ?? '') !== (b2.value ?? '')) return false;
        } else if (b1.type === 'variable') {
            if (b1.varId !== b2.varId || b1.placeholder !== b2.placeholder || b1.name !== b2.name) return false;
        }
    }
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

// --- TYPES ---
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

// =================================================================================================
// PROMPT LAB COMPONENT
// =================================================================================================
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

    const { updatePrompt: enhancePrompt } = useUpdatePromptAiEnhancedContent();
    const { models: availableModels, loading: modelsLoading, error: modelsError } = useGetModelProfiles();

    // --- STATE CACHE: This Ref survives Tab Switches ---
    // We store the user's latest local edits here (Content Blocks).
    const blockCache = useRef<Record<string, Block[]>>({});

    // --- STATE OVERRIDES: Immediate UI updates for Metadata (Notes, Title) ---
    // This allows the Left Panel list to update immediately when typing in the Editor
    const [versionOverrides, setVersionOverrides] = useState<Record<string, Partial<Version>>>({});

    // --- Logic: Merged Versions (Single Source of Truth) ---
    // Combines server data with local optimistic updates
    const mergedVersions = useMemo(() => {
        if (!currentPrompt.versions) return [];
        return currentPrompt.versions.map(v => {
            const override = versionOverrides[v.id];
            // Merge: Server Data <- Override Data
            return override ? { ...v, ...override } : v;
        });
    }, [currentPrompt.versions, versionOverrides]);

    // --- Logic: Sorting Versions ---
    const rawSortedVersions = useMemo(() => {
        return [...mergedVersions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [mergedVersions]);

    // --- Logic: Determine Active Version ---
    const activeVersionId = useMemo(() => {
        if (currentPrompt.activeVersion?.id) return currentPrompt.activeVersion.id;
        const activeInList = mergedVersions.find((v: Version & { isActive?: boolean }) => v.isActive);
        if (activeInList) return activeInList.id;
        if (rawSortedVersions.length > 0) return rawSortedVersions[0].id;
        return null;
    }, [currentPrompt.activeVersion, mergedVersions, rawSortedVersions]);

    // --- Logic: Sorted with Active Flag ---
    const sortedVersionsWithStatus = useMemo(() => {
        return [...mergedVersions]
            .map(v => ({
                ...v,
                isActive: v.id === activeVersionId,
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [mergedVersions, activeVersionId]);

    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Sync selected version with active on load
    useEffect(() => {
        if (activeVersionId && (!selectedVersionId || !mergedVersions.some(v => v.id === selectedVersionId))) {
            setSelectedVersionId(activeVersionId);
        }
    }, [activeVersionId, selectedVersionId, mergedVersions]);

    // --- Transition Effect Timer ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isTransitioning) {
            timer = setTimeout(() => {
                setIsTransitioning(false);
            }, 500); // Minimum loader display time
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isTransitioning]);

    // Helper to switch versions and trigger loader immediately
    const handleVersionSwitch = useCallback((versionId: string) => {
        if (versionId === selectedVersionId) return;
        setIsTransitioning(true); // Immediate UI blocking
        setSelectedVersionId(versionId);
    }, [selectedVersionId]);

    // Fetch content if selecting a non-active version
    useEffect(() => {
        if (selectedVersionId && selectedVersionId !== activeVersionId) {
            fetchVersionContent(selectedVersionId);
        }
    }, [selectedVersionId, activeVersionId, fetchVersionContent]);

    const isSelectedVersionActive = selectedVersionId === activeVersionId;
    
    // Tab states
    const [rightTab, setRightTab] = useState<"editor" | "version-details" | "preview">("editor")
    const [leftTab, setLeftTab] = useState<"versions" | "variables">("variables")

    // --- Logic: Data To Display (The "Source of Truth" for the UI) ---
    const { contentToDisplay, contextToDisplay, variablesToDisplay, notesToDisplay, aiEnhancedContentToDisplay } = useMemo(() => {
        let blocks: Block[] = [];
        let context = '';
        let vars: PromptVariable[] = [];
        let notes = 'Untitled Version';
        let aiContent = null;

        const mergedVersion = mergedVersions.find(v => v.id === selectedVersionId);
        const override = selectedVersionId ? versionOverrides[selectedVersionId] : undefined;

        // Determine Base Data Source (Server State)
        // Priority: Loaded Content > Active Version in Object
        let baseData: { content?: Block[], context?: string, variables?: PromptVariable[], aiEnhancedContent?: string | null } | null = null;
        
        if (currentLoadedVersionContent && currentLoadedVersionContent.id === selectedVersionId) {
            baseData = currentLoadedVersionContent;
        } else if (isSelectedVersionActive && currentPrompt.activeVersion) {
            baseData = currentPrompt.activeVersion;
        }

        // --- RESOLVE VARIABLES ---
        if (override?.variables) {
            vars = override.variables;
        } else if (baseData?.variables) {
            vars = baseData.variables;
        } else if (mergedVersion?.variables) {
            // Fallback for when variables exist in the summary list but not loaded content
            vars = mergedVersion.variables;
        }

        // --- RESOLVE CONTEXT ---
        if (override?.context !== undefined) {
            context = override.context;
        } else if (baseData?.context !== undefined) {
             context = baseData.context;
        } else if (mergedVersion?.context !== undefined) {
             context = mergedVersion.context;
        }

        // --- RESOLVE AI CONTENT ---
        if (override?.aiEnhancedContent !== undefined) {
             aiContent = override.aiEnhancedContent;
        } else if (baseData?.aiEnhancedContent !== undefined) {
             aiContent = baseData.aiEnhancedContent ?? null;
        } else if (mergedVersion?.aiEnhancedContent !== undefined) {
             aiContent = mergedVersion.aiEnhancedContent;
        }

        // --- RESOLVE BLOCKS (CONTENT) ---
        // 1. Cache (Editor State - High Priority for text editing)
        // 2. Override (Unlikely for blocks as they go to cache, but for safety)
        // 3. Base Data
        if (selectedVersionId && blockCache.current[selectedVersionId]) {
            blocks = blockCache.current[selectedVersionId];
        } else if (override?.content) {
            blocks = override.content as Block[];
        } else if (baseData?.content) {
            blocks = baseData.content;
        } else if (mergedVersion?.content) {
            blocks = mergedVersion.content;
        }

        // --- RESOLVE NOTES ---
        notes = mergedVersion?.notes ?? 'Untitled Version';

        return { 
            contentToDisplay: blocks, 
            contextToDisplay: context, 
            variablesToDisplay: vars, 
            notesToDisplay: notes, 
            aiEnhancedContentToDisplay: aiContent 
        };
        
    }, [isSelectedVersionActive, currentPrompt.activeVersion, mergedVersions, currentLoadedVersionContent, selectedVersionId, activeVersionId, rightTab, versionOverrides]);

    // Determining editing state
    const hasCacheForCurrentVersion = selectedVersionId && !!blockCache.current[selectedVersionId];
    const isMatchingContentAvailable = currentLoadedVersionContent?.id === selectedVersionId;
    
    const isEditorContentLoading = (!isSelectedVersionActive && !hasCacheForCurrentVersion && !versionContentError) && (loadingVersionContent || !isMatchingContentAvailable);

    // COMBINED LOADING STATE
    const shouldShowBigLoader = isLoadingDetails || isEditorContentLoading || isTransitioning;

    const [showVariableBuilder, setShowVariableBuilder] = useState(false);
    
    // Preview States
    const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({});
    const [renderedPreviewString, setRenderedPreviewString] = useState("");
    const [renderedPreviewNodes, setRenderedPreviewNodes] = useState<React.ReactNode>(null);
    const [isResolvingVariables, setIsResolvingVariables] = useState(false);

    const [pendingNotes, setPendingNotes] = useState("");
    const [isSnapshotting, setIsSnapshotting] = useState(false);
    const [isSettingActive, setIsSettingActive] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
    const [enhancementError, setEnhancementError] = useState<string | null>(null);
    const [copiedStatus, setCopiedStatus] = useState<'original' | 'enhanced' | null>(null);

    const enhancementPhases = useMemo(() => ['Thinking', 'Analysing', 'Preparing'], []);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(-1);

    // --- Dynamic Variable Resolution ---
    const [resolveVariable] = useLazyQuery(RESOLVE_PROMPT_VARIABLE_QUERY, { fetchPolicy: 'network-only' });

    // 1. Initialize static/default values
    useEffect(() => {
        const initialPreviewValues: Record<string, string> = {};
        const dynamicVars = (variablesToDisplay || []).filter(v => v.source);
        
        (variablesToDisplay || []).forEach(v => {
            initialPreviewValues[v.placeholder] = v.defaultValue ?? '';
        });
        
        setPreviewVariableValues(initialPreviewValues);
        if (dynamicVars.length > 0) {
            setIsResolvingVariables(true);
        } else {
            setIsResolvingVariables(false);
        }
    }, [variablesToDisplay]);

    // 2. Fetch dynamic values
    useEffect(() => {
        if (!variablesToDisplay || !projectId) return;

        const dynamicVars = variablesToDisplay.filter(v => v.source);
        if (dynamicVars.length === 0) {
            setIsResolvingVariables(false);
            return;
        }

        setIsResolvingVariables(true);

        const fetchAll = async () => {
            const updates: Record<string, string> = {};
            
            await Promise.all(dynamicVars.map(async (variable) => {
                try {
                    const { data } = await resolveVariable({
                        variables: {
                            projectId,
                            variableSource: variable.source,
                            promptVariableId: variable.id
                        }
                    });
                    
                    if (data?.resolvePromptVariable) {
                        updates[variable.placeholder] = data.resolvePromptVariable;
                    } else {
                        updates[variable.placeholder] = variable.defaultValue || variable.placeholder;
                    }
                } catch (err) {
                    console.error(`Failed to resolve variable ${variable.name}:`, err);
                    updates[variable.placeholder] = variable.defaultValue || variable.placeholder;
                }
            }));

            setPreviewVariableValues(prev => ({ ...prev, ...updates }));
            setIsResolvingVariables(false);
        };

        fetchAll();
    }, [variablesToDisplay, projectId, resolveVariable]);


    // 3. Generate Preview
    useEffect(() => {
        const renderContextWithHighlights = (text: string, values: Record<string, string>, vars: PromptVariable[]): React.ReactNode[] => {
            if (!text) return [];
            
            const placeholderPatterns = vars.map(v => v.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
            if (placeholderPatterns.length === 0) return [text];

            const pattern = new RegExp(`(${placeholderPatterns.join('|')})`, 'g');
            const parts = text.split(pattern);

            return parts.map((part, index) => {
                const matchingVar = vars.find(v => v.placeholder === part);
                if (matchingVar) {
                    const val = values[matchingVar.placeholder] || matchingVar.defaultValue || matchingVar.placeholder;
                    return <span key={`${index}-${val.substring(0,10)}`} className="font-bold text-blue-600">{val}</span>;
                }
                return <span key={index}>{part}</span>;
            });
        };

        let strContent = contentToDisplay.map(block => {
            if (block.type === 'text') return block.value ?? '';
            if (block.type === 'variable') return previewVariableValues[block.placeholder] || block.placeholder;
            return '';
        }).join('\n'); 

        let strContext = contextToDisplay;
        variablesToDisplay.forEach(v => {
            const val = previewVariableValues[v.placeholder] || v.defaultValue || v.placeholder;
            strContext = strContext.split(v.placeholder).join(val);
        });

        const fullString = [strContent, strContext].filter(Boolean).join('\n\n');
        setRenderedPreviewString(fullString);

        const nodes: React.ReactNode[] = [];
        contentToDisplay.forEach((block, idx) => {
            if (block.type === 'text') {
                nodes.push(<span key={`blk-${idx}`}>{block.value ?? ''}</span>);
            } else if (block.type === 'variable') {
                const val = previewVariableValues[block.placeholder] || block.placeholder;
                nodes.push(<span key={`blk-${idx}`} className="font-bold text-blue-600">{val}</span>);
            }
            if (idx < contentToDisplay.length - 1) {
                nodes.push("\n");
            }
        });

        if (contentToDisplay.length > 0 && contextToDisplay) {
            nodes.push(<div key="sep" className="h-4"></div>); 
        }

        if (contextToDisplay) {
           const contextNodes = renderContextWithHighlights(contextToDisplay, previewVariableValues, variablesToDisplay);
           nodes.push(<div key="ctx">{contextNodes}</div>);
        }

        setRenderedPreviewNodes(<>{nodes}</>);

    }, [contentToDisplay, contextToDisplay, variablesToDisplay, previewVariableValues]);


    useEffect(() => {
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

    // --- HANDLER: Update Version ---
    const handleUpdateVersion = useCallback((patch: Partial<Version>) => {
        if (!selectedVersionId) {
            toast.error("No version selected to update.");
            return;
        }

        console.group('📡 [PromptLab] handleUpdateVersion Triggered');
        console.log('Target Version ID:', selectedVersionId);
        console.log('Patch Data:', patch);

        // --- OPTIMISTIC UI UPDATE: Immediate List Reflection ---
        setVersionOverrides(prev => ({
            ...prev,
            [selectedVersionId]: { ...(prev[selectedVersionId] || {}), ...patch }
        }));

        // --- CACHE UPDATE: Content Caching ---
        if (patch.content) {
            console.log('💾 [PromptLab] Caching content for version:', selectedVersionId);
            blockCache.current[selectedVersionId] = patch.content as Block[];
        }
        console.groupEnd();

        // Cleaning Data for Network Request
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

        updatePromptVersion(currentPrompt.id, selectedVersionId, versionPatch);

    }, [currentPrompt.id, selectedVersionId, updatePromptVersion]);


    const handleUpdatePrompt = useCallback((patch: Partial<Prompt>) => {
        console.log('📡 [PromptLab] handleUpdatePrompt:', patch);
        updatePromptDetails(currentPrompt.id, patch);
    }, [currentPrompt.id, updatePromptDetails]);


    const handleSnapshot = useCallback(async (notes?: string) => {
        console.log('📸 [PromptLab] Snapshotting Version. Notes:', notes);
        setIsSnapshotting(true);
        try {
            await snapshotPrompt(notes);
            toast.success("New prompt version saved!");
            setPendingNotes('');
        } catch (error) {
            toast.error("Failed to save version", { description: (error as any).message || 'An unknown error occurred.' });
        } finally {
            setIsSnapshotting(false);
        }
    }, [currentPrompt.id, snapshotPrompt]);

    const handleSetActiveVersion = useCallback(async (versionId: string) => {
        console.log('🏁 [PromptLab] Setting Active Version:', versionId);
        setIsSettingActive(true);
        try {
            await setActivePromptVersion(versionId);
            toast.success("Version set as active!");
        } catch (error) {
            toast.error("Failed to set active version", { description: (error as any).message || 'An unknown error occurred.' });
        } finally {
            setIsSettingActive(false);
        }
    }, [currentPrompt.id, setActivePromptVersion]);

    // --- HANDLER: Create Variable ---
    const handleCreateVariable = useCallback((newVariable: Omit<PromptVariable, 'id'>) => {
        console.group('➕ [PromptLab] Creating Variable');
        console.log('Input Data:', newVariable);
        
        const variableWithId: PromptVariable = {
            ...newVariable,
            id: generateClientKey('p-var-'),
        };
        console.log('Generated Variable:', variableWithId);

        const updatedVariables = [...variablesToDisplay, variableWithId];
        console.log('New Variable List (Length):', updatedVariables.length);

        // Send update
        handleUpdateVersion({ variables: updatedVariables });
        
        setShowVariableBuilder(false);
        setLeftTab("variables"); 
        console.groupEnd();
    }, [variablesToDisplay, handleUpdateVersion]);

    const handleRemoveVariable = useCallback((variableId: string) => {
        console.log('🗑️ [PromptLab] Removing Variable ID:', variableId);
        const updatedVariables = variablesToDisplay.filter(v => v.id !== variableId);
        handleUpdateVersion({ variables: updatedVariables });
    }, [variablesToDisplay, handleUpdateVersion]);

    const handleEnhancePrompt = useCallback(async () => {
        if (!selectedVersionId) {
            toast.error("Cannot enhance prompt", { description: "Please select a version to enhance." });
            return;
        }
        setIsEnhancing(true);
        setEnhancedResult(null);
        setEnhancementError(null);
        const minAnimationTime = enhancementPhases.length * 1500;
        const startTime = Date.now();

        try {
            const { data } = await enhancePrompt({
                variables: {
                    input: {
                        promptId: currentPrompt.id,
                        versionId: selectedVersionId,
                        content: renderedPreviewString,
                        modelProfileId: currentPrompt.modelProfileId,
                    },
                },
            });
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
        }
    }, [currentPrompt.id, currentPrompt.modelProfileId, selectedVersionId, renderedPreviewString, enhancePrompt, enhancementPhases]);

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
                                                                    onClick={() => handleVersionSwitch(v.id)}
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
                                    
                                    <div className="min-h-0 flex-1 overflow-y-auto relative">
                                        {shouldShowBigLoader ? (
                                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
                                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            <>
                                                <TabsContent value="editor" className="m-0 outline-none flex-1 h-full">
                                                    <EditorPanel
                                                        // KEY IS CRITICAL: Forces clean slate on version switch, but state is restored via cache in parent
                                                        key={selectedVersionId || 'no-selection'}
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
                                                        availableModels={availableModels}
                                                        modelsLoading={modelsLoading}
                                                        modelsError={modelsError}
                                                    />
                                                </TabsContent>

                                                <TabsContent value="version-details" className="m-0 outline-none p-4 flex-1 overflow-y-auto">
                                                    <VersionsPanel
                                                        promptId={currentPrompt.id}
                                                        versions={mergedVersions || []}
                                                        selectedVersionId={selectedVersionId}
                                                        updateVersionDescription={updateVersionDescription}
                                                        contentToDisplay={contentToDisplay}
                                                        contextToDisplay={contextToDisplay}
                                                        variablesToDisplay={variablesToDisplay}
                                                    />
                                                </TabsContent>

                                                <TabsContent value="preview" className="m-0 outline-none p-4 flex-1 flex flex-col">
                                                    <div className="mb-4 flex flex-col h-full">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <div className="text-sm font-medium">Original Preview</div>
                                                            <Button size="sm" onClick={() => copy(renderedPreviewString, 'original')} className="h-8 btn-primary" disabled={copiedStatus === 'original'}>
                                                                {copiedStatus === 'original' ? '✓ Copied!' : <><Copy className="mr-1 h-4 w-4" />Copy</>}
                                                            </Button>
                                                        </div>
                                                        
                                                        <div className="relative w-full min-h-[200px] bg-[#f8f8f8] border border-[#e0e0e0] rounded-md overflow-hidden">
                                                            {isResolvingVariables && (
                                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f8f8f8] rounded-md">
                                                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                                </div>
                                                            )}
                                                            <pre className="font-mono whitespace-pre-wrap text-[#333] p-2 w-full h-full"
                                                                style={{ lineHeight: "1.5", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                                                                {renderedPreviewNodes}
                                                            </pre>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t">
                                                        <Button onClick={handleEnhancePrompt} disabled={isEnhancing || isResolvingVariables} className="btn-primary w-full sm:w-auto">
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
                                            </>
                                        )}
                                    </div>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </div>

                {projectId ? (
                    <VariableDiscoveryBuilder
                        open={showVariableBuilder}
                        onOpenChange={setShowVariableBuilder}
                        onCreate={handleCreateVariable}
                        projectId={projectId}
                    />
                ) : (
                    <ManualVariableDiscoveryBuilder
                        open={showVariableBuilder}
                        onOpenChange={setShowVariableBuilder}
                        onCreate={handleCreateVariable}
                    />
                )}
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

    const truncate = (str: string, n: number) => {
        return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
    };

    return (
        <div
            id={variable.id + '-drag-source'}
            className={`cursor-grab rounded px-2 py-1 mb-2 border ${isDragging ? 'opacity-0' : 'bg-gray-100'} flex items-center justify-between group`}
        >
            <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm" title={variable.name}>
                    {truncate(variable.name, 30)}
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate" title={variable.placeholder}>
                    ({variable.placeholder})
                </div>
            </div>
            <button
                onClick={() => onRemove(variable.id)}
                className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-opacity flex-shrink-0"
                aria-label={`Remove variable ${variable.name}`}
            >
                <Trash2 className="h-3 w-3" />
            </button>
        </div>
    )

}

// =================================================================================================
// EDITOR PANEL COMPONENT
// =================================================================================================
interface EditorPanelProps {
    prompt: Prompt;
    onUpdateVersion: (patch: Partial<Version>) => void;
    onUpdatePrompt: (patch: Partial<Prompt>) => void;
    onSnapshot: (notes?: string) => void;
    pendingNotes: string;
    setPendingNotes: (notes: string) => void;
    isSnapshotting: boolean;
    contentToDisplay: Block[];
    contextToDisplay: string;
    notesToDisplay: string;
    isEditingEnabled: boolean;
    versionId: string | null;
    availableModels: { id: string; name: string; }[];
    modelsLoading: boolean;
    modelsError: any;
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
    availableModels,
    modelsLoading,
    modelsError,
}: EditorPanelProps) {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [localNotes, setLocalNotes] = useState('');
    const [localContext, setLocalContext] = useState('');
    const [localModel, setLocalModel] = useState('');
    const isSwitchingVersions = useRef(true);
    const hasInitialized = useRef(false);

    useEffect(() => {
        setLocalModel(prompt.modelProfileId ?? '');
    }, [prompt.modelProfileId]);

    // --- LOGGING: Initial Block Load ---
    useEffect(() => {
        // Because we key this component by VersionID in the parent, this component REMOUNTS on version switch.
        // Therefore, we only want to load data ONCE when isEditingEnabled becomes true (data loaded).
        // Any subsequent prop updates (e.g. stale data from parent re-renders) are ignored.
        
        if (isEditingEnabled && !hasInitialized.current) {
            console.group('✏️ [EditorPanel] Initializing Version Content');
            console.log('Version ID:', versionId);
            console.log('Content:', contentToDisplay);
            console.groupEnd();

            isSwitchingVersions.current = true;
            hasInitialized.current = true;

            setLocalNotes(notesToDisplay);
            setLocalContext(contextToDisplay);
            setBlocks((contentToDisplay || []).map(b => ({ ...b })));

            const timer = setTimeout(() => {
                isSwitchingVersions.current = false;
            }, 500);

            return () => clearTimeout(timer);
        } else if (hasInitialized.current && isEditingEnabled) {
            // Debug log to confirm we are blocking the stale prop
            // console.log('🛡️ [EditorPanel] Ignoring prop update (already initialized)');
        }
    }, [isEditingEnabled, contentToDisplay, contextToDisplay, notesToDisplay, versionId]);

    // --- LOGGING: Block State Changes ---
    useEffect(() => {
        if(!isSwitchingVersions.current) {
            console.log('🔄 [EditorPanel] Blocks Updated (Local State):', blocks.length, 'blocks');
        }
    }, [blocks]);

    const [debouncedBlocks] = useDebounce(blocks, 500);
    const [debouncedLocalNotes] = useDebounce(localNotes, 300);
    const [debouncedLocalContext] = useDebounce(localContext, 300);
    const [debouncedLocalModel] = useDebounce(localModel, 300);

    // Sync Blocks to Parent
    useEffect(() => {
        if (isSwitchingVersions.current || !isEditingEnabled) return;
        if (!deepCompareBlocks(debouncedBlocks, contentToDisplay)) {
            console.log('📡 [EditorPanel] Syncing Blocks to Parent (Debounced):', debouncedBlocks);
            onUpdateVersion({ content: debouncedBlocks });
        }
    }, [debouncedBlocks, isEditingEnabled, onUpdateVersion]); // Removed contentToDisplay from deps to avoid loop loops, relying on ref init

    useEffect(() => {
        if (isSwitchingVersions.current || !isEditingEnabled) return;
        if (debouncedLocalNotes !== notesToDisplay) {
            onUpdateVersion({ notes: debouncedLocalNotes });
        }
    }, [debouncedLocalNotes, isEditingEnabled, onUpdateVersion]);

    useEffect(() => {
        if (isSwitchingVersions.current || !isEditingEnabled) return;
        if (debouncedLocalContext !== contextToDisplay) {
            onUpdateVersion({ context: debouncedLocalContext });
        }
    }, [debouncedLocalContext, isEditingEnabled, onUpdateVersion]);

    useEffect(() => {
        if (isSwitchingVersions.current || !isEditingEnabled) return;
        if (debouncedLocalModel !== (prompt.modelProfileId ?? '')) {
            onUpdatePrompt({ modelProfileId: debouncedLocalModel });
        }
    }, [debouncedLocalModel, isEditingEnabled, onUpdatePrompt]);


    const insertVariableAt = useCallback((index: number, variable: { placeholder: string; id: string; name: string }) => {
        console.log(`➕ [EditorPanel] Inserting Variable at index ${index}:`, variable);
        setBlocks(prev => {
            let copy = [...prev];
            const newVarBlock: Block = { type: 'variable', id: generateClientKey('v-'), varId: variable.id, placeholder: variable.placeholder, name: variable.name };
            copy.splice(index, 0, newVarBlock);
            return copy;
        });
    }, []);

    const insertTextAt = useCallback((index: number, text = '') => {
        console.log(`➕ [EditorPanel] Inserting Text Block at index ${index}. Text: "${text}"`);
        setBlocks(prev => {
            let copy = [...prev];
            const newBlock: Block = { type: 'text', id: generateClientKey('t-'), value: text }
            copy.splice(index, 0, newBlock)
            return copy
        })
    }, []);

    const updateTextBlock = useCallback((id: string, value: string) => {
        // Logging intentionally skipped to avoid spam on every keystroke
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
        console.log(`🗑️ [EditorPanel] Removing Block at index ${index}`);
        setBlocks(prev => {
            let copy = [...prev];
            if (index < 0 || index >= copy.length) return prev;
            copy.splice(index, 1);
            if (copy.length === 0) {
                copy.push({ type: 'text', id: generateClientKey('t-empty-after-remove'), value: '' });
            }
            return copy
        })
    }, []);

    const moveBlock = useCallback((from: number, to: number) => {
        console.log(`🚚 [EditorPanel] Moving Block from ${from} to ${to}`);
        setBlocks(prev => {
            let copy = [...prev];
            if (from < 0 || from >= copy.length || to < 0 || to > copy.length) return prev;
            const [item] = copy.splice(from, 1);
            copy.splice(to, 0, item);
            return copy;
        });
    }, []);

    const { isDragging: isDraggingSomething } = useDragLayer((monitor) => ({ isDragging: monitor.isDragging() }));

    const [{ isOverBlockContainer, canDropBlockContainer }, dropBlockContainer] = useDrop(() => ({
        accept: [ItemTypes.VARIABLE, ItemTypes.BLOCK],
        drop: (item: any, monitor) => {
            if (!isEditingEnabled || monitor.didDrop()) return;
            console.log('⬇️ [EditorPanel] Item Dropped on Container', item);
            let targetIndex = blocks.length === 0 ? 0 : blocks.length;
            if (monitor.getItemType() === ItemTypes.VARIABLE) {
                insertVariableAt(targetIndex, item);
            } else if (monitor.getItemType() === ItemTypes.BLOCK) {
                const dragIndex = item.index;
                if (dragIndex === targetIndex || dragIndex + 1 === targetIndex) {
                    return;
                }
                moveBlock(dragIndex, targetIndex);
                item.index = targetIndex;
            }
        },
        collect: (monitor) => ({
            isOverBlockContainer: monitor.isOver({ shallow: true }),
            canDropBlockContainer: monitor.canDrop() && isEditingEnabled,
        }),
    }), [blocks.length, insertVariableAt, moveBlock, isDraggingSomething, isEditingEnabled]);

    return (
        <div className="flex flex-col">
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
                        disabled={!isEditingEnabled || modelsLoading || !!modelsError}
                    >
                        {modelsLoading && <option value="">Loading models...</option>}
                        {modelsError && <option value="">Error loading models</option>}
                        {!modelsLoading && !modelsError && (
                            availableModels.length > 0 ? (
                                availableModels.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">No models available</option>
                            )
                        )}
                    </select>
                </div>
            </div>
            <div className="flex-1 p-4">
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
                                        Drag variables or click "Add text" to start.
                                        <button onClick={() => insertTextAt(0, '')} className="mt-4 px-3 py-1 border rounded-md text-sm text-gray-700 bg-white  flex items-center justify-center mx-auto">
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
                                    {isEditingEnabled && <HoverAddTextBlock key={`hover-insert-after-${b.id || i}`} index={i + 1} insertTextAt={insertTextAt} />}
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
            
            console.log('⬇️ [BlockRenderer] Drop on Block', { targetIndex: index, item });

            const dragItemType = monitor.getItemType();
            setLocalDropTargetPosition(null);
            let targetIndex = localDropTargetPosition === 'after' ? index + 1 : index;

            if (dragItemType === ItemTypes.VARIABLE) {
                insertVariableAt(targetIndex, item);
            } else if (dragItemType === ItemTypes.BLOCK) {
                const dragIndex = item.index;
                
                // If dragging DOWN, removing the item from the array shifts indices up by 1.
                // We must subtract 1 from the target index to account for this shift so the item lands
                // in the correct visual position.
                if (dragIndex < targetIndex) {
                    targetIndex--;
                }

                if (dragIndex === targetIndex) return;
                
                moveBlock(dragIndex, targetIndex);
                item.index = targetIndex;
            }
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
                <Button  size="sm" onClick={(e) => { e.stopPropagation(); insertTextAt(index); setIsHovering(false); }}
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
    const selectedVersionMetadata = versions.find(v => v.id === selectedVersionId);
    const [localVersionDescription, setLocalVersionDescription] = useState<string>('');
    const [debouncedVersionDescription] = useDebounce(localVersionDescription, 500);
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

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
// hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams } from "next/navigation";

import {
  GET_PROJECT_PROMPTS_QUERY,
  GET_PROMPT_DETAILS_QUERY,
} from "@/graphql/queries/promptRelatedQueries";
import {
  CREATE_PROMPT_MUTATION,
  UPDATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  SNAPSHOT_PROMPT_MUTATION,
  RESTORE_PROMPT_VERSION_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, PromptVariable, Version, ContentBlock } from '@/components/prompt-lab/store';

function cuid(prefix: string = ''): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function stripTypename<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => stripTypename(item)) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (key === '__typename') {
        continue;
      }
      newObj[key] = stripTypename((obj as any)[key]);
    }
    return newObj as T;
  }
  return obj;
}

// Helper for deep comparison of content blocks, crucial for optimistic updates
// Make sure this matches the one in prompt-lab.tsx
function deepCompareBlocks(arr1: ContentBlock[], arr2: ContentBlock[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    const b1 = arr1[i];
    const b2 = arr2[i];

    if (b1.id !== b2.id || b1.type !== b2.type) {
      return false;
    }

    if (b1.type === 'text') {
      if (b1.value !== b2.value) {
        return false;
      }
    } else if (b1.type === 'variable') {
      if (b1.varId !== b2.varId || b1.placeholder !== b2.placeholder || b1.name !== b2.name) {
        return false;
      }
    }
  }
  return true;
}


interface UsePromptLabHook {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  loading: boolean;
  error: string | null;
  createPrompt: () => Promise<Prompt | undefined>;
  updatePrompt: (
    id: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> & { content?: ContentBlock[] }>,
    onCompletedCallback?: (updatedData?: Prompt) => void,
    onErrorCallback?: () => void
  ) => void;
  deletePrompt: (id: string) => void;
  snapshotPrompt: (promptId: string, notes?: string) => void;
  restorePromptVersion: (promptId: string, versionId: string) => void;
  selectPrompt: (id: string | null) => void;
  triggerListFetchOnBack: () => void;
  projectId: string | undefined;
}

export function usePromptLab(initialProjectId?: string): UsePromptLabHook {
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const [listRefetchTrigger, setListRefetchTrigger] = useState(0);

  // New state to track optimistically updated content that matches server response
  // Maps promptId to the *content blocks* that were optimistically confirmed.
  const [optimisticallyConfirmedContent, setOptimisticallyConfirmedContent] = useState<Map<string, ContentBlock[]>>(new Map());
  // Ref to track if we're currently processing an optimistic update to prevent immediate re-fetching
  const isOptimisticUpdateInProgress = useRef<Set<string>>(new Set());


  const selectPrompt = useCallback((id: string | null) => {
    console.log('[data loading sequence] [usePromptLab] selectPrompt called with ID:', id);
    setSelectedId(id);
    setLocalLoading(true); // Always set loading true when a selection change is initiated
    // Clear any optimistic flags for the new selection, forcing a fresh load
    setOptimisticallyConfirmedContent(prev => {
        const newMap = new Map(prev);
        newMap.delete(id || ''); // Clear for selectedId
        return newMap;
    });
    isOptimisticUpdateInProgress.current.clear(); // Clear all ongoing flags as we're changing selected prompt
  }, []);

  // --- QUERY 1: Get list of prompts for the current project ---
  const {
    data: promptsListDataFromQuery,
    loading: listLoading,
    error: listError,
  } = useQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId, listRefetchTrigger },
    skip: !projectId,
    fetchPolicy: "network-only",
    onError: (err) => {
      console.error("[data loading sequence] [usePromptLab] Error fetching project prompts list:", err);
    },
  });

  // --- Effect to process list data when it arrives ---
  useEffect(() => {
    console.log(`[data loading sequence] [usePromptLab] useEffect (list data processing) RUNNING. listLoading: ${listLoading}, promptsListDataFromQuery: ${!!promptsListDataFromQuery}, listRefetchTrigger: ${listRefetchTrigger}`);

    if (listLoading) {
      console.log('[data loading sequence] [usePromptLab] useEffect (list data processing): List is still loading, awaiting data.');
      return;
    }

    if (promptsListDataFromQuery) { // Data is present and not loading
      console.log('[data loading sequence] [usePromptLab] useEffect (list data processing): Prompts list data received. Processing...');

      const fetchedListPrompts = promptsListDataFromQuery.getProjectPrompts || [];
      setPrompts((prevPrompts) => {
        const newPromptsMap = new Map<string, Prompt>();

        fetchedListPrompts.forEach((p_list: any) => {
          const existingDetailedPrompt = prevPrompts.find(prevP => prevP.id === p_list.id);
          newPromptsMap.set(p_list.id, {
            id: p_list.id, title: p_list.title, description: p_list.description, tags: p_list.tags,
            isPublic: p_list.isPublic, createdAt: p_list.createdAt, updatedAt: p_list.updatedAt,
            model: p_list.model || 'gpt-4o', projectId: p_list.projectId,
            // Preserve existing full details if available from `prevPrompts`
            content: existingDetailedPrompt?.content || [],
            context: existingDetailedPrompt?.context || '',
            variables: existingDetailedPrompt?.variables || [],
            versions: existingDetailedPrompt?.versions || [],
          });
        });

        // Ensure the currently selected prompt's full details are preserved
        if (selectedId) {
          const currentSelectedPromptInPrevState = prevPrompts.find(p => p.id === selectedId);
          // Only preserve if it had content (meaning it was a detailed prompt) and it's not already in the new map
          if (currentSelectedPromptInPrevState && currentSelectedPromptInPrevState.content && currentSelectedPromptInPrevState.content.length > 0 && !newPromptsMap.has(selectedId)) {
            newPromptsMap.set(selectedId, currentSelectedPromptInPrevState);
            console.log(`[data loading sequence] [usePromptLab] Preserving SELECTED prompt's full details for ID: ${selectedId} during list update.`);
          }
        }

        const finalPrompts = Array.from(newPromptsMap.values());
        const sortedFinalPrompts = finalPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log('[data loading sequence] [usePromptLab] Prompts state updated from list data. Final count:', sortedFinalPrompts.length);
        return sortedFinalPrompts;
      });
    }
  }, [promptsListDataFromQuery, listLoading, selectedId, listRefetchTrigger]);

  const triggerListFetchOnBack = useCallback(() => {
    console.log('[data loading sequence] [usePromptLab] triggerListFetchOnBack called: Incrementing listRefetchTrigger to force useQuery re-fetch.');
    setListRefetchTrigger(prev => prev + 1);
    setLocalLoading(true); // Indicate loading when list refetches
  }, []);

  // --- QUERY 2: Get details for the selected prompt ---
  const {
    data: promptDetailsData,
    loading: detailsLoading,
    error: detailsError,
  } = useQuery(
    GET_PROMPT_DETAILS_QUERY,
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only",
      // IMPORTANT: Prevent re-fetching or processing details if it's currently optimistically confirmed
      // for the selected ID. This is the core to prevent flicker.
      // This 'skip' condition should be carefully managed to ensure eventual consistency.
      // We skip if an optimistic content update has just been successfully applied and matches the UI.
      // The `!detailsLoading` check ensures we don't block the *initial* load.
      skip: !selectedId || (selectedId && optimisticallyConfirmedContent.has(selectedId) && !detailsLoading),
      onError: (err) => {
        console.error("[data loading sequence] [usePromptLab] Error fetching prompt details:", err);
        // If details fetch fails, remove any optimistic flag
        if (selectedId) {
            setOptimisticallyConfirmedContent(prev => {
                const newMap = new Map(prev);
                newMap.delete(selectedId);
                return newMap;
            });
        }
      },
    }
  );

  // --- Effect to update `prompts` state with full details when `promptDetailsData` arrives ---
  useEffect(() => {
    console.log(`[data loading sequence] [usePromptLab] useEffect (details data processing) RUNNING. detailsLoading: ${detailsLoading}, promptDetailsData: ${!!promptDetailsData}, selectedId: ${selectedId}`);

    // Only process if data is available, not loading, and matches selectedId
    if (selectedId && !detailsLoading && promptDetailsData?.getPromptDetails?.id === selectedId) {
      // Before processing, check if we have an optimistically confirmed content that matches this incoming data.
      const incomingContent = promptDetailsData.getPromptDetails.content || [];
      const optimisticallyKnownContent = optimisticallyConfirmedContent.get(selectedId);

      if (optimisticallyKnownContent && deepCompareBlocks(optimisticallyKnownContent, incomingContent)) {
          // If incoming server data for content matches our optimistically confirmed state,
          // we don't need to trigger a UI update based on this data to prevent flicker.
          console.log(`[data loading sequence] [usePromptLab] Details data for ID ${selectedId} matches optimistic state. Skipping UI update to prevent flicker.`);
          // Clear the optimistic flag now that we've seen the matching server data
          setOptimisticallyConfirmedContent(prev => {
              const newMap = new Map(prev);
              newMap.delete(selectedId);
              return newMap;
          });
          isOptimisticUpdateInProgress.current.delete(selectedId);
          setLocalLoading(false); // Ensure loader is off as details are consistent
          return; // Skip the rest of the effect
      }

      console.log(`[data loading sequence] [usePromptLab] useEffect (details data processing): Details data received for ID: ${selectedId}. Processing...`);
      const p = promptDetailsData.getPromptDetails;
      const mappedDetailedPrompt = {
        id: p.id, title: p.title, description: p.description, tags: p.tags,
        isPublic: p.isPublic, createdAt: p.createdAt, updatedAt: p.updatedAt,
        model: p.model || 'gpt-4o', projectId: p.projectId,
        content: (p.content || []).map((b: ContentBlock) => ({ ...b, id: b.id || cuid('db-block-') })),
        context: p.context,
        variables: (p.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
        versions: (p.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-'), content: (v.content || []).map((b: ContentBlock) => ({ ...b, id: b.id || cuid('db-block-v-') })) })),
      };

      setPrompts(prevPrompts => {
        const existingIndex = prevPrompts.findIndex(p => p.id === mappedDetailedPrompt.id);
        if (existingIndex > -1) {
          const updated = [...prevPrompts];
          updated[existingIndex] = mappedDetailedPrompt; // Replace old entry with detailed one
          console.log(`[data loading sequence] [usePromptLab] Updated existing prompt ID ${mappedDetailedPrompt.id} in prompts state with full details.`);
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          console.log(`[data loading sequence] [usePromptLab] Added new detailed prompt ID ${mappedDetailedPrompt.id} to prompts state.`);
          return [...prevPrompts, mappedDetailedPrompt].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      });
      // Clear optimistic flag after processing details
      setOptimisticallyConfirmedContent(prev => {
          const newMap = new Map(prev);
          newMap.delete(selectedId);
          return newMap;
      });
      isOptimisticUpdateInProgress.current.delete(selectedId);
    }
  }, [promptDetailsData, detailsLoading, selectedId, optimisticallyConfirmedContent]);


  // Effect for setting global error state
  useEffect(() => {
    if (listError) {
      console.log(`[data loading sequence] [usePromptLab] Setting localError from listError: ${listError.message}`);
      setLocalError(listError.message);
    } else if (detailsError) {
      console.log(`[data loading sequence] [usePromptLab] Setting localError from detailsError: ${detailsError.message}`);
      setLocalError(detailsError.message);
    } else {
      if (localError) { // Only clear if there was a previous error
        console.log('[data loading sequence] [usePromptLab] Clearing localError.');
        setLocalError(null);
      }
    }
  }, [listError, detailsError, localError]);


  // --- Consolidated selectedPrompt logic ---
  const selectedPrompt = useMemo(
    () => {
      console.log('[data loading sequence] [usePromptLab] selectedPrompt useMemo RUNNING.');
      const foundPrompt = prompts.find((p) => p.id === selectedId);

      if (foundPrompt) {
        console.log(`[data loading sequence] [usePromptLab] selectedPrompt useMemo: Found prompt ID ${foundPrompt.id} in 'prompts' state. Content length: ${foundPrompt.content?.length || 0}.`);
        return foundPrompt; // Return whatever is found, completeness check moves to localLoading effect
      }

      console.log('[data loading sequence] [usePromptLab] selectedPrompt useMemo: No prompt found in `prompts` state for selectedId:', selectedId);
      return null;
    },
    [prompts, selectedId] // Depend on `prompts` and `selectedId`
  );

  // --- Consolidated Global Loading State Logic (FIXED FOR EMPTY CONTENT) ---
  useEffect(() => {
    const isProjectMissing = !projectId;
    const isListLoadingNow = listLoading;
    const areDetailsLoadingNow = detailsLoading;

    // A prompt is ready if a selectedId exists, selectedPrompt is populated,
    // AND there's no active optimistic update for this ID (isOptimisticUpdateInProgress),
    // AND details are not currently loading.
    const isSelectedPromptReady = !!selectedId && !!selectedPrompt && !isOptimisticUpdateInProgress.current.has(selectedId) && !areDetailsLoadingNow;


    const newLocalLoading = isProjectMissing || isListLoadingNow || (!!selectedId && (!isSelectedPromptReady && !optimisticallyConfirmedContent.has(selectedId)));


    if (newLocalLoading !== localLoading) {
      console.log(`[data loading sequence] [usePromptLab] useEffect (GLOBAL LOADING STATE): Changing from ${localLoading} to ${newLocalLoading}. Reasons: ` +
        `projectIdMissing=${isProjectMissing} (${projectId ? 'exists' : 'null'}), ` +
        `listLoading=${isListLoadingNow} (${listLoading}), ` +
        `detailsLoading=${areDetailsLoadingNow} (${detailsLoading}), ` +
        `selectedId=${selectedId || 'null'}, ` +
        `isSelectedPromptReady=${isSelectedPromptReady} (selectedPrompt: ${!!selectedPrompt ? 'exists' : 'null'}), ` +
        `isOptimisticUpdateInProgress: ${isOptimisticUpdateInProgress.current.has(selectedId)}, ` +
        `optimisticallyConfirmedContent: ${optimisticallyConfirmedContent.has(selectedId)}`);
      setLocalLoading(newLocalLoading);
    } else {
      console.log(`[data loading sequence] [usePromptLab] useEffect (GLOBAL LOADING STATE): localLoading is ${localLoading}, no change. ` +
        `Current reasons: projectIdMissing=${isProjectMissing}, listLoading=${isListLoadingNow}, ` +
        `detailsLoading=${areDetailsLoadingNow}, selectedId=${selectedId || 'null'}, ` +
        `isSelectedPromptReady=${isSelectedPromptReady}, ` +
        `isOptimisticUpdateInProgress: ${isOptimisticUpdateInProgress.current.has(selectedId)}, ` +
        `optimisticallyConfirmedContent: ${optimisticallyConfirmedContent.has(selectedId)}`);
    }
  }, [listLoading, detailsLoading, selectedId, projectId, selectedPrompt, localLoading, optimisticallyConfirmedContent, isOptimisticUpdateInProgress.current]);


  // --- Mutations ---
  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      console.log('[data loading sequence] [usePromptLab] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:', data?.createPrompt?.id);
      setLocalError(null);
      if (data?.createPrompt) {
        triggerListFetchOnBack(); // This will trigger list refresh
        selectPrompt(data.createPrompt.id); // This will trigger details fetch and set localLoading=true
      } else {
        setLocalLoading(false); // If no data, turn off loader.
      }
    },
    onError: (err) => {
      console.error("[data loading sequence] [usePromptLab] Mutation Error: Create Prompt", err);
      setLocalError("Failed to create prompt.");
      setLocalLoading(false); // Turn off loader on error
    },
  });

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: (data, clientOptions) => {
      const updatedPrompt = data?.updatePrompt;
      const id = (clientOptions as any)?.variables?.input?.id;
      const sentContent = (clientOptions as any)?.variables?.input?.content;
      console.log('[data loading sequence] [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted for ID:', id);

      if (updatedPrompt && id) {
        setPrompts(prevPrompts => {
          const mappedUpdatedPrompt = {
            id: updatedPrompt.id, title: updatedPrompt.title, description: updatedPrompt.description, tags: updatedPrompt.tags,
            isPublic: updatedPrompt.isPublic, createdAt: updatedPrompt.createdAt, updatedAt: updatedPrompt.updatedAt,
            model: updatedPrompt.model || 'gpt-4o', projectId: updatedPrompt.projectId,
            content: (updatedPrompt.content || []).map((b: ContentBlock) => ({ ...b, id: b.id || cuid('db-block-') })),
            context: updatedPrompt.context,
            variables: (updatedPrompt.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
            versions: (updatedPrompt.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-'), content: (v.content || []).map((b: ContentBlock) => ({ ...b, id: b.id || cuid('db-block-v-') })) })),
          };

          const existingIndex = prevPrompts.findIndex(p => p.id === mappedUpdatedPrompt.id);
          if (existingIndex > -1) {
            const newPrompts = [...prevPrompts];
            newPrompts[existingIndex] = mappedUpdatedPrompt;
            return newPrompts;
          } else {
            return [...prevPrompts, mappedUpdatedPrompt];
          }
        });
        setLocalError(null);

        // Check if the server's returned content matches what we optimistically sent
        if (selectedId === id && sentContent && deepCompareBlocks(sentContent, updatedPrompt.content || [])) {
            // Content matches, so we can mark it as optimistically confirmed
            // This will prevent GET_PROMPT_DETAILS_QUERY from re-fetching immediately
            setOptimisticallyConfirmedContent(prev => new Map(prev).set(id, sentContent));
            console.log(`[data loading sequence] [usePromptLab] Optimistic content for ID ${id} confirmed by server response.`);
        } else if (selectedId === id) {
            // Content did not match, or we didn't send content.
            // Ensure any optimistic flag is cleared so a refresh will occur.
            setOptimisticallyConfirmedContent(prev => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
            });
            console.log(`[data loading sequence] [usePromptLab] Optimistic content for ID ${id} did NOT match server response or no content sent.`);
        }

        // Only trigger a full re-fetch/re-select if there's no pending optimistic update
        // or if content didn't match. Otherwise, just clear in-progress flag and let details query react.
        if (isOptimisticUpdateInProgress.current.has(id)) {
            isOptimisticUpdateInProgress.current.delete(id);
            setLocalLoading(false); // Optimistic UI is handling, turn off global loader
        } else {
            // This path is for updates not related to the content editor, or if content didn't match.
            triggerListFetchOnBack();
            if (selectedId === id) {
                selectPrompt(selectedId);
            } else {
                setLocalLoading(false);
            }
        }
        (clientOptions as any)?.variables?.onCompletedCallback?.(updatedPrompt);
      } else {
        console.error('[data loading sequence] [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted with no data.updatePrompt or ID.');
        setLocalError("Failed to update prompt details.");
        setLocalLoading(false);
        const optimisticId = (clientOptions as any)?.variables?.input?.id;
        if (optimisticId) isOptimisticUpdateInProgress.current.delete(optimisticId);
        (clientOptions as any)?.variables?.onErrorCallback?.();
      }
    },
    onError: (err, clientOptions) => {
      const id = (clientOptions as any)?.variables?.input?.id;
      console.error("[data loading sequence] [usePromptLab] Mutation Error: Update Prompt for ID:", id, err);
      setLocalError("Failed to update prompt.");
      setLocalLoading(false);
      // Remove from pending on network error too
      if (id) {
        isOptimisticUpdateInProgress.current.delete(id);
        setOptimisticallyConfirmedContent(prev => {
            const newMap = new Map(prev);
            newMap.delete(id); // Clear optimistic flag on error
            return newMap;
        });
      }
      (clientOptions as any)?.variables?.onErrorCallback?.();
    },
  });

  const deletePromptMutation = useMutation(DELETE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      console.log('[data loading sequence] [usePromptLab] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:', data?.deletePrompt.id);
      setLocalError(null);
      if (data?.deletePrompt.id) {
        triggerListFetchOnBack(); // Refresh list after deletion
        if (selectedId === data.deletePrompt.id) {
          setSelectedId(null); // Deselect if deleted, this will also turn off details loading
        }
      }
      setLocalLoading(false); // Loader can be turned off here as it's a terminal action
    },
    onError: (err) => {
      console.error("[data loading sequence] [usePromptLab] Mutation Error: Delete Prompt", err);
      setLocalError("Failed to delete prompt.");
      setLocalLoading(false); // Turn off loader on error
    },
  });

  const snapshotPromptMutation = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      console.log('[data loading sequence] [usePromptLab] SNAPSHOT_PROMPT_MUTATION onCompleted. Prompt ID:', data?.snapshotPrompt?.id);
      setLocalError(null);
      if (data?.snapshotPrompt?.id) {
        if (selectedId === data.snapshotPrompt.id) {
          console.log('[data loading sequence] [usePromptLab] SNAPSHOT_PROMPT_MUTATION: Re-selecting prompt to trigger fresh details fetch.');
          selectPrompt(selectedId); // This will trigger a new details fetch, which will manage localLoading
        } else {
          setLocalLoading(false); // If not current prompt, then this update finished.
        }
      } else {
        setLocalLoading(false); // If no data.snapshotPrompt, then it finished.
      }
    },
    onError: (err) => {
      console.error("[data loading sequence] [usePromptLab] Mutation Error: Snapshot Prompt", err);
      setLocalError("Failed to save version.");
      setLocalLoading(false); // Turn off loader on error
    },
  });

  const restorePromptVersionMutation = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      console.log('[data loading sequence] [usePromptLab] RESTORE_PROMPT_VERSION_MUTATION onCompleted. Prompt ID:', data?.restorePromptVersion?.id);
      setLocalError(null);
      if (data?.restorePromptVersion?.id) {
        if (selectedId === data.restorePromptVersion.id) {
          console.log('[data loading sequence] [usePromptLab] RESTORE_PROMPT_VERSION_MUTATION: Re-selecting prompt to trigger fresh details fetch.');
          selectPrompt(selectedId); // This will trigger a new details fetch, which will manage localLoading
        } else {
          setLocalLoading(false); // If not current prompt, then this update finished.
        }
      } else {
        setLocalLoading(false); // If no data.restorePromptVersion, then it finished.
      }
      // Clear any optimistic flags as a restore should always force a full refresh
      if (selectedId) {
        setOptimisticallyConfirmedContent(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedId);
            return newMap;
        });
        isOptimisticUpdateInProgress.current.delete(selectedId);
      }
    },
    onError: (err) => {
      console.error("[data loading sequence] [usePromptLab] Mutation Error: Restore Prompt Version", err);
      setLocalError("Failed to restore version.");
      setLocalLoading(false); // Turn off loader on error
    },
  });

  console.log(`[data loading sequence] [usePromptLab] Hook Rendered. ` +
              `Prompts count: ${prompts.length}, Selected ID: ${selectedId || 'none'}, ` +
              `List Loading: ${listLoading}, Details Loading: ${detailsLoading}, ` +
              `Global Loading: ${localLoading}, ` +
              `Selected Prompt (memo): ${selectedPrompt ? 'EXISTS' : 'NULL'}, ` +
              `Selected Prompt Content Length: ${selectedPrompt?.content?.length || 0}`);

  return {
    prompts,
    selectedPrompt,
    loading: localLoading,
    error: localError,
    createPrompt: useCallback(
      async (): Promise<Prompt | undefined> => {
        setLocalError(null);
        setLocalLoading(true); // Start global loader
        console.log('[data loading sequence] [usePromptLab] createPrompt: Initiating creation for projectId:', projectId);
        try {
          const defaultPromptInput: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> & { content?: ContentBlock[] } = {
            title: 'Untitled Prompt', content: [], context: '', description: '',
            category: '', tags: [], isPublic: false, model: 'gpt-4o',
            projectId: projectId, variables: [],
          };
          const { data } = await createPromptMutation({ variables: { input: stripTypename(defaultPromptInput) } });
          return data?.createPrompt ? {
              id: data.createPrompt.id, title: data.createPrompt.title,
              content: (data.createPrompt.content || []).map((b: ContentBlock) => ({ ...b, id: b.id || cuid('db-block-') })),
              context: data.createPrompt.context, description: data.createPrompt.description,
              tags: data.createPrompt.tags, isPublic: data.createPrompt.isPublic,
              createdAt: data.createPrompt.createdAt, updatedAt: data.createPrompt.updatedAt,
              model: data.createPrompt.model, projectId: data.createPrompt.projectId,
              variables: (data.createPrompt.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
              versions: (data.createPrompt.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-'), content: (v.content || []).map((b: ContentBlock) => ({ ...b, id: b.id || cuid('db-block-v-') })) })),
            } : undefined;
        } catch (err: any) {
          console.error("[data loading sequence] [usePromptLab] Error creating prompt via GraphQL:", err);
          setLocalError("Failed to create prompt.");
          setLocalLoading(false); // Turn off loader on error
        }
        return undefined;
      },
      [projectId, createPromptMutation, selectPrompt, triggerListFetchOnBack]
    ),
    updatePrompt: useCallback(
      (
        id: string,
        updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> & { content?: ContentBlock[] }>,
        onCompletedCallback?: (updatedData?: Prompt) => void,
        onErrorCallback?: () => void
      ) => {
        setLocalError(null);
        // Only set localLoading to true if this is an update that might take time and isn't purely UI-driven.
        // For optimistic content updates, the UI is already updated, so we might want to keep localLoading false.
        // However, other updates (like title, context, model) might still cause a momentary loader.
        setLocalLoading(true); // Default to showing loader. Individual onCompleted/onError will turn it off.

        // Mark this prompt as having an optimistic update in progress for this ID
        isOptimisticUpdateInProgress.current.add(id);
        console.log('[data loading sequence] [usePromptLab] updatePrompt: Sending mutation for prompt ID:', id, 'with:', updates.title ? `new title: "${updates.title}"` : 'other updates');

        updatePromptMutation({
          variables: {
            input: stripTypename({
              id, title: updates.title, content: updates.content, context: updates.context,
              description: updates.description, category: updates.category, tags: updates.tags,
              isPublic: updates.isPublic, model: updates.model, variables: updates.variables,
            }),
            onCompletedCallback,
            onErrorCallback,
          },
        }).catch((err) => {
          console.error("[data loading sequence] [usePromptLab] Mutation Error: Update Prompt", err);
          setLocalError("Failed to update prompt.");
          setLocalLoading(false);
          if (id) { // Ensure cleanup if an error occurs outside onCompleted/onError in mutation options
              isOptimisticUpdateInProgress.current.delete(id);
              setOptimisticallyConfirmedContent(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(id); // Clear optimistic flag on network error
                  return newMap;
              });
          }
          onErrorCallback?.();
        });
      },
      [updatePromptMutation, isOptimisticUpdateInProgress]
    ),
    deletePrompt: useCallback(
      (id: string) => {
        setLocalError(null);
        setLocalLoading(true); // Start global loader
        console.log('[data loading sequence] [usePromptLab] deletePrompt: Sending mutation for prompt ID:', id);

        deletePromptMutation({
          variables: { id },
        }).catch((err) => {
          console.error("[data loading sequence] [usePromptLab] Mutation Error: Delete Prompt", err);
          setLocalError("Failed to delete prompt.");
          setLocalLoading(false); // Turn off loader on error
        });
      },
      [selectedId, deletePromptMutation, triggerListFetchOnBack]
    ),
    snapshotPrompt: useCallback(
      (promptId: string, notes?: string) => {
        setLocalError(null);
        setLocalLoading(true); // Start global loader
        console.log('[data loading sequence] [usePromptLab] snapshotPrompt: Initiating snapshot for prompt ID:', promptId);
        snapshotPromptMutation({
          variables: {
            input: stripTypename({ promptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` }),
          },
        }).catch((err) => {
          console.error("[data loading sequence] [usePromptLab] Mutation Error: Snapshot Prompt", err);
          setLocalError("Failed to save version.");
          setLocalLoading(false); // Turn off loader on error
        });
      },
      [snapshotPromptMutation, selectedId, selectPrompt]
    ),
    restorePromptVersion: useCallback(
      (promptId: string, versionId: string) => {
        setLocalError(null);
        setLocalLoading(true); // Start global loader
        console.log('[data loading sequence] [usePromptLab] restorePromptVersion: Initiating restore for prompt ID:', promptId, 'version ID:', versionId);
        restorePromptVersionMutation({
          variables: {
            input: stripTypename({ promptId, versionId }),
          },
        }).catch((err) => {
          console.error("[data loading sequence] [usePromptLab] Mutation Error: Restore Prompt Version", err);
          setLocalError("Failed to restore version.");
          setLocalLoading(false); // Turn off loader on error
        });
      },
      [restorePromptVersionMutation, selectedId, selectPrompt]
    ),
    selectPrompt,
    triggerListFetchOnBack,
    projectId,
  };
}
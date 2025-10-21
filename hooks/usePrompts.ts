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


interface UsePromptLabHook {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  loading: boolean;
  error: string | null;
  createPrompt: () => Promise<Prompt | undefined>;
  updatePrompt: (
    id: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> & { content?: ContentBlock[] }>
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

  const selectPrompt = useCallback((id: string | null) => {
    console.log('[data loading sequence] [usePromptLab] selectPrompt called with ID:', id);
    setSelectedId(id);
    setLocalLoading(true); // Always set loading true when a selection change is initiated
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
      // No setLocalLoading(false) here, consolidated effect handles it
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
      onError: (err) => {
        console.error("[data loading sequence] [usePromptLab] Error fetching prompt details:", err);
      },
    }
  );

  // --- Effect to update `prompts` state with full details when `promptDetailsData` arrives ---
  useEffect(() => {
    console.log(`[data loading sequence] [usePromptLab] useEffect (details data processing) RUNNING. detailsLoading: ${detailsLoading}, promptDetailsData: ${!!promptDetailsData}, selectedId: ${selectedId}`);

    // This effect runs whenever detailsLoading or promptDetailsData changes
    // It should *only* update `prompts` state when a selectedId is active AND data is *available* and *not loading*.
    if (selectedId && !detailsLoading && promptDetailsData?.getPromptDetails?.id === selectedId) {
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
    }
  }, [promptDetailsData, detailsLoading, selectedId]);


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

    // The key change: The global loader should turn off once details query *has returned data*,
    // regardless of whether `content` is empty or not. An empty `content` array *is* data.
    // So, `isSelectedPromptReady` should be true if a selectedId exists AND selectedPrompt is not null.
    const isSelectedPromptReady = !!selectedId && !!selectedPrompt;

    // localLoading is TRUE if:
    // 1. Project ID is missing (can't load anything)
    // 2. The list of prompts is currently loading
    // 3. Details for the selected prompt are currently loading
    // 4. A prompt is selected, but the `selectedPrompt` object hasn't been populated yet
    const newLocalLoading = isProjectMissing || isListLoadingNow || areDetailsLoadingNow || (!!selectedId && !isSelectedPromptReady);


    if (newLocalLoading !== localLoading) {
      console.log(`[data loading sequence] [usePromptLab] useEffect (GLOBAL LOADING STATE): Changing from ${localLoading} to ${newLocalLoading}. Reasons: ` +
        `projectIdMissing=${isProjectMissing} (${projectId ? 'exists' : 'null'}), ` +
        `listLoading=${isListLoadingNow} (${listLoading}), ` +
        `detailsLoading=${areDetailsLoadingNow} (${detailsLoading}), ` +
        `selectedId=${selectedId || 'null'}, ` +
        `isSelectedPromptReady=${isSelectedPromptReady} (selectedPrompt: ${!!selectedPrompt ? 'exists' : 'null'})`);
      setLocalLoading(newLocalLoading);
    } else {
      console.log(`[data loading sequence] [usePromptLab] useEffect (GLOBAL LOADING STATE): localLoading is ${localLoading}, no change. ` +
        `Current reasons: projectIdMissing=${isProjectMissing}, listLoading=${isListLoadingNow}, ` +
        `detailsLoading=${areDetailsLoadingNow}, selectedId=${selectedId || 'null'}, ` +
        `isSelectedPromptReady=${isSelectedPromptReady}`);
    }
  }, [listLoading, detailsLoading, selectedId, projectId, selectedPrompt, localLoading]);


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
    onCompleted: (data) => {
      console.log('[data loading sequence] [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted: mutation successful for prompt ID:', data?.updatePrompt?.id);
      setLocalError(null);
      if (data?.updatePrompt) {
        triggerListFetchOnBack(); // Update list in case title/tags changed
        if (selectedId) {
          console.log('[data loading sequence] [usePromptLab] UPDATE_PROMPT_MUTATION: Re-selecting prompt to trigger fresh details fetch.');
          selectPrompt(selectedId); // This will trigger a new details fetch, which will manage localLoading
        } else {
          setLocalLoading(false); // If no prompt selected, then this update finished.
        }
      } else {
        setLocalLoading(false); // If no data.updatePrompt, then it finished.
      }
    },
    onError: (err) => {
      console.error("[data loading sequence] [usePromptLab] Mutation Error: Update Prompt", err);
      setLocalError("Failed to update prompt.");
      setLocalLoading(false); // Turn off loader on error
    },
  });

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
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

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
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

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
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
      // Consider an immediate list refetch here if restoring a version affects the list (e.g., updates `updatedAt`)
      // triggerListFetchOnBack(); // Optionally
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
        updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> & { content?: ContentBlock[] }>
      ) => {
        setLocalError(null);
        setLocalLoading(true); // Start global loader
        console.log('[data loading sequence] [usePromptLab] updatePrompt: Sending mutation for prompt ID:', id, 'with:', updates.title ? `new title: "${updates.title}"` : 'other updates');

        updatePromptMutation({
          variables: {
            input: stripTypename({
              id, title: updates.title, content: updates.content, context: updates.context,
              description: updates.description, category: updates.category, tags: updates.tags,
              isPublic: updates.isPublic, model: updates.model, variables: updates.variables,
            }),
          },
        }).catch((err) => {
          console.error("[data loading sequence] [usePromptLab] Mutation Error: Update Prompt", err);
          setLocalError("Failed to update prompt.");
          setLocalLoading(false); // Turn off loader on error
        });
      },
      [updatePromptMutation, selectedId, selectPrompt, triggerListFetchOnBack]
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
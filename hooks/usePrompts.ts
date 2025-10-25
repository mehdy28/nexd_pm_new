// hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { useParams } from "next/navigation";

import {
  GET_PROJECT_PROMPTS_QUERY,
  GET_PROMPT_DETAILS_QUERY,
  RESOLVE_PROMPT_VARIABLE_QUERY, // Not used in this context, but keeping
} from "@/graphql/queries/promptRelatedQueries";
import {
  CREATE_PROMPT_MUTATION,
  UPDATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  SNAPSHOT_PROMPT_MUTATION,
  RESTORE_PROMPT_VERSION_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, PromptVariable, Version, PromptVariableType, PromptVariableSource, Block } from '@/components/prompt-lab/store';

function cuid(prefix: string = ''): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface UsePromptLabHook {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  loading: boolean;
  error: string | null;
  createPrompt: () => Promise<Prompt | undefined>;
  updatePrompt: (
    id: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
  ) => void;
  deletePrompt: (id: string) => void;
  snapshotPrompt: (promptId: string, notes?: string) => void;
  restorePromptVersion: (promptId: string, versionId: string) => void;
  selectPrompt: (id: string | null) => void;
  refetchPromptsList: () => Promise<any>;
  triggerInitialPromptsFetch: () => void;
  projectId: string | undefined;
}

export function usePromptLab(initialProjectId?: string): UsePromptLabHook {
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Removed `shouldFetchList` state as its explicit control is being replaced by `triggerInitialPromptsFetch`
  // and implicit behavior for initial load.

  const lastDetailedPromptData = useRef<Prompt | null>(null);

  const selectPrompt = useCallback((id: string | null) => {
    console.log('[usePromptLab] [Trace: Select] selectPrompt called with ID:', id);
    setSelectedId(id);
    if (id === null) {
      lastDetailedPromptData.current = null;
      console.log('[usePromptLab] [Trace: Select] Deselected prompt, cleared lastDetailedPromptData.');
    }
  }, []);

  const [
    getProjectPrompts,
    { data: promptsListData, loading: listLoading, error: listError, refetch: apolloRefetchPromptsList }
  ] = useLazyQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log('[usePromptLab] [Trace: QueryListComplete] GET_PROJECT_PROMPTS_QUERY onCompleted. Data length:', data?.getProjectPrompts.length, 'prompts.');
      setLocalError(null);
      const mappedPrompts: Prompt[] = data.getProjectPrompts.map(
        (p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tags: p.tags,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          model: p.model || 'gpt-4o',
          content: [],
          context: '',
          projectId: p.projectId,
          variables: [],
          versions: [],
        })
      );

      setPrompts((prevPrompts) => {
        const prevPromptsMap = new Map(prevPrompts.map(p => [p.id, p]));
        const mergedPrompts = mappedPrompts.map(newPrompt => {
          const prevPrompt = prevPromptsMap.get(newPrompt.id);
          if (prevPrompt) {
            return {
              ...newPrompt,
              content: prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId 
                         ? lastDetailedPromptData.current.content 
                         : prevPrompt.content,
              context: prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId 
                         ? lastDetailedPromptData.current.context 
                         : prevPrompt.context,
              variables: prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId 
                           ? lastDetailedPromptData.current.variables 
                           : prevPrompt.variables,
              versions: prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId 
                          ? lastDetailedPromptData.current.versions 
                          : prevPrompt.versions,
            };
          }
          return newPrompt;
        });

        const updatedPromptIds = new Set(mappedPrompts.map(p => p.id));
        const filteredPrevPrompts = prevPrompts.filter(prevPrompt => updatedPromptIds.has(prevPrompt.id) || prevPrompt.id === selectedId);

        const finalPrompts = Array.from(new Set([...filteredPrevPrompts, ...mergedPrompts].map(p => p.id)))
          .map(id => {
            if (id === selectedId && lastDetailedPromptData.current?.id === selectedId) {
                return lastDetailedPromptData.current;
            }
            return mergedPrompts.find(p => p.id === id) || filteredPrevPrompts.find(p => p.id === id);
          }) as Prompt[];

        console.log('[usePromptLab] [Trace: SetPromptsList] Updating prompts state from list. New count:', finalPrompts.length);
        return finalPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    },
    onError: (err) => {
      console.error("[usePromptLab] [Error: QueryList] Error fetching project prompts list:", err);
      setLocalError("Failed to load prompts list.");
    },
  });

  const triggerInitialPromptsFetch = useCallback(() => {
    if (projectId) {
      console.log('[usePromptLab] [Trace: TriggerFetch] Explicitly triggering GET_PROJECT_PROMPTS_QUERY (network-only).');
      getProjectPrompts(); // Directly call the lazy query
      setPrompts([]); // Clear prompts when explicitly fetching the list
      setSelectedId(null); // Deselect any prompt
      lastDetailedPromptData.current = null; // Clear detailed data
      setLocalError(null);
    }
  }, [getProjectPrompts, projectId]);

  // Effect to trigger the initial list fetch when projectId changes or component mounts,
  // but only if no prompt is selected and the list hasn't been fetched yet.
  useEffect(() => {
    console.log('[usePromptLab] [Trace: useEffectListFetch] projectId:', projectId, 'selectedId:', selectedId, 'promptsListData:', promptsListData ? 'exists' : 'null', 'getProjectPrompts.called:', getProjectPrompts.called);
    // Only fetch list initially IF projectId exists and selectedId is null,
    // and if promptsListData is empty/null AND getProjectPrompts hasn't been called yet.
    // This ensures it only runs once for the initial load of the "library" view.
    if (projectId && selectedId === null && !promptsListData && !getProjectPrompts.called) { 
      console.log('[usePromptLab] [Trace: useEffectListFetch] Triggering initial list fetch (auto-load).');
      getProjectPrompts();
    }
  }, [projectId, getProjectPrompts, selectedId, promptsListData]);

  const { data: promptDetailsData, loading: detailsLoading } = useQuery(
    GET_PROMPT_DETAILS_QUERY,
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        if (data?.getPromptDetails) {
          console.log('[usePromptLab] [Trace: QueryDetailsComplete] GET_PROMPT_DETAILS_QUERY onCompleted. Details for ID:', data.getPromptDetails.id);
          setLocalError(null);
          const detailedPrompt: Prompt = {
            id: data.getPromptDetails.id,
            title: data.getPromptDetails.title,
            content: (data.getPromptDetails.content && Array.isArray(data.getPromptDetails.content) ? data.getPromptDetails.content : []) as Block[],
            context: data.getPromptDetails.context,
            description: data.getPromptDetails.description,
            category: data.getPromptDetails.category,
            tags: data.getPromptDetails.tags,
            isPublic: data.getPromptDetails.isPublic,
            createdAt: data.getPromptDetails.createdAt,
            updatedAt: data.getPromptDetails.updatedAt,
            model: data.getPromptDetails.model,
            projectId: data.getPromptDetails.projectId,
            variables: data.getPromptDetails.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
            versions: data.getPromptDetails.versions.map((v: any) => ({
               ...v,
               id: v.id || cuid('db-ver-'),
               content: (v.content && Array.isArray(v.content) ? v.content : []) as Block[],
            })),
          };

          lastDetailedPromptData.current = detailedPrompt;

          setPrompts((prevPrompts) =>
            prevPrompts.map((p) =>
              p.id === detailedPrompt.id
                ? { ...detailedPrompt }
                : p
            )
          );
        }
      },
      onError: (err) => {
        console.error("[usePromptLab] [Error: QueryDetails] Error fetching prompt details:", err);
        setLocalError("Failed to load prompt details.");
        setSelectedId(null); // Deselect if details fail to load
      },
    }
  );

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    update(cache, { data: { createPrompt } }) {
      if (!createPrompt) return;
      console.log('[usePromptLab] [Trace: MutationCreateCache] CREATE_PROMPT_MUTATION update cache for new prompt:', createPrompt.id);
    },
    onCompleted: (data) => {
      if (data?.createPrompt) {
        console.log('[usePromptLab] [Trace: MutationCreateComplete] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:', data.createPrompt.id);
        const newPrompt: Prompt = {
          id: data.createPrompt.id,
          title: data.createPrompt.title,
          content: (data.createPrompt.content && Array.isArray(data.createPrompt.content) ? data.createPrompt.content : []) as Block[],
          context: data.createPrompt.context,
          description: data.createPrompt.description,
          tags: data.createPrompt.tags,
          isPublic: data.createPrompt.isPublic,
          createdAt: data.createPrompt.createdAt,
          updatedAt: data.createPrompt.updatedAt,
          model: data.createPrompt.model,
          projectId: data.createPrompt.projectId,
          variables: data.createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
          versions: data.createPrompt.versions.map((v: any) => ({
              ...v,
              id: v.id || cuid('db-ver-'),
              content: (v.content && Array.isArray(v.content) ? v.content : []) as Block[],
          })),
        };
        lastDetailedPromptData.current = newPrompt;
        setPrompts((prevPrompts) => [newPrompt, ...prevPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        selectPrompt(newPrompt.id); // Select the newly created prompt
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] [Error: MutationCreate] Mutation Error: Create Prompt", err);
      setLocalError("Failed to create prompt.");
    },
  });

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.updatePrompt) {
        console.log('[usePromptLab] [Trace: MutationUpdateComplete] UPDATE_PROMPT_MUTATION onCompleted. Updated prompt ID:', data.updatePrompt.id, 'Title:', data.updatePrompt.title);
        setPrompts((prevPrompts) =>
          prevPrompts.map((p) =>
            p.id === data.updatePrompt.id
              ? {
                  ...p,
                  title: data.updatePrompt.title,
                  description: data.updatePrompt.description,
                  tags: data.updatePrompt.tags,
                  isPublic: data.updatePrompt.isPublic,
                  model: data.updatePrompt.model,
                  updatedAt: data.updatePrompt.updatedAt,
                }
              : p
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] [Error: MutationUpdate] Mutation Error: Update Prompt", err);
      setLocalError("Failed to update prompt.");
      if (selectedId) selectPrompt(selectedId); // Re-select to potentially refresh details on error
      else apolloRefetchPromptsList(); // Refetch list if no prompt is selected and update failed
    },
  });

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    update(cache, { data: { deletePrompt } }) {
      if (!deletePrompt) return;
      console.log('[usePromptLab] [Trace: MutationDeleteCache] DELETE_PROMPT_MUTATION update cache for deleted prompt:', deletePrompt.id);
    },
    onCompleted: (data) => {
      if (data?.deletePrompt.id) {
        console.log('[usePromptLab] [Trace: MutationDeleteComplete] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:', data.deletePrompt.id);
        setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== data.deletePrompt.id));
        if (selectedId === data.deletePrompt.id) {
          console.log('[usePromptLab] [Trace: MutationDeleteComplete] Deselecting deleted prompt.');
          setSelectedId(null);
          lastDetailedPromptData.current = null;
          // REMOVED: setShouldFetchList(true);
          // Rely on triggerInitialPromptsFetch to explicitly reload the list later if needed.
        }
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] [Error: MutationDelete] Mutation Error: Delete Prompt", err);
      setLocalError("Failed to delete prompt.");
      apolloRefetchPromptsList(); // Refetch list on error
    },
  });

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.snapshotPrompt) {
        console.log('[usePromptLab] [Trace: MutationSnapshotComplete] SNAPSHOT_PROMPT_MUTATION onCompleted. Prompt ID:', data.snapshotPrompt.id);
        if (selectedId === data.snapshotPrompt.id) {
          console.log('[usePromptLab] [Trace: MutationSnapshotComplete] Re-selecting prompt to refresh details after snapshot.');
          selectPrompt(selectedId); // Trigger details refetch for the selected prompt
        } else {
             // If not selected, just update its updatedAt for list sorting purposes
             setPrompts(prevPrompts => prevPrompts.map(p => p.id === data.snapshotPrompt.id ? {...p, updatedAt: data.snapshotPrompt.updatedAt} : p));
        }
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] [Error: MutationSnapshot] Mutation Error: Snapshot Prompt", err);
      setLocalError("Failed to save version.");
      if (selectedId) selectPrompt(selectedId); // Re-select to potentially refresh details on error
    },
  });

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      if (data?.restorePromptVersion) {
        console.log('[usePromptLab] [Trace: MutationRestoreComplete] RESTORE_PROMPT_VERSION_MUTATION onCompleted. Prompt ID:', data.restorePromptVersion.id);
        if (selectedId === data.restorePromptVersion.id) {
            console.log('[usePromptLab] [Trace: MutationRestoreComplete] Re-selecting prompt to refresh details after restore.');
            selectPrompt(selectedId); // Trigger details refetch for the selected prompt
        } else {
            // If not selected, just update its updatedAt for list sorting purposes
            setPrompts(prevPrompts => prevPrompts.map(p => p.id === data.restorePromptVersion.id ? {...p, updatedAt: new Date().toISOString()} : p));
        }
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] [Error: MutationRestore] Mutation Error: Restore Prompt Version", err);
      setLocalError("Failed to restore version.");
      if (selectedId) selectPrompt(selectedId); // Re-select to potentially refresh details on error
    },
  });

  useEffect(() => {
    console.log('[usePromptLab] [Trace: GlobalEffect] Updating localLoading state. listLoading:', listLoading, 'detailsLoading:', detailsLoading, 'projectId:', projectId, 'selectedId:', selectedId);
    
    // Determine overall loading state:
    // Loading if list is loading AND no prompt is selected (library view)
    // OR if details are loading AND a prompt IS selected (detail view)
    const isLoadingListForLibrary = (listLoading && selectedId === null);

    setLocalLoading( isLoadingListForLibrary || (detailsLoading && !!selectedId) );
  }, [listLoading, detailsLoading, projectId, selectedId, prompts.length]);

  useEffect(() => {
    if (listError) {
      console.error('[usePromptLab] [Trace: GlobalEffect] listError detected:', listError.message);
      setLocalError(listError.message);
    }
  }, [listError]);

  const createPrompt = useCallback(
    async (): Promise<Prompt | undefined> => {
      setLocalError(null);
      console.log('[usePromptLab] [Trace: Create] createPrompt: Initiating creation for projectId:', projectId);
      try {
        const defaultPrompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> = {
          title: 'Untitled Prompt',
          content: [],
          context: '',
          description: '',
          category: '',
          tags: [],
          isPublic: false,
          model: 'gpt-4o',
          projectId: projectId,
          variables: [],
        };

        const { data } = await createPromptMutation({
          variables: {
            input: defaultPrompt,
          },
        });

        if (data?.createPrompt) {
          const newPrompt: Prompt = {
            id: data.createPrompt.id,
            title: data.createPrompt.title,
            content: (data.createPrompt.content && Array.isArray(data.createPrompt.content) ? data.createPrompt.content : []) as Block[],
            context: data.createPrompt.context,
            description: data.createPrompt.description,
            tags: data.createPrompt.tags,
            isPublic: data.createPrompt.isPublic,
            createdAt: data.createPrompt.createdAt,
            updatedAt: data.createPrompt.updatedAt,
            model: data.createPrompt.model,
            projectId: data.createPrompt.projectId,
            variables: data.createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
            versions: data.createPrompt.versions.map((v: any) => ({
              ...v,
              id: v.id || cuid('db-ver-'),
              content: (v.content && Array.isArray(v.content) ? v.content : []) as Block[],
            })),
          };
          return newPrompt;
        }
      } catch (err: any) {
        console.error("[usePromptLab] [Error: CreateGraphQL] Error creating prompt via GraphQL:", err);
        setLocalError("Failed to create prompt.");
      }
      return undefined;
    },
    [projectId, createPromptMutation]
  );

  const updatePrompt = useCallback(
    (
      id: string,
      updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
    ) => {
      setLocalError(null);
      console.log('[usePromptLab] [Trace: Update] updatePrompt: Optimistically updating prompt ID:', id, 'with keys:', Object.keys(updates));

      setPrompts((prev) => {
        const updatedPrompts = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...updates,
                updatedAt: new Date().toISOString(),
                content: updates.content ? (updates.content && Array.isArray(updates.content) ? updates.content : []) as Block[] : p.content,
                variables: updates.variables ? updates.variables.map((v: Partial<PromptVariable>) => ({...v, id: v.id || cuid('patch-var-')})) as PromptVariable[] : p.variables,
              }
            : p
        );
        const sorted = [...updatedPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log('[usePromptLab] [Trace: UpdateOptimistic] Prompts state optimistically updated. Selected prompt title:', sorted.find(p => p.id === id)?.title);
        
        if (id === selectedId) {
            const updatedSelectedPrompt = sorted.find(p => p.id === id);
            if (updatedSelectedPrompt) {
                // Ensure lastDetailedPromptData reflects the optimistic update
                lastDetailedPromptData.current = updatedSelectedPrompt;
                console.log('[usePromptLab] [Trace: UpdateOptimistic] lastDetailedPromptData updated for selected prompt.');
            }
        }

        return sorted;
      });

      const filteredUpdates: Record<string, any> = {};
      for (const key in updates) {
        // @ts-ignore
        if (updates[key] !== undefined && updates[key] !== null) {
          if (key === 'content' && Array.isArray(updates[key]) && updates[key].length === 0) {
            filteredUpdates[key] = updates[key];
          } else {
            // @ts-ignore
            filteredUpdates[key] = updates[key];
          }
        }
      }

      updatePromptMutation({
        variables: {
          input: {
            id,
            ...filteredUpdates,
          },
        },
      }).catch((err) => {
        console.error("[usePromptLab] [Error: UpdateGraphQL] Error updating prompt via GraphQL:", err);
        setLocalError("Failed to update prompt.");
        if (selectedId) selectPrompt(selectedId);
        else apolloRefetchPromptsList();
      });
    },
    [updatePromptMutation, selectedId, selectPrompt]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalError(null);
      console.log('[usePromptLab] [Trace: Delete] deletePrompt: Optimistically deleting prompt ID:', id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        console.log('[usePromptLab] [Trace: DeleteOptimistic] Deselecting deleted prompt.');
        setSelectedId(null);
        lastDetailedPromptData.current = null;
        // REMOVED: setShouldFetchList(true); // Removed as it caused unintended list refetches.
      }

      deletePromptMutation({
        variables: { id },
      }).catch((err) => {
        console.error("[usePromptLab] [Error: DeleteGraphQL] Error deleting prompt via GraphQL:", err);
        setLocalError("Failed to delete prompt.");
        apolloRefetchPromptsList();
      });
    },
    [selectedId, deletePromptMutation, apolloRefetchPromptsList] // Removed setShouldFetchList from dependencies
  );

  const snapshotPrompt = useCallback(
    (promptId: string, notes?: string) => {
      setLocalError(null);
      console.log('[usePromptLab] [Trace: Snapshot] snapshotPrompt: Initiating snapshot for prompt ID:', promptId);
      snapshotPromptMutation({
        variables: {
          input: { promptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` },
        },
      }).catch((err) => {
        console.error("[usePromptLab] [Error: SnapshotGraphQL] Error creating prompt snapshot via GraphQL:", err);
        setLocalError("Failed to save version.");
        if (selectedId) selectPrompt(selectedId);
      });
    },
    [snapshotPromptMutation, selectedId, selectPrompt]
  );

  const restorePromptVersion = useCallback(
    (promptId: string, versionId: string) => {
      setLocalError(null);
      console.log('[usePromptLab] [Trace: Restore] restorePromptVersion: Initiating restore for prompt ID:', promptId, 'version ID:', versionId);
      restorePromptVersionMutation({
        variables: {
          input: { promptId, versionId },
        },
      }).catch((err) => {
        console.error("[usePromptLab] [Error: RestoreGraphQL] Error restoring prompt version via GraphQL:", err);
        setLocalError("Failed to restore version.");
        if (selectedId) selectPrompt(selectedId);
      });
    },
    [restorePromptVersionMutation, selectedId, selectPrompt]
  );

  const selectedPrompt = useMemo(
    () => {
      const foundPrompt = prompts.find((p) => p.id === selectedId) || null;
      console.log('[usePromptLab] [Trace: SelectedPromptMemo] selectedPrompt useMemo re-evaluated. Found:', !!foundPrompt, 'ID:', foundPrompt?.id, 'Title:', foundPrompt?.title);
      if (foundPrompt && foundPrompt.id === lastDetailedPromptData.current?.id) {
          return lastDetailedPromptData.current;
      }
      return foundPrompt;
    },
    [prompts, selectedId]
  );

  console.log('[usePromptLab] [Trace: Render] Rendered. Prompts count:', prompts.length, 'Selected ID:', selectedId, 'Local Loading:', localLoading);
  return {
    prompts,
    selectedPrompt,
    loading: localLoading,
    error: localError,
    createPrompt,
    updatePrompt,
    deletePrompt,
    snapshotPrompt,
    restorePromptVersion,
    selectPrompt,
    refetchPromptsList: apolloRefetchPromptsList,
    triggerInitialPromptsFetch, // Now the explicit way to get the list
    projectId,
  };
}
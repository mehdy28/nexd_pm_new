// hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { useParams } from "next/navigation";

import {
  GET_PROJECT_PROMPTS_QUERY,
  GET_PROMPT_DETAILS_QUERY,
  RESOLVE_PROMPT_VARIABLE_QUERY,
} from "@/graphql/queries/promptRelatedQueries";
import {
  CREATE_PROMPT_MUTATION,
  UPDATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  SNAPSHOT_PROMPT_MUTATION,
  RESTORE_PROMPT_VERSION_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, PromptVariable, Version, PromptVariableType, PromptVariableSource } from '@/components/prompt-lab/store';

// Helper to generate a client-side CUID for embedded JSON objects (variables, versions)
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
  loading: boolean; // Overall loading state
  loadingDetails: boolean; // Specific for details query
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
  projectId: string | undefined;
}

export function usePromptLab(initialProjectId?: string): UsePromptLabHook {
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectPrompt = useCallback((id: string | null) => {
    console.log('[usePromptLab] selectPrompt called with ID:', id);
    setSelectedId(id);
  }, []);

  const {
    data: promptsListData,
    loading: listLoading,
    error: listError,
    refetch: refetchPromptsList,
  } = useQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: "network-only", // <<< Already set correctly
    onCompleted: (data) => {
      console.log('--- [usePromptLab] GET_PROJECT_PROMPTS_QUERY onCompleted START ---');
      console.log('[usePromptLab] onCompleted: Raw data from network (list query):', data);
      setLocalError(null);

      const fetchedListPrompts: Prompt[] = data.getProjectPrompts.map(
        (p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tags: p.tags,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          model: p.model || 'gpt-4o',
          projectId: p.projectId,
          content: '',
          context: '',
          variables: [],
          versions: [],
        })
      );
      console.log('[usePromptLab] onCompleted: Mapped fetchedListPrompts. Sample ID:', fetchedListPrompts[0]?.id, 'Title:', fetchedListPrompts[0]?.title);


      setPrompts((prevPrompts) => {
        console.log('[usePromptLab] onCompleted (list): Starting setPrompts update.');
        console.log('[usePromptLab] onCompleted (list): Previous prompts state count:', prevPrompts.length);
        prevPrompts.forEach(p => console.log(`  - Prev Prompt ID: ${p.id}, Title: ${p.title.substring(0,20)}..., Content: ${p.content.length > 0 ? 'HAS_CONTENT' : 'NO_CONTENT'}`));

        const newPromptsMap = new Map<string, Prompt>();

        // 1. Add freshly fetched list prompts. These should have the latest titles.
        fetchedListPrompts.forEach(p => {
          newPromptsMap.set(p.id, p);
          console.log(`  - Freshly fetched: ID: ${p.id}, Title: ${p.title.substring(0,20)}...`);
        });

        // 2. Merge in *detailed fields* from previously existing prompts if they are still in the new list.
        prevPrompts.forEach(prevP => {
          if (newPromptsMap.has(prevP.id)) {
            const currentListPrompt = newPromptsMap.get(prevP.id)!;
            console.log(`  - Merging details for existing prompt ID: ${prevP.id}`);

            newPromptsMap.set(prevP.id, {
                ...currentListPrompt, // Start with the fresh list data (which has the new title)
                content: prevP.content || currentListPrompt.content,
                context: prevP.context || currentListPrompt.context,
                variables: prevP.variables.length > 0 ? prevP.variables : currentListPrompt.variables,
                versions: prevP.versions.length > 0 ? prevP.versions : currentListPrompt.versions,
            });
            console.log(`    - Merged: ID: ${currentListPrompt.id}, Title: ${newPromptsMap.get(prevP.id)?.title.substring(0,20)}... (final)`);
          }
        });

        const finalPrompts = Array.from(newPromptsMap.values());
        console.log('[usePromptLab] onCompleted (list): Final prompts state before sorting. Count:', finalPrompts.length);
        finalPrompts.forEach(p => console.log(`  - Final Prompt ID: ${p.id}, Title: ${p.title.substring(0,20)}...`));


        const sortedFinalPrompts = finalPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log('[usePromptLab] onCompleted (list): Prompts state updated. Final count:', sortedFinalPrompts.length);
        console.log('--- [usePromptLab] GET_PROJECT_PROMPTS_QUERY onCompleted END ---');
        return sortedFinalPrompts;
      });
    },
    onError: (err) => {
      console.error("[usePromptLab] Error fetching project prompts list:", err);
      setLocalError("Failed to load prompts list.");
    },
  });

  const { data: promptDetailsData, loading: detailsLoading } = useQuery(
    GET_PROMPT_DETAILS_QUERY,
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only", // Already set correctly
      onCompleted: (data) => {
        console.log('--- [usePromptLab] GET_PROMPT_DETAILS_QUERY onCompleted START ---');
        if (data?.getPromptDetails) {
          console.log('[usePromptLab] GET_PROMPT_DETAILS_QUERY onCompleted. Details for ID:', data.getPromptDetails.id, 'Title:', data.getPromptDetails.title);
          setLocalError(null);

          setPrompts((prevPrompts) => {
            console.log(`[usePromptLab] onCompleted (details): Updating prompts state for ID: ${data.getPromptDetails.id}`);
            const updatedPrompts = prevPrompts.map((p) =>
              p.id === data.getPromptDetails.id
                ? {
                    ...p,
                    title: data.getPromptDetails.title,
                    content: data.getPromptDetails.content,
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
                    versions: data.getPromptDetails.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
                  }
                : p
            );
            console.log(`[usePromptLab] onCompleted (details): Final title for ${data.getPromptDetails.id}: ${updatedPrompts.find(p => p.id === data.getPromptDetails.id)?.title}`);
            return updatedPrompts;
          });
        }
        console.log('--- [usePromptLab] GET_PROMPT_DETAILS_QUERY onCompleted END ---');
      },
      onError: (err) => {
        console.error("[usePromptLab] Error fetching prompt details:", err);
        setLocalError("Failed to load prompt details.");
        setSelectedId(null); // Deselect on error
      },
    }
  );

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    update(cache, { data: { createPrompt } }) {
      if (!createPrompt) return;
      console.log('[usePromptLab] CREATE_PROMPT_MUTATION update cache for new prompt:', createPrompt.id);

      // We still update the cache here for optimistic UI/immediate display
      // even if the fetchPolicy is network-only, as this `update` function
      // explicitly modifies the cache entry.
      const existingPromptsQuery = cache.readQuery<{
        getProjectPrompts: Prompt[];
      }>({
        query: GET_PROJECT_PROMPTS_QUERY,
        variables: { projectId },
      });

      if (existingPromptsQuery) {
        cache.writeQuery({
          query: GET_PROJECT_PROMPTS_QUERY,
          variables: { projectId },
          data: {
            getProjectPrompts: [
              {
                id: createPrompt.id,
                title: createPrompt.title,
                description: createPrompt.description,
                tags: createPrompt.tags,
                isPublic: createPrompt.isPublic,
                createdAt: createPrompt.createdAt,
                updatedAt: createPrompt.updatedAt,
                model: createPrompt.model,
                projectId: createPrompt.projectId,
                content: createPrompt.content,
                context: createPrompt.context,
                variables: createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
                versions: createPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
                __typename: "Prompt",
              },
              ...existingPromptsQuery.getProjectPrompts,
            ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.createPrompt) {
        console.log('[usePromptLab] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:', data.createPrompt.id);
        refetchPromptsList(); // Force list refresh after creation
        selectPrompt(data.createPrompt.id); // Select the new prompt
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Create Prompt", err);
      setLocalError("Failed to create prompt.");
    },
  });

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    update(cache, { data: { updatePrompt } }) {
      if (!updatePrompt || !projectId) return;
      console.log('--- [usePromptLab] UPDATE_PROMPT_MUTATION cache update START ---');
      console.log('[usePromptLab] UPDATE_PROMPT_MUTATION: Data from mutation response:', updatePrompt);

      // 1. Update the cached GET_PROJECT_PROMPTS_QUERY (for the list view)
      // This will now work because GET_PROJECT_PROMPTS_QUERY uses "network-only" and writes to cache.
      cache.updateQuery(
        {
          query: GET_PROJECT_PROMPTS_QUERY,
          variables: { projectId },
        },
        (existingPromptsData) => {
          if (!existingPromptsData || !existingPromptsData.getProjectPrompts) {
            console.log('[usePromptLab] UPDATE_PROMPT_MUTATION cache: No existing list data to update (this should now rarely happen with "network-only" policy).');
            return existingPromptsData;
          }
          console.log('[usePromptLab] UPDATE_PROMPT_MUTATION cache: Updating existing list data in cache.');

          const updatedProjectPrompts = existingPromptsData.getProjectPrompts.map(
            (p: Prompt) =>
              p.id === updatePrompt.id
                ? {
                    ...p,
                    title: updatePrompt.title,
                    description: updatePrompt.description,
                    tags: updatePrompt.tags,
                    isPublic: updatePrompt.isPublic,
                    model: updatePrompt.model,
                    updatedAt: updatePrompt.updatedAt,
                  }
                : p
          );
          console.log(`[usePromptLab] UPDATE_PROMPT_MUTATION cache: List cache updated. New title for ${updatePrompt.id}: ${updatedProjectPrompts.find(p => p.id === updatePrompt.id)?.title}`);
          return {
            getProjectPrompts: updatedProjectPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
          };
        }
      );

      // 2. Also update the specific GET_PROMPT_DETAILS_QUERY cache for the selected prompt
      // This is crucial for consistency between the list item and the detailed view,
      // especially if the user navigates back to the prompt lab for the same item.
      // Changing GET_PROMPT_DETAILS_QUERY to "network-only" means it also writes to cache.
      if (selectedId === updatePrompt.id) {
        console.log('[usePromptLab] UPDATE_PROMPT_MUTATION cache: Updating details cache for selected prompt:', updatePrompt.id);
        cache.writeQuery({
            query: GET_PROMPT_DETAILS_QUERY,
            variables: { id: updatePrompt.id },
            data: {
                getPromptDetails: {
                    ...updatePrompt,
                    // Ensure full prompt object for details query, including content, context, variables, versions
                    content: updatePrompt.content,
                    context: updatePrompt.context,
                    variables: updatePrompt.variables ? updatePrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })) : [],
                    versions: updatePrompt.versions ? updatePrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })) : [],
                    __typename: "Prompt",
                }
            }
        });
      }
      console.log('--- [usePromptLab] UPDATE_PROMPT_MUTATION cache update END ---');
    },
    onCompleted: (data) => {
      console.log('--- [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted START ---');
      if (data?.updatePrompt) {
        console.log('[usePromptLab] UPDATE_PROMPT_MUTATION onCompleted: mutation successful. Re-fetching list to ensure state consistency.');
        // This refetch will now always go to the network and re-populate the cache,
        // and its onCompleted will correctly update the `prompts` state.
        refetchPromptsList();
      }
      console.log('--- [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted END ---');
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Update Prompt", err);
      setLocalError("Failed to update prompt.");
      if (selectedId) selectPrompt(selectedId);
      else refetchPromptsList();
    },
  });

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    update(cache, { data: { deletePrompt } }) {
      if (!deletePrompt) return;
      console.log('[usePromptLab] DELETE_PROMPT_MUTATION update cache for deleted prompt:', deletePrompt.id);

      const existingPrompts = cache.readQuery<{
        getProjectPrompts: Prompt[];
      }>({
        query: GET_PROJECT_PROMPTS_QUERY,
        variables: { projectId },
      });

      if (existingPrompts) {
        cache.writeQuery({
          query: GET_PROJECT_PROMPTS_QUERY,
          variables: { projectId },
          data: {
            getProjectPrompts: existingPrompts.getProjectPrompts.filter(
              (p) => p.id !== deletePrompt.id
            ),
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.deletePrompt.id) {
        console.log('[usePromptLab] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:', data.deletePrompt.id);
        refetchPromptsList();
        if (selectedId === data.deletePrompt.id) {
          setSelectedId(null);
        }
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Delete Prompt", err);
      setLocalError("Failed to delete prompt.");
      refetchPromptsList();
    },
  });

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.snapshotPrompt) {
        console.log('[usePromptLab] SNAPSHOT_PROMPT_MUTATION onCompleted. Prompt ID:', data.snapshotPrompt.id);
        // Important: Re-selecting the prompt will trigger GET_PROMPT_DETAILS_QUERY
        // which now has fetchPolicy "network-only", ensuring fresh details are fetched.
        if (selectedId === data.snapshotPrompt.id) {
          console.log('[usePromptLab] SNAPSHOT_PROMPT_MUTATION: Re-selecting prompt to update versions list and editor content.');
          selectPrompt(selectedId);
        }
        refetchPromptsList(); // Ensure list (updatedAt) is also fresh
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Snapshot Prompt", err);
      setLocalError("Failed to save version.");
      if (selectedId) selectPrompt(selectedId);
    },
  });

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      if (data?.restorePromptVersion) {
        console.log('[usePromptLab] RESTORE_PROMPT_VERSION_MUTATION onCompleted. Prompt ID:', data.restorePromptVersion.id);
        // Important: Re-selecting the prompt will trigger GET_PROMPT_DETAILS_QUERY
        // which now has fetchPolicy "network-only", ensuring fresh details are fetched.
        if (selectedId === data.restorePromptVersion.id) {
            console.log('[usePromptLab] RESTORE_PROMPT_VERSION_MUTATION: Re-selecting prompt to update editor content.');
            selectPrompt(selectedId);
        }
        refetchPromptsList(); // Ensure list (updatedAt) is also fresh
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Restore Prompt Version", err);
      setLocalError("Failed to restore version.");
      if (selectedId) selectPrompt(selectedId);
    },
  });

  useEffect(() => {
    console.log(`[usePromptLab] useEffect (loading state): listLoading=${listLoading}, detailsLoading=${detailsLoading}, selectedId=${selectedId}, projectId=${projectId}`);
    setLocalLoading(listLoading || (!!selectedId && detailsLoading) || !projectId);
  }, [listLoading, detailsLoading, selectedId, projectId]);

  useEffect(() => {
    if (listError) {
      console.error('[usePromptLab] Root useEffect: listError detected:', listError.message);
      setLocalError(listError.message);
    }
  }, [listError]);

  const createPrompt = useCallback(
    async (): Promise<Prompt | undefined> => {
      setLocalError(null);
      console.log('[usePromptLab] createPrompt: Initiating creation for projectId:', projectId);
      try {
        const defaultPromptInput: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> = {
          title: 'Untitled Prompt',
          content: '',
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
            input: defaultPromptInput,
          },
        });

        if (data?.createPrompt) {
          refetchPromptsList();
          selectPrompt(data.createPrompt.id);
          return {
            id: data.createPrompt.id,
            title: data.createPrompt.title,
            content: data.createPrompt.content,
            context: data.createPrompt.context,
            description: data.createPrompt.description,
            tags: data.createPrompt.tags,
            isPublic: data.isPublic, // Corrected from data.createPrompt.isPublic
            createdAt: data.createPrompt.createdAt,
            updatedAt: data.createPrompt.updatedAt,
            model: data.createPrompt.model,
            projectId: data.createPrompt.projectId,
            variables: data.createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
            versions: data.createPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
          };
        }
      } catch (err: any) {
        console.error("[usePromptLab] Error creating prompt via GraphQL:", err);
        setLocalError("Failed to create prompt.");
      }
      return undefined;
    },
    [projectId, createPromptMutation, refetchPromptsList, selectPrompt]
  );

  const updatePrompt = useCallback(
    (
      id: string,
      updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
    ) => {
      setLocalError(null);
      console.log('[usePromptLab] updatePrompt: Sending mutation for prompt ID:', id, 'with:', updates.title ? `new title: "${updates.title}"` : 'other updates');

      updatePromptMutation({
        variables: {
          input: {
            id,
            title: updates.title,
            content: updates.content,
            context: updates.context,
            description: updates.description,
            category: updates.category,
            tags: updates.tags,
            isPublic: updates.isPublic,
            model: updates.model,
            variables: updates.variables,
          },
        },
      }).catch((err) => {
        console.error("[usePromptLab] Error updating prompt via GraphQL:", err);
        setLocalError("Failed to update prompt.");
        if (selectedId) selectPrompt(selectedId);
        else refetchPromptsList();
      });
    },
    [updatePromptMutation, selectedId, selectPrompt, refetchPromptsList, projectId]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalError(null);
      console.log('[usePromptLab] deletePrompt: Sending mutation for prompt ID:', id);

      deletePromptMutation({
        variables: { id },
      }).catch((err) => {
        console.error("[usePromptLab] Error deleting prompt via GraphQL:", err);
        setLocalError("Failed to delete prompt.");
        refetchPromptsList();
      });
    },
    [selectedId, deletePromptMutation, refetchPromptsList]
  );

  const snapshotPrompt = useCallback(
    (promptId: string, notes?: string) => {
      setLocalError(null);
      console.log('[usePromptLab] snapshotPrompt: Initiating snapshot for prompt ID:', promptId);
      snapshotPromptMutation({
        variables: {
          input: { promptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` },
        },
      }).catch((err) => {
        console.error("[usePromptLab] Error creating prompt snapshot via GraphQL:", err);
        setLocalError("Failed to save version.");
        if (selectedId) selectPrompt(selectedId);
      });
    },
    [snapshotPromptMutation, selectedId, selectPrompt, refetchPromptsList]
  );

  const restorePromptVersion = useCallback(
    (promptId: string, versionId: string) => {
      setLocalError(null);
      console.log('[usePromptLab] restorePromptVersion: Initiating restore for prompt ID:', promptId, 'version ID:', versionId);
      restorePromptVersionMutation({
        variables: {
          input: { promptId, versionId },
        },
      }).catch((err) => {
        console.error("[usePromptLab] Error restoring prompt version via GraphQL:", err);
        setLocalError("Failed to restore version.");
        if (selectedId) selectPrompt(selectedId);
      });
    },
    [restorePromptVersionMutation, selectedId, selectPrompt, refetchPromptsList]
  );

  const selectedPrompt = useMemo(
    () => {
      const foundPrompt = prompts.find((p) => p.id === selectedId) || null;
      console.log('[usePromptLab] selectedPrompt useMemo re-evaluated. Found:', !!foundPrompt, 'ID:', foundPrompt?.id, 'Title:', foundPrompt?.title);
      return foundPrompt;
    },
    [prompts, selectedId]
  );

  console.log('[usePromptLab] Rendered. Prompts count:', prompts.length, 'Selected ID:', selectedId);
  return {
    prompts,
    selectedPrompt,
    loading: localLoading,
    loadingDetails: detailsLoading, // Expose detailsLoading explicitly
    error: localError,
    createPrompt,
    updatePrompt,
    deletePrompt,
    snapshotPrompt,
    restorePromptVersion,
    selectPrompt,
    refetchPromptsList,
    projectId,
  };
}

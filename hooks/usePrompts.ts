// hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client"; // Removed useLazyQuery, back to useQuery for list
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
import { Prompt, PromptVariable, Version } from '@/components/prompt-lab/store';

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
  triggerListFetchOnBack: () => void; // New function to explicitly trigger list fetch for back button
  projectId: string | undefined;
}

export function usePromptLab(initialProjectId?: string): UsePromptLabHook {
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // NEW: State to hold a dummy value that will change to force useQuery to re-fetch
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const selectPrompt = useCallback((id: string | null) => {
    console.log('[usePromptLab] selectPrompt called with ID:', id);
    setSelectedId(id);
  }, []);

  // QUERY 1: Get list of prompts for the current project
  const {
    data: promptsListData,
    loading: listLoading,
    error: listError,
    // No `refetch` needed for GET_PROJECT_PROMPTS_QUERY if we use the listRefreshKey trick
  } = useQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId, listRefreshKey }, // Include listRefreshKey in variables
    skip: !projectId,
    fetchPolicy: "network-only", // Always fetch fresh data for the list
    onCompleted: (data) => {
      console.log('--- [usePromptLab] GET_PROJECT_PROMPTS_QUERY useQuery onCompleted START (listRefreshKey: %d) ---', listRefreshKey);
      console.log('[usePromptLab] onCompleted (list): Raw data from network:', data);
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
      console.log('[usePromptLab] onCompleted (list): Mapped fetchedListPrompts. Sample ID:', fetchedListPrompts[0]?.id, 'Title:', fetchedListPrompts[0]?.title);

      setPrompts((prevPrompts) => {
        console.log('[usePromptLab] onCompleted (list): Starting setPrompts update.');
        console.log('[usePromptLab] onCompleted (list): Previous prompts state count:', prevPrompts.length);

        const newPromptsMap = new Map<string, Prompt>();

        fetchedListPrompts.forEach(p => {
          const existingDetailedPrompt = prevPrompts.find(prevP => prevP.id === p.id);
          newPromptsMap.set(p.id, {
            ...p,
            content: existingDetailedPrompt?.content || '',
            context: existingDetailedPrompt?.context || '',
            variables: existingDetailedPrompt?.variables || [],
            versions: existingDetailedPrompt?.versions || [],
          });
          console.log(`  - List prompt processed: ID: ${p.id}, Title: ${p.title.substring(0, 20)}..., Has content: ${newPromptsMap.get(p.id)?.content.length > 0}`);
        });

        prevPrompts.forEach(p => {
            if (!newPromptsMap.has(p.id)) {
                newPromptsMap.set(p.id, p);
                console.log(`  - Preserving previous prompt (not in new list): ID: ${p.id}, Title: ${p.title.substring(0, 20)}..., Has content: ${p.content.length > 0}`);
            }
        });

        const finalPrompts = Array.from(newPromptsMap.values());
        const sortedFinalPrompts = finalPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log('[usePromptLab] onCompleted (list): Prompts state updated. Final count:', sortedFinalPrompts.length);
        sortedFinalPrompts.forEach(p => console.log(`  - Final state prompt: ID: ${p.id}, Title: ${p.title.substring(0, 20)}..., Has content: ${p.content.length > 0}`));
        console.log('--- [usePromptLab] GET_PROJECT_PROMPTS_QUERY useQuery onCompleted END ---');
        return sortedFinalPrompts;
      });
    },
    onError: (err) => {
      console.error("[usePromptLab] Error fetching project prompts list:", err);
      setLocalError("Failed to load prompts list.");
    },
  });

  // NEW: Function to increment the key, which will cause `useQuery` to re-fetch
  const triggerListFetchOnBack = useCallback(() => {
    console.log('[usePromptLab] triggerListFetchOnBack called: Incrementing listRefreshKey to force useQuery re-fetch.');
    setListRefreshKey(prevKey => prevKey + 1);
  }, []);

  // QUERY 2: Get details for the selected prompt
  const {
    data: promptDetailsData,
    loading: detailsLoading,
    error: detailsError,
  } = useQuery(
    GET_PROMPT_DETAILS_QUERY,
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only", // Always fetch fresh details when selectedId changes
      onCompleted: (data) => {
        console.log('--- [usePromptLab] GET_PROMPT_DETAILS_QUERY onCompleted START ---');
        if (data?.getPromptDetails) {
          console.log('[usePromptLab] onCompleted (details): Details fetched for ID:', data.getPromptDetails.id, 'Title:', data.getPromptDetails.title);
          setLocalError(null);

          setPrompts((prevPrompts) => {
            console.log(`[usePromptLab] onCompleted (details): Updating prompts state for ID: ${data.getPromptDetails.id}`);
            const detailedPromptFromServer = data.getPromptDetails;
            const updatedPrompts = prevPrompts.map((p) =>
              p.id === detailedPromptFromServer.id
                ? {
                    ...p,
                    title: detailedPromptFromServer.title,
                    description: detailedPromptFromServer.description,
                    tags: detailedPromptFromServer.tags,
                    isPublic: detailedPromptFromServer.isPublic,
                    createdAt: detailedPromptFromServer.createdAt,
                    updatedAt: detailedPromptFromServer.updatedAt,
                    model: detailedPromptFromServer.model,
                    projectId: detailedPromptFromServer.projectId,
                    content: detailedPromptFromServer.content,
                    context: detailedPromptFromServer.context,
                    variables: (detailedPromptFromServer.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
                    versions: (detailedPromptFromServer.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
                  }
                : p
            );

            if (!updatedPrompts.some(p => p.id === detailedPromptFromServer.id)) {
                updatedPrompts.push({
                    id: detailedPromptFromServer.id,
                    title: detailedPromptFromServer.title,
                    description: detailedPromptFromServer.description,
                    tags: detailedPromptFromServer.tags,
                    isPublic: detailedPromptFromServer.isPublic,
                    createdAt: detailedPromptFromServer.createdAt,
                    updatedAt: detailedPromptFromServer.updatedAt,
                    model: detailedPromptFromServer.model,
                    projectId: detailedPromptFromServer.projectId,
                    content: detailedPromptFromServer.content,
                    context: detailedPromptFromServer.context,
                    variables: (detailedPromptFromServer.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
                    versions: (detailedPromptFromServer.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
                });
            }

            const sortedUpdatedPrompts = updatedPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            console.log(`[usePromptLab] onCompleted (details): Final title for ${detailedPromptFromServer.id}: ${sortedUpdatedPrompts.find(p => p.id === detailedPromptFromServer.id)?.title}`);
            console.log('--- [usePromptLab] GET_PROMPT_DETAILS_QUERY onCompleted END ---');
            return sortedUpdatedPrompts;
          });
        }
      },
      onError: (err) => {
        console.error("[usePromptLab] Error fetching prompt details:", err);
        setLocalError("Failed to load prompt details.");
        setSelectedId(null);
      },
    }
  );

  useEffect(() => {
    if (listError) {
      setLocalError(listError.message);
    } else if (detailsError) {
      setLocalError(detailsError.message);
    } else {
      setLocalError(null);
    }
  }, [listError, detailsError]);


  useEffect(() => {
    const newLocalLoading = listLoading || (!!selectedId && detailsLoading) || !projectId;
    if (newLocalLoading !== localLoading) {
        console.log(`[usePromptLab] useEffect (loading state): Updating localLoading to ${newLocalLoading}`);
        setLocalLoading(newLocalLoading);
    }
  }, [listLoading, detailsLoading, selectedId, projectId, localLoading]);


  // MUTATION 1: Create Prompt
  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    // Removed cache update for strict "no frontend cache for display" rule
    onCompleted: (data) => {
      if (data?.createPrompt) {
        console.log('[usePromptLab] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:', data.createPrompt.id);
        setLocalError(null);
        // Trigger list fetch
        triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
        selectPrompt(data.createPrompt.id); // Select the new prompt
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Create Prompt", err);
      setLocalError("Failed to create prompt.");
    },
  });

  // MUTATION 2: Update Prompt
  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    // Removed cache update for strict "no frontend cache for display" rule
    onCompleted: (data) => {
      console.log('--- [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted START ---');
      if (data?.updatePrompt) {
        console.log('[usePromptLab] UPDATE_PROMPT_MUTATION onCompleted: mutation successful for prompt ID:', data.updatePrompt.id);
        setLocalError(null);

        // Update the local `prompts` state with the full, fresh data from the mutation response.
        setPrompts(prevPrompts => {
          const updatedPromptFromServer = data.updatePrompt;
          return prevPrompts.map(p =>
            p.id === updatedPromptFromServer.id
              ? {
                  ...p,
                  title: updatedPromptFromServer.title,
                  description: updatedPromptFromServer.description,
                  tags: updatedPromptFromServer.tags,
                  isPublic: updatedPromptFromServer.isPublic,
                  model: updatedPromptFromServer.model,
                  updatedAt: updatedPromptFromServer.updatedAt,
                  content: updatedPromptFromServer.content,
                  context: updatedPromptFromServer.context,
                  variables: (updatedPromptFromServer.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
                  versions: (updatedPromptFromServer.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
                }
              : p
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
        
        // Trigger list fetch
        triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
      }
      console.log('--- [usePromptLab] UPDATE_PROMPT_MUTATION onCompleted END ---');
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Update Prompt", err);
      setLocalError("Failed to update prompt.");
      if (selectedId) selectPrompt(selectedId);
      else triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
    },
  });

  // MUTATION 3: Delete Prompt
  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    // Removed cache update for strict "no frontend cache for display" rule
    onCompleted: (data) => {
      if (data?.deletePrompt.id) {
        console.log('[usePromptLab] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:', data.deletePrompt.id);
        setLocalError(null);
        setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== data.deletePrompt.id));
        triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
        if (selectedId === data.deletePrompt.id) {
          setSelectedId(null);
        }
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Delete Prompt", err);
      setLocalError("Failed to delete prompt.");
      triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
    },
  });

  // MUTATION 4: Snapshot Prompt (Save Version)
  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.snapshotPrompt) {
        console.log('[usePromptLab] SNAPSHOT_PROMPT_MUTATION onCompleted. Prompt ID:', data.snapshotPrompt.id);
        setLocalError(null);
        if (selectedId === data.snapshotPrompt.id) {
          console.log('[usePromptLab] SNAPSHOT_PROMPT_MUTATION: Re-selecting prompt to update versions list and editor content (triggers new fetch of details).');
          selectPrompt(selectedId);
        }
        triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Snapshot Prompt", err);
      setLocalError("Failed to save version.");
      if (selectedId) selectPrompt(selectedId);
    },
  });

  // MUTATION 5: Restore Prompt Version
  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      if (data?.restorePromptVersion) {
        console.log('[usePromptLab] RESTORE_PROMPT_VERSION_MUTATION onCompleted. Prompt ID:', data.restorePromptVersion.id);
        setLocalError(null);
        if (selectedId === data.restorePromptVersion.id) {
            console.log('[usePromptLab] RESTORE_PROMPT_VERSION_MUTATION: Re-selecting prompt to update editor content (triggers new fetch of details).');
            selectPrompt(selectedId);
        }
        triggerListFetchOnBack(); // Use the general mechanism to force list re-fetch
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Restore Prompt Version", err);
      setLocalError("Failed to restore version.");
      if (selectedId) selectPrompt(selectedId);
    },
  });

  const selectedPrompt = useMemo(
    () => {
      const foundPrompt = prompts.find((p) => p.id === selectedId) || null;
      console.log('[usePromptLab] selectedPrompt useMemo re-evaluated. Found:', !!foundPrompt, 'ID:', foundPrompt?.id, 'Title:', foundPrompt?.title, 'Content length:', foundPrompt?.content.length);
      return foundPrompt;
    },
    [prompts, selectedId]
  );

  console.log('[usePromptLab] Rendered. Prompts count:', prompts.length, 'Selected ID:', selectedId, 'ListRefreshKey:', listRefreshKey);
  return {
    prompts,
    selectedPrompt,
    loading: localLoading,
    loadingDetails: detailsLoading,
    error: localError,
    createPrompt: useCallback(
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
            return {
              id: data.createPrompt.id,
              title: data.createPrompt.title,
              content: data.createPrompt.content,
              context: data.createPrompt.context,
              description: data.createPrompt.description,
              tags: data.createPrompt.tags,
              isPublic: data.createPrompt.isPublic,
              createdAt: data.createPrompt.createdAt,
              updatedAt: data.createPrompt.updatedAt,
              model: data.createPrompt.model,
              projectId: data.createPrompt.projectId,
              variables: (data.createPrompt.variables || []).map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
              versions: (data.createPrompt.versions || []).map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
            };
          }
        } catch (err: any) {
          console.error("[usePromptLab] Error creating prompt via GraphQL:", err);
          setLocalError("Failed to create prompt.");
        }
        return undefined;
      },
      [projectId, createPromptMutation, selectPrompt, triggerListFetchOnBack]
    ),
    updatePrompt: useCallback(
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
          else triggerListFetchOnBack();
        });
      },
      [updatePromptMutation, selectedId, selectPrompt, triggerListFetchOnBack]
    ),
    deletePrompt: useCallback(
      (id: string) => {
        setLocalError(null);
        console.log('[usePromptLab] deletePrompt: Sending mutation for prompt ID:', id);

        deletePromptMutation({
          variables: { id },
        }).catch((err) => {
          console.error("[usePromptLab] Error deleting prompt via GraphQL:", err);
          setLocalError("Failed to delete prompt.");
          triggerListFetchOnBack();
        });
      },
      [selectedId, deletePromptMutation, triggerListFetchOnBack]
    ),
    snapshotPrompt: useCallback(
      (promptId: string, notes?: string) => {
        setLocalError(null);
        console.log('[usePromptLab] snapshotPrompt: Initiating snapshot for prompt ID:', promptId);
        snapshotPromptMutation({
          variables: {
            input: { promptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` },
          },
        }).catch((err) => {
          console.error("[usePromptLab] Mutation Error: Snapshot Prompt", err);
          setLocalError("Failed to save version.");
          if (selectedId) selectPrompt(selectedId);
        });
      },
      [snapshotPromptMutation, selectedId, selectPrompt, triggerListFetchOnBack]
    ),
    restorePromptVersion: useCallback(
      (promptId: string, versionId: string) => {
        setLocalError(null);
        console.log('[usePromptLab] restorePromptVersion: Initiating restore for prompt ID:', promptId, 'version ID:', versionId);
        restorePromptVersionMutation({
          variables: {
            input: { promptId, versionId },
          },
        }).catch((err) => {
          console.error("[usePromptLab] Mutation Error: Restore Prompt Version", err);
          setLocalError("Failed to restore version.");
          if (selectedId) selectPrompt(selectedId);
        });
      },
      [restorePromptVersionMutation, selectedId, selectPrompt, triggerListFetchOnBack]
    ),
    selectPrompt,
    triggerListFetchOnBack, // Exposed to be called by PromptLabContainer
    projectId,
  };
}
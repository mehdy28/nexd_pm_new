// hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client"; // Import useLazyQuery
import { useParams } from "next/navigation";

import {
  GET_PROJECT_PROMPTS_QUERY,
  GET_PROMPT_DETAILS_QUERY,
  RESOLVE_PROMPT_VARIABLE_QUERY, // Keep this query document
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
function cuid(prefix: string = ''): string { // Added prefix for debugging
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
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      console.log('[usePromptLab] GET_PROJECT_PROMPTS_QUERY onCompleted. Data:', data?.getProjectPrompts.length, 'prompts.');
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
          content: '',
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
              content: prevPrompt.content,
              context: prevPrompt.context,
              variables: prevPrompt.variables,
              versions: prevPrompt.versions,
            };
          }
          return newPrompt;
        });

        const updatedPromptIds = new Set(mappedPrompts.map(p => p.id));
        const filteredPrevPrompts = prevPrompts.filter(prevPrompt => updatedPromptIds.has(prevPrompt.id));

        const finalPrompts = Array.from(new Set([...filteredPrevPrompts, ...mergedPrompts].map(p => p.id)))
          .map(id => mergedPrompts.find(p => p.id === id) || filteredPrevPrompts.find(p => p.id === id)) as Prompt[];

        console.log('[usePromptLab] setPrompts (list): Updating prompts state. New count:', finalPrompts.length);
        return finalPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        if (data?.getPromptDetails) {
          console.log('[usePromptLab] GET_PROMPT_DETAILS_QUERY onCompleted. Details for ID:', data.getPromptDetails.id);
          setLocalError(null);
          setPrompts((prevPrompts) =>
            prevPrompts.map((p) =>
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
                    variables: data.getPromptDetails.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })), // Ensure unique client-side IDs
                    versions: data.getPromptDetails.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })), // Ensure unique client-side IDs
                  }
                : p
            )
          );
        }
      },
      onError: (err) => {
        console.error("[usePromptLab] Error fetching prompt details:", err);
        setLocalError("Failed to load prompt details.");
        setSelectedId(null);
      },
    }
  );

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    update(cache, { data: { createPrompt } }) {
      if (!createPrompt) return;
      console.log('[usePromptLab] CREATE_PROMPT_MUTATION update cache for new prompt:', createPrompt.id);

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
                content: '',
                context: '',
                variables: [],
                versions: [],
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
        const newPrompt: Prompt = {
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
          variables: data.createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
          versions: data.createPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
        };
        setPrompts((prevPrompts) => [newPrompt, ...prevPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        selectPrompt(newPrompt.id);
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Create Prompt", err);
      setLocalError("Failed to create prompt.");
    },
  });

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.updatePrompt) {
        console.log('[usePromptLab] UPDATE_PROMPT_MUTATION onCompleted. Updated prompt ID:', data.updatePrompt.id, 'Title:', data.updatePrompt.title);
        // This onCompleted fires AFTER the server response.
        // We already have an optimistic update.
        // The `selectPrompt(selectedId)` call here was likely causing the revert/stuck feeling.
        // Apollo Client's cache normalization should automatically update the GET_PROMPT_DETAILS_QUERY
        // if its fields are part of the UPDATE_PROMPT_MUTATION response.

        // So, we only manually update prompts list fields if needed,
        // but the main content/context/variables should be picked up by the selectedPrompt's useEffect
        // reacting to the cache update for GET_PROMPT_DETAILS_QUERY.
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
                  // Do NOT update content, context, variables here.
                  // Let the GET_PROMPT_DETAILS_QUERY (triggered by selectPrompt) or Apollo cache handle it.
                  // Only update list-view relevant fields.
                  content: p.content, // Preserve previous content
                  context: p.context, // Preserve previous context
                  variables: p.variables, // Preserve previous variables
                }
              : p
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        // IMPORTANT: Removed selectPrompt(selectedId) here. This was causing a network-only re-fetch
        // which could overwrite optimistic updates with older server data, leading to the "stuck" effect.
        // Apollo's cache should handle the updates automatically.
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Update Prompt", err);
      setLocalError("Failed to update prompt.");
      // On error, revert to server state by refetching details or list
      if (selectedId) selectPrompt(selectedId); // Re-fetch details to revert editor content to last known good server state
      else refetchPromptsList(); // If no prompt selected, just refetch list
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
        setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== data.deletePrompt.id));
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
        setPrompts((prevPrompts) =>
          prevPrompts.map((p) =>
            p.id === data.snapshotPrompt.id
              ? {
                  ...p,
                  versions: data.snapshotPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid('db-ver-') })),
                  updatedAt: data.snapshotPrompt.updatedAt,
                }
              : p
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        // This is a case where we *do* want to re-fetch details, as versions list is new.
        if (selectedId === data.snapshotPrompt.id) {
          console.log('[usePromptLab] SNAPSHOT_PROMPT_MUTATION: Re-selecting prompt to update versions list.');
          selectPrompt(selectedId);
        }
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
        setPrompts((prevPrompts) =>
          prevPrompts.map((p) =>
            p.id === data.restorePromptVersion.id
              ? {
                  ...p,
                  content: data.restorePromptVersion.content,
                  context: data.restorePromptVersion.context,
                  variables: data.restorePromptVersion.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
                  updatedAt: data.restorePromptVersion.updatedAt,
                }
              : p
          )
        );
        // This is a case where we *do* want to re-fetch details, as content/context/variables change.
        if (selectedId === data.restorePromptVersion.id) {
            console.log('[usePromptLab] RESTORE_PROMPT_VERSION_MUTATION: Re-selecting prompt to update editor content.');
            selectPrompt(selectedId);
        }
      }
    },
    onError: (err) => {
      console.error("[usePromptLab] Mutation Error: Restore Prompt Version", err);
      setLocalError("Failed to restore version.");
      if (selectedId) selectPrompt(selectedId);
    },
  });


  useEffect(() => {
    console.log('[usePromptLab] Root useEffect: Updating localLoading state. listLoading:', listLoading, 'detailsLoading:', detailsLoading, 'projectId:', projectId);
    setLocalLoading(listLoading || detailsLoading || !projectId);
  }, [listLoading, detailsLoading, projectId]);

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
        const defaultPrompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> = {
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
            input: defaultPrompt,
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
    [projectId, createPromptMutation]
  );

  const updatePrompt = useCallback(
    (
      id: string,
      updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
    ) => {
      setLocalError(null);
      console.log('[usePromptLab] updatePrompt: Optimistically updating prompt ID:', id, 'with:', updates);

      setPrompts((prev) => {
        const updatedPrompts = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...updates,
                updatedAt: new Date().toISOString(),
                // Ensure variables are deeply updated if present in patch, preserving client-side IDs
                variables: updates.variables ? updates.variables.map((v: Partial<PromptVariable>) => ({...v, id: v.id || cuid('patch-var-')})) as PromptVariable[] : p.variables,
              }
            : p
        );
        // Ensure the array reference changes even if the content is "deeply equal" but the object itself is not
        const sorted = [...updatedPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log('[usePromptLab] updatePrompt: Prompts state optimistically updated. Selected prompt title:', sorted.find(p => p.id === id)?.title);
        return sorted;
      });

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
    [updatePromptMutation, selectedId, selectPrompt]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalError(null);
      console.log('[usePromptLab] deletePrompt: Optimistically deleting prompt ID:', id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        console.log('[usePromptLab] deletePrompt: Deselecting deleted prompt.');
        setSelectedId(null);
      }

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
        setLocalError("Failed to save prompt version.");
        if (selectedId) selectPrompt(selectedId);
      });
    },
    [snapshotPromptMutation, selectedId, selectPrompt]
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
        setLocalError("Failed to restore prompt version.");
        if (selectedId) selectPrompt(selectedId);
      });
    },
    [restorePromptVersionMutation, selectedId, selectPrompt]
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
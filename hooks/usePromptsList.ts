// hooks/usePromptsList.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLazyQuery, useMutation } from "@apollo/client";

import { GET_PROJECT_PROMPTS_QUERY } from "@/graphql/queries/promptRelatedQueries";
import {
  CREATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, Block, PromptVariable } from '@/components/prompt-lab/store'; // Assuming Block, PromptVariable might be needed for initial prompt structure

// Minimal cuid for client-side use if needed for new local prompts
function cuid(prefix: string = ''): string {
  const chars = '01234789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface UsePromptsListHook {
  prompts: Prompt[];
  loadingList: boolean;
  listError: string | null;
  createPrompt: () => Promise<Prompt | undefined>;
  deletePrompt: (id: string) => void;
  refetchPromptsList: () => Promise<any>;
  triggerPromptsListFetch: (forceRefetch?: boolean) => void;
  // NOTE: selectedId and selectPrompt are no longer managed here.
  // This hook *reacts* to a selectedId but does not control it.
}

export function usePromptsList(projectId: string | undefined, selectedId: string | null): UsePromptsListHook {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [localListError, setLocalListError] = useState<string | null>(null);

  const [
    getProjectPrompts,
    { data: promptsListData, loading: apolloListLoading, error: apolloListError, refetch: apolloRefetchPromptsList, called: getProjectPromptsCalled }
  ] = useLazyQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log('[usePromptsList] [Trace: QueryListComplete] GET_PROJECT_PROMPTS_QUERY onCompleted. Data length:', data?.getProjectPrompts.length, 'prompts.');
      setLocalListError(null);
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
          content: [], // List only needs basic info, no full content
          context: '', // List only needs basic info, no full context
          projectId: p.projectId,
          variables: [], // List only needs basic info, no full variables
          versions: [], // List only needs basic info, no full versions
        })
      );

      setPrompts(mappedPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      console.log('[usePromptsList] [Trace: SetPromptsList] Updating prompts state from list. New count:', mappedPrompts.length);
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: QueryList] Error fetching project prompts list:", err);
      setLocalListError("Failed to load prompts list.");
    },
  });

  // Effect to trigger the initial list fetch
  useEffect(() => {
    console.log('[usePromptsList] [Trace: useEffectListFetch] projectId:', projectId, 'selectedId:', selectedId, 'getProjectPromptsCalled:', getProjectPromptsCalled);
    // Only fetch list if projectId is available and we are *not* currently displaying a selected prompt.
    // Also, only run if the query hasn't been called yet or if prompts are empty (to catch initial load scenario).
    if (projectId && selectedId === null && !getProjectPromptsCalled && prompts.length === 0) {
      console.log('[usePromptsList] [Trace: useEffectListFetch] Triggering initial list fetch (auto-load).');
      getProjectPrompts();
    }
  }, [projectId, selectedId, getProjectPrompts, getProjectPromptsCalled, prompts.length]);

  const triggerPromptsListFetch = useCallback((forceRefetch: boolean = false) => {
    if (projectId) {
      console.log('[usePromptsList] [Trace: TriggerFetch] Explicitly triggering GET_PROJECT_PROMPTS_QUERY.');
      if (forceRefetch) {
          apolloRefetchPromptsList(); // Use Apollo's refetch directly
      } else {
          getProjectPrompts(); // This will fetch if not already called, or from cache if exists
      }
      setPrompts([]); // Clear list on explicit fetch to show loading state
      setLocalListError(null);
    }
  }, [projectId, getProjectPrompts, apolloRefetchPromptsList]);



  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    update(cache, { data: { createPrompt } }) {
      if (!createPrompt) return;
      console.log('[usePromptsList] [Trace: MutationCreateCache] CREATE_PROMPT_MUTATION update cache for new prompt:', createPrompt.id);
      // OPTIONAL: Manually update the cache for GET_PROJECT_PROMPTS_QUERY here
      // readQuery / writeQuery to add the new prompt to the list
    },
    onCompleted: (data) => {
      if (data?.createPrompt) {
        console.log('[usePromptsList] [Trace: MutationCreateComplete] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:', data.createPrompt.id);
        const newPrompt: Prompt = {
          id: data.createPrompt.id,
          title: data.createPrompt.title,
          content: [], // Keep minimal for list
          context: '',
          description: data.createPrompt.description,
          tags: data.createPrompt.tags,
          isPublic: data.createPrompt.isPublic,
          createdAt: data.createPrompt.createdAt,
          updatedAt: data.createPrompt.updatedAt,
          model: data.createPrompt.model,
          projectId: data.createPrompt.projectId,
          variables: [],
          versions: [],
        };
        setPrompts((prevPrompts) => [newPrompt, ...prevPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        // Do NOT call selectPrompt here, as this hook doesn't own selection.
      }
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: MutationCreate] Mutation Error: Create Prompt", err);
      setLocalListError("Failed to create prompt.");
    },
  });

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    update(cache, { data: { deletePrompt } }) {
      if (!deletePrompt) return;
      console.log('[usePromptsList] [Trace: MutationDeleteCache] DELETE_PROMPT_MUTATION update cache for deleted prompt:', deletePrompt.id);
      // OPTIONAL: Manually remove from cache
    },
    onCompleted: (data) => {
      if (data?.deletePrompt.id) {
        console.log('[usePromptsList] [Trace: MutationDeleteComplete] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:', data.deletePrompt.id);
        setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== data.deletePrompt.id));
        // Do NOT deselect here, as this hook doesn't own selection. Parent will handle.
      }
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: MutationDelete] Mutation Error: Delete Prompt", err);
      setLocalListError("Failed to delete prompt.");
      apolloRefetchPromptsList(); // Refetch list on error as a fallback
    },
  });


  const createPrompt = useCallback(
    async (): Promise<Prompt | undefined> => {
      setLocalListError(null);
      console.log('[usePromptsList] [Trace: Create] createPrompt: Initiating creation for projectId:', projectId);
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
          variables: { input: defaultPrompt },
        });

        if (data?.createPrompt) {
          // Return the full prompt data so the parent can select it if needed.
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
        console.error("[usePromptsList] [Error: CreateGraphQL] Error creating prompt via GraphQL:", err);
        setLocalListError("Failed to create prompt.");
      }
      return undefined;
    },
    [projectId, createPromptMutation]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalListError(null);
      console.log('[usePromptsList] [Trace: Delete] deletePrompt: Optimistically deleting prompt ID:', id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));

      deletePromptMutation({ variables: { id } }).catch((err) => {
        console.error("[usePromptsList] [Error: DeleteGraphQL] Error deleting prompt via GraphQL:", err);
        setLocalListError("Failed to delete prompt.");
        apolloRefetchPromptsList(); // Refetch list on error
      });
    },
    [deletePromptMutation, apolloRefetchPromptsList]
  );

  return {
    prompts,
    loadingList: apolloListLoading,
    listError: localListError || apolloListError?.message || null,
    createPrompt,
    deletePrompt,
    refetchPromptsList: apolloRefetchPromptsList,
    triggerPromptsListFetch,
  };
}
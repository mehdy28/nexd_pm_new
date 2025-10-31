'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLazyQuery, useMutation } from "@apollo/client";

import { GET_PROJECT_PROMPTS_QUERY } from "@/graphql/queries/promptRelatedQueries";
import {
  CREATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, Block, PromptVariable } from '@/components/prompt-lab/store';

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
  loadMorePrompts: () => void; // ADDED: Function to load more prompts
  hasMorePrompts: boolean; // ADDED: Indicates if more prompts are available
  // NOTE: selectedId and selectPrompt are no longer managed here.
  // This hook *reacts* to a selectedId but does not control it.
}

const ITEMS_PER_PAGE = 9; // Define how many prompts to fetch per page

export function usePromptsList(projectId: string | undefined, selectedId: string | null): UsePromptsListHook {
  const [prompts, setPrompts] = useState<Prompt[]>([]); // This already matches 'prompts' state from usePromptLab
  const [localListError, setLocalListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // Current page for pagination
  const [totalPromptsCount, setTotalPromptsCount] = useState(0); // Total count from backend
  const [isFetchingMore, setIsFetchingMore] = useState(false); // State for loading more


  const [
    getProjectPrompts,
    { data: promptsListData, loading: apolloListLoading, error: apolloListError, refetch: apolloRefetchPromptsList, called: getProjectPromptsCalled }
  ] = useLazyQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId, skip: 0, take: ITEMS_PER_PAGE }, // Initial fetch, only first page
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log('[usePromptsList] [Trace: QueryListComplete] GET_PROJECT_PROMPTS_QUERY onCompleted. Data length:', data?.getProjectPrompts.prompts.length, 'prompts. Total Count:', data?.getProjectPrompts.totalCount);
      setLocalListError(null);
      const mappedPrompts: Prompt[] = data.getProjectPrompts.prompts.map(
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
          content: [], // Minimal for list
          context: '',
          variables: [],
          versions: [],
        })
      );

      setPrompts(mappedPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setTotalPromptsCount(data.getProjectPrompts.totalCount);
      setCurrentPage(1); // Set to 1 because first page is loaded
      setIsFetchingMore(false); // Reset fetching more state
      console.log('[usePromptsList] [Trace: SetPromptsList] Updating prompts state from list. New count:', mappedPrompts.length);
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: QueryList] Error fetching project prompts list:", err);
      setLocalListError("Failed to load prompts list.");
      setIsFetchingMore(false); // Reset fetching more state
    },
  });

  // NEW: useLazyQuery for loading more prompts
  const [
    getMoreProjectPrompts,
    { data: morePromptsData, loading: apolloLoadingMore, error: apolloMoreError }
  ] = useLazyQuery(GET_PROJECT_PROMPTS_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log('[usePromptsList] [Trace: QueryMoreListComplete] GET_PROJECT_PROMPTS_QUERY (More) onCompleted. Data length:', data?.getProjectPrompts.prompts.length);
      const mappedPrompts: Prompt[] = data.getProjectPrompts.prompts.map(
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
          content: [], // Minimal for list
          context: '',
          variables: [],
          versions: [],
        })
      );
      setPrompts(prevPrompts => [...prevPrompts, ...mappedPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setTotalPromptsCount(data.getProjectPrompts.totalCount); // Update total count just in case
      setCurrentPage(prev => prev + 1);
      setIsFetchingMore(false);
      console.log('[usePromptsList] [Trace: SetPromptsList] Appended more prompts. Total count:', prompts.length + mappedPrompts.length);
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: QueryMoreList] Error fetching more project prompts list:", err);
      setLocalListError("Failed to load more prompts.");
      setIsFetchingMore(false);
    },
  });


  // This effect serves the purpose of 'triggerInitialPromptsFetch' from usePromptLab
  // when the component first mounts or projectId changes and no prompt is selected.
  // It ensures the list is loaded automatically when in "list view" mode.
  useEffect(() => {
    console.log('[usePromptsList] [Trace: useEffectListFetch] projectId:', projectId, 'selectedId:', selectedId, 'getProjectPromptsCalled:', getProjectPromptsCalled);
    // Only fetch list if projectId is available and we are *not* currently displaying a selected prompt.
    // Also, only run if the query hasn't been called yet or if prompts are empty (to catch initial load scenario).
    if (projectId && selectedId === null && (!getProjectPromptsCalled || prompts.length === 0)) {
      console.log('[usePromptsList] [Trace: useEffectListFetch] Triggering initial list fetch (auto-load).');
      setLocalListError(null);
      getProjectPrompts();
    }
    // IMPORTANT: When selectedId is NOT null, we don't fetch the list here.
    // The PromptLabContainer is responsible for switching views.
  }, [projectId, selectedId, getProjectPrompts, getProjectPromptsCalled, prompts.length]);

  // This `triggerPromptsListFetch` function now mirrors the explicit trigger function
  // from usePromptLab, resetting pagination and forcing a network-only refetch.
  const triggerPromptsListFetch = useCallback((forceRefetch: boolean = false) => {
    if (projectId) {
      console.log('[usePromptsList] [Trace: TriggerFetch] Explicitly triggering GET_PROJECT_PROMPTS_QUERY.');
      setLocalListError(null);
      setPrompts([]); // Clear list on explicit refetch to show loading state from start
      setCurrentPage(0); // Reset page for a fresh fetch
      setTotalPromptsCount(0); // Reset total count

      if (forceRefetch) {
          apolloRefetchPromptsList({ projectId, skip: 0, take: ITEMS_PER_PAGE }); // Refetch with initial pagination params
      } else {
          getProjectPrompts({ variables: { projectId, skip: 0, take: ITEMS_PER_PAGE } }); // Re-call lazy query with initial params
      }
    }
  }, [projectId, getProjectPrompts, apolloRefetchPromptsList]);


  const loadMorePrompts = useCallback(() => {
    if (projectId && !apolloListLoading && !apolloLoadingMore && prompts.length < totalPromptsCount) {
      setIsFetchingMore(true);
      const skip = currentPage * ITEMS_PER_PAGE;
      console.log(`[usePromptsList] [Trace: LoadMore] Loading more prompts: skip=${skip}, take=${ITEMS_PER_PAGE}`);
      getMoreProjectPrompts({ variables: { projectId, skip, take: ITEMS_PER_PAGE } });
    }
  }, [projectId, apolloListLoading, apolloLoadingMore, prompts.length, totalPromptsCount, currentPage, getMoreProjectPrompts]);

  const hasMorePrompts = useMemo(() => {
    return prompts.length < totalPromptsCount;
  }, [prompts.length, totalPromptsCount]);


  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    // No cache update here, as we refetch the list on completion or let parent select.
    // The onCompleted below will handle local state update.
    onCompleted: (data) => {
      if (data?.createPrompt) {
        console.log('[usePromptsList] [Trace: MutationCreateComplete] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:', data.createPrompt.id);
        const newPromptListItem: Prompt = {
          id: data.createPrompt.id,
          title: data.createPrompt.title,
          description: data.createPrompt.description,
          tags: data.createPrompt.tags,
          isPublic: data.createPrompt.isPublic,
          createdAt: data.createPrompt.createdAt,
          updatedAt: data.createPrompt.updatedAt,
          model: data.createPrompt.model,
          projectId: data.createPrompt.projectId,
          content: [], // Keep minimal for list
          context: '',
          variables: [],
          versions: [],
        };
        // Optimistically add to the beginning of the list and sort.
        // Also increment total count.
        setPrompts((prevPrompts) => [newPromptListItem, ...prevPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setTotalPromptsCount(prev => prev + 1);
        // Do NOT call selectPrompt here, as this hook doesn't own selection.
      }
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: MutationCreate] Mutation Error: Create Prompt", err);
      setLocalListError("Failed to create prompt.");
    },
  });

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.deletePrompt.id) {
        console.log('[usePromptsList] [Trace: MutationDeleteComplete] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:', data.deletePrompt.id);
        setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== data.deletePrompt.id));
        setTotalPromptsCount(prev => Math.max(0, prev - 1)); // Decrement total count
        // Do NOT deselect here, as this hook doesn't own selection. Parent will handle.
      }
    },
    onError: (err) => {
      console.error("[usePromptsList] [Error: MutationDelete] Mutation Error: Delete Prompt", err);
      setLocalListError("Failed to delete prompt.");
      apolloRefetchPromptsList({ projectId, skip: 0, take: ITEMS_PER_PAGE * currentPage }); // Refetch visible portion on error
    },
  });


  const createPrompt = useCallback(
    async (): Promise<Prompt | undefined> => {
      setLocalListError(null);
      console.log('[usePromptsList] [Trace: Create] createPrompt: Initiating creation for projectId:', projectId);
      try {
        const defaultPromptInput: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'> = {
          title: 'Untitled Prompt',
          content: [], // Empty initial content for new prompt
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
          variables: { input: defaultPromptInput },
        });

        if (data?.createPrompt) {
          // The data returned from the mutation (`data.createPrompt`) contains the full prompt object.
          // This is useful for the `PromptLabContainer` to immediately select and display the new prompt.
          // The `onCompleted` handler for `createPromptMutation` already updates the list state.
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
              context: v.context || '', // Ensure context is here for a version if schema requires
              variables: v.variables || [], // Ensure variables is here for a version if schema requires
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
      // Optimistic update is handled in onCompleted,
      // but if you want immediate visual feedback, you could filter here too.
      // For now, onCompleted is robust.
      console.log('[usePromptsList] [Trace: Delete] deletePrompt: Initiating deletion for prompt ID:', id);

      deletePromptMutation({ variables: { id } }).catch((err) => {
        console.error("[usePromptsList] [Error: DeleteGraphQL] Error deleting prompt via GraphQL:", err);
        setLocalListError("Failed to delete prompt.");
        apolloRefetchPromptsList({ projectId, skip: 0, take: ITEMS_PER_PAGE * currentPage }); // Refetch visible portion on error
      });
    },
    [deletePromptMutation, apolloRefetchPromptsList, projectId, currentPage]
  );

  // This `totalLoading` combines Apollo's loading states, acting as the 'loading' state
  // from usePromptLab, but specifically for list operations.
  const totalLoading = apolloListLoading || apolloLoadingMore || isFetchingMore;

  return {
    prompts, // Already present, equivalent to 'prompts' from usePromptLab for list data
    loadingList: totalLoading, // Already present, equivalent to 'loading' from usePromptLab for list loading
    listError: localListError || apolloListError?.message || apolloMoreError?.message || null,
    createPrompt,
    deletePrompt,
    refetchPromptsList: apolloRefetchPromptsList,
    triggerPromptsListFetch, // Already present, equivalent to 'triggerInitialPromptsFetch' from usePromptLab
    loadMorePrompts,
    hasMorePrompts,
  };
}
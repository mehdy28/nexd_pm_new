'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams } from "next/navigation"; // Assuming projectId comes from useParams for context

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
import { Prompt, PromptVariable, Version, PromptVariableType, PromptVariableSource } from '@/components/prompt-lab/store'; // Import types from your store

// Helper to generate a client-side CUID for embedded JSON objects (variables, versions)
function cuid(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 'c'; // CUIDs start with 'c'
  for (let i = 0; i < 24; i++) { // Generate 24 random alphanumeric characters
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
  resolveVariablePreview: (
    variableSource: PromptVariableSource,
    promptVariableId?: string
  ) => {
    data: string | undefined;
    loading: boolean;
    error: any;
  };
}

// NOTE: This hook needs to be adapted if projectId is not always from useParams
// For example, if it's passed as a prop to PromptLabContainer
export function usePromptLab(initialProjectId?: string): UsePromptLabHook {
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined); // Use initialProjectId if provided, else from params

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // --- Callbacks for prompt selection ---
  const selectPrompt = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // 1. Query for the list of prompts
  const {
    data: promptsListData,
    loading: listLoading,
    error: listError,
    refetch: refetchPromptsList,
  } = useQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: { projectId },
    skip: !projectId, // Skip if no projectId, unless it's for personal prompts (where projectId is null)
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
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
          model: p.model || 'gpt-4o', // Ensure default model if not present in list query
          content: '', // Minimal state: content/context/variables/versions not loaded in list query
          context: '',
         projectId: p.projectId, // Now directly accessible as a scalar
          variables: [],
          versions: [],
        })
      );

      setPrompts((prevPrompts) => {
        const prevPromptsMap = new Map(prevPrompts.map(p => [p.id, p]));
        const mergedPrompts = mappedPrompts.map(newPrompt => {
          const prevPrompt = prevPromptsMap.get(newPrompt.id);
          if (prevPrompt) {
            // Update minimal fields, keep full content/context/variables/versions if already loaded
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

        // Remove prompts that were deleted on the server
        const updatedPromptIds = new Set(mappedPrompts.map(p => p.id));
        const filteredPrevPrompts = prevPrompts.filter(prevPrompt => updatedPromptIds.has(prevPrompt.id));

        const finalPrompts = Array.from(new Set([...filteredPrevPrompts, ...mergedPrompts].map(p => p.id)))
          .map(id => mergedPrompts.find(p => p.id === id) || filteredPrevPrompts.find(p => p.id === id)) as Prompt[];

        return finalPrompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    },
    onError: (err) => {
      console.error("Error fetching project prompts list:", err);
      setLocalError("Failed to load prompts list.");
    },
  });

  // 2. Query for full prompt details when one is selected
  const { data: promptDetailsData, loading: detailsLoading } = useQuery(
    GET_PROMPT_DETAILS_QUERY,
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only", // Always get fresh details for the editor
      onCompleted: (data) => {
        if (data?.getPromptDetails) {
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
                    variables: data.getPromptDetails.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid() })), // Ensure client-side IDs
                    versions: data.getPromptDetails.versions.map((v: Version) => ({ ...v, id: v.id || cuid() })), // Ensure client-side IDs
                  }
                : p
            )
          );
        }
      },
      onError: (err) => {
        console.error("Error fetching prompt details:", err);
        setLocalError("Failed to load prompt details.");
        setSelectedId(null); // Deselect if details fail to load
      },
    }
  );

  // --- Mutations for CRUD operations ---
  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    update(cache, { data: { createPrompt } }) {
      if (!createPrompt) return;

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
                // These fields are not part of the list item, so provide minimal/empty
                content: '',
                context: '',
                variables: [],
                versions: [],
                __typename: "Prompt",
              },
              ...existingPromptsQuery.getProjectPrompts,
            ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), // Sort again
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.createPrompt) {
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
          variables: data.createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid() })),
          versions: data.createPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid() })),
        };
        setPrompts((prevPrompts) => [newPrompt, ...prevPrompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        selectPrompt(newPrompt.id); // Auto-select the newly created prompt
      }
    },
    onError: (err) => {
      console.error("Mutation Error: Create Prompt", err);
      setLocalError("Failed to create prompt.");
    },
  });

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.updatePrompt) {
        // Update the list item with latest title and updatedAt
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
                  // Also update content, context, variables if this is the selected prompt
                  content: selectedId === p.id ? data.updatePrompt.content : p.content,
                  context: selectedId === p.id ? data.updatePrompt.context : p.context,
                  variables: selectedId === p.id ? data.updatePrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid() })) : p.variables,
                }
              : p
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        // If the updated prompt is currently selected, a `network-only` refetch (via re-selecting)
        // ensures `getPromptDetails` updates the deeply nested fields.
        if (selectedId === data.updatePrompt.id) {
            selectPrompt(selectedId);
        }
      }
      refetchPromptsList(); // Always refetch the list to get updated updatedAt and title
    },
    onError: (err) => {
      console.error("Mutation Error: Update Prompt", err);
      setLocalError("Failed to update prompt.");
      refetchPromptsList(); // Rollback: refetch prompts to revert to server state
      if (selectedId) selectPrompt(selectedId); // Re-fetch details to revert editor content
    },
  });

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    update(cache, { data: { deletePrompt } }) {
      if (!deletePrompt) return;

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
        setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== data.deletePrompt.id));
        if (selectedId === data.deletePrompt.id) {
          setSelectedId(null);
        }
      }
    },
    onError: (err) => {
      console.error("Mutation Error: Delete Prompt", err);
      setLocalError("Failed to delete prompt.");
      refetchPromptsList(); // Force refetch on error to reconcile state
    },
  });

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.snapshotPrompt) {
        setPrompts((prevPrompts) =>
          prevPrompts.map((p) =>
            p.id === data.snapshotPrompt.id
              ? {
                  ...p,
                  versions: data.snapshotPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid() })),
                  updatedAt: data.snapshotPrompt.updatedAt, // Update the timestamp as well
                }
              : p
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        // If this is the selected prompt, re-fetch details to ensure the versions panel updates
        if (selectedId === data.snapshotPrompt.id) {
          selectPrompt(selectedId);
        }
      }
    },
    onError: (err) => {
      console.error("Mutation Error: Snapshot Prompt", err);
      setLocalError("Failed to save version.");
      if (selectedId) selectPrompt(selectedId); // Re-fetch details for current prompt to revert UI state
    },
  });

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      if (data?.restorePromptVersion) {
        setPrompts((prevPrompts) =>
          prevPrompts.map((p) =>
            p.id === data.restorePromptVersion.id
              ? {
                  ...p,
                  content: data.restorePromptVersion.content,
                  context: data.restorePromptVersion.context,
                  variables: data.restorePromptVersion.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid() })),
                  updatedAt: data.restorePromptVersion.updatedAt,
                }
              : p
          )
        );
        // Force re-selection to trigger GET_PROMPT_DETAILS and update editor
        if (selectedId === data.restorePromptVersion.id) {
            selectPrompt(selectedId);
        }
      }
    },
    onError: (err) => {
      console.error("Mutation Error: Restore Prompt Version", err);
      setLocalError("Failed to restore version.");
      if (selectedId) selectPrompt(selectedId); // Re-fetch details for current prompt to revert UI state
    },
  });


  // Combine loading states
  useEffect(() => {
    setLocalLoading(listLoading || detailsLoading || !projectId);
  }, [listLoading, detailsLoading, projectId]);

  useEffect(() => {
    if (listError) setLocalError(listError.message);
  }, [listError]);


  // --- Callbacks for prompt operations ---
  const createPrompt = useCallback(
    async (): Promise<Prompt | undefined> => {
      setLocalError(null);
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
            variables: data.createPrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid() })),
            versions: data.createPrompt.versions.map((v: Version) => ({ ...v, id: v.id || cuid() })),
          };
          // onCompleted will handle updating local state and selection
          return newPrompt;
        }
      } catch (err: any) {
        console.error("Error creating prompt via GraphQL:", err);
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

      // Optimistic update for UI responsiveness (minimal fields and variables)
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...updates,
                updatedAt: new Date().toISOString(),
                // Ensure variables are deeply updated if present in patch
                variables: updates.variables ? updates.variables.map((v: Partial<PromptVariable>) => ({...v, id: v.id || cuid()})) as PromptVariable[] : p.variables,
              }
            : p
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );

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
            variables: updates.variables, // Pass the entire variables array
          },
        },
      }).catch((err) => {
        console.error("Error updating prompt via GraphQL:", err);
        setLocalError("Failed to update prompt.");
        refetchPromptsList(); // Rollback: refetch prompts to revert to server state
        if (selectedId) selectPrompt(selectedId); // Re-fetch details to revert editor content
      });
    },
    [updatePromptMutation, refetchPromptsList, selectedId, selectPrompt]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalError(null);
      // Optimistic update for Prompts state
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);

      deletePromptMutation({
        variables: { id },
      }).catch((err) => {
        console.error("Error deleting prompt via GraphQL:", err);
        setLocalError("Failed to delete prompt.");
        refetchPromptsList(); // Rollback: refetch prompts to revert to server state
      });
    },
    [selectedId, deletePromptMutation, refetchPromptsList]
  );

  const snapshotPrompt = useCallback(
    (promptId: string, notes?: string) => {
      setLocalError(null);
      snapshotPromptMutation({
        variables: {
          input: { promptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` },
        },
      }).catch((err) => {
        console.error("Error creating prompt snapshot via GraphQL:", err);
        setLocalError("Failed to save prompt version.");
        if (selectedId) selectPrompt(selectedId); // Re-fetch details to revert UI state
      });
    },
    [snapshotPromptMutation, selectedId, selectPrompt]
  );

  const restorePromptVersion = useCallback(
    (promptId: string, versionId: string) => {
      setLocalError(null);
      restorePromptVersionMutation({
        variables: {
          input: { promptId, versionId },
        },
      }).catch((err) => {
        console.error("Error restoring prompt version via GraphQL:", err);
        setLocalError("Failed to restore prompt version.");
        if (selectedId) selectPrompt(selectedId); // Re-fetch details for current prompt to revert UI state
      });
    },
    [restorePromptVersionMutation, selectedId, selectPrompt]
  );

  // Hook for resolving dynamic variable values (used in VariableDiscoveryBuilder)
  const resolveVariablePreview = useCallback((variableSource: PromptVariableSource, promptVariableId?: string) => {
    const { data, loading, error } = useQuery(RESOLVE_PROMPT_VARIABLE_QUERY, {
      variables: {
        projectId,
        variableSource: variableSource, // Make sure this is a valid JSON object
        promptVariableId: promptVariableId,
      },
      skip: !variableSource || !projectId, // Skip if no source or no project (dynamic variables need project context)
      fetchPolicy: "network-only", // Always get fresh preview
    });
    return { data: data?.resolvePromptVariable, loading, error };
  }, [projectId]);


  const selectedPrompt = useMemo(
    () => prompts.find((p) => p.id === selectedId) || null,
    [prompts, selectedId]
  );

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
    resolveVariablePreview,
  };
}
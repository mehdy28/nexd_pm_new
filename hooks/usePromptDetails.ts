'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";

import { GET_PROMPT_DETAILS_QUERY, GET_PROMPT_VERSION_CONTENT_QUERY } from "@/graphql/queries/promptRelatedQueries";
import {
  UPDATE_PROMPT_MUTATION,
  SNAPSHOT_PROMPT_MUTATION,
  RESTORE_PROMPT_VERSION_MUTATION,
  UPDATE_VERSION_DESCRIPTION_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, PromptVariable, Block, Version as PromptVersionType } from '@/components/prompt-lab/store';

function cuid(prefix: string = ''): string {
  const chars = '01234789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface VersionContent {
  id: string; // The version ID itself
  content: Block[];
  context: string;
  variables: PromptVariable[];
}

interface UsePromptDetailsHook {
  selectedPromptDetails: Prompt | null;
  loadingDetails: boolean;
  detailsError: string | null;
  updatePromptDetails: (
    promptId: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
  ) => void;
  snapshotPrompt: (notes?: string) => void;
  restorePromptVersion: (versionId: string) => void;
  updateVersionDescription: (promptId: string, versionId: string, description: string) => void;
  refetchPromptDetails: () => Promise<any>;

  // NEW: Version-specific content loading state and function
  fetchVersionContent: (versionId: string) => void;
  loadingVersionContent: boolean;
  versionContentError: string | null;
  currentLoadedVersionContent: VersionContent | null; // Stores the content of the currently selected version
}

export function usePromptDetails(selectedPromptId: string | null, projectId: string | undefined): UsePromptDetailsHook {
  const [selectedPromptDetails, setSelectedPromptDetails] = useState<Prompt | null>(null);
  const [localDetailsError, setLocalDetailsError] = useState<string | null>(null);
  const lastFetchedPromptData = useRef<Prompt | null>(null);

  // NEW: State for currently loaded version content
  const [currentLoadedVersionContent, setCurrentLoadedVersionContent] = useState<VersionContent | null>(null);

  const { data: promptDetailsData, loading: apolloDetailsLoading, error: apolloDetailsError, refetch: apolloRefetchPromptDetails } = useQuery(
    GET_PROMPT_DETAILS_QUERY,
    {
      variables: { id: selectedPromptId },
      skip: !selectedPromptId,
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        if (data?.getPromptDetails) {
          console.log('[usePromptDetails] [Trace: QueryDetailsComplete] GET_PROMPT_DETAILS_QUERY onCompleted. Details for ID:', data.getPromptDetails.id);
          setLocalDetailsError(null);
          const detailedPrompt: Prompt = {
            id: data.getPromptDetails.id,
            title: data.getPromptDetails.title,
            // Main prompt content, context, variables are fetched here
            content: (data.getPromptDetails.content && Array.isArray(data.getPromptDetails.content) ? data.getPromptDetails.content : []) as Block[],
            context: data.getPromptDetails.context,
            variables: data.getPromptDetails.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),

            description: data.getPromptDetails.description,
            category: data.getPromptDetails.category,
            tags: data.getPromptDetails.tags,
            isPublic: data.getPromptDetails.isPublic,
            createdAt: data.getPromptDetails.createdAt,
            updatedAt: data.getPromptDetails.updatedAt,
            model: data.getPromptDetails.model,
            projectId: data.getPromptDetails.projectId,
            // Versions now only contain metadata (id, createdAt, notes, description)
            versions: data.getPromptDetails.versions.map((v: any) => ({
               ...v,
               id: v.id || cuid('db-ver-'),
               description: v.description || '',
               // content, context, variables are *not* included here for versions
            })),
          };
          lastFetchedPromptData.current = detailedPrompt;
          setSelectedPromptDetails(detailedPrompt);
          // When the main prompt details load, clear any previously loaded version content
          setCurrentLoadedVersionContent(null);
        } else {
            setSelectedPromptDetails(null);
            lastFetchedPromptData.current = null;
            setCurrentLoadedVersionContent(null);
        }
      },
      onError: (err) => {
        console.error("[usePromptDetails] [Error: QueryDetails] Error fetching prompt details:", err);
        setLocalDetailsError("Failed to load prompt details.");
        setSelectedPromptDetails(null);
        lastFetchedPromptData.current = null;
        setCurrentLoadedVersionContent(null);
      },
    }
  );

  // NEW: useLazyQuery for fetching specific version content
  const [
    triggerFetchVersionContent,
    { data: versionContentData, loading: apolloLoadingVersionContent, error: apolloVersionContentError }
  ] = useLazyQuery(GET_PROMPT_VERSION_CONTENT_QUERY, {
    fetchPolicy: "network-only", // Always fetch fresh data for a version
    onCompleted: (data) => {
      if (data?.getPromptVersionContent) {
        console.log('[usePromptDetails] [Trace: QueryVersionContentComplete] GET_PROMPT_VERSION_CONTENT_QUERY onCompleted. Version ID:', data.getPromptVersionContent.id);
        setCurrentLoadedVersionContent({
          id: data.getPromptVersionContent.id,
          content: (data.getPromptVersionContent.content && Array.isArray(data.getPromptVersionContent.content) ? data.getPromptVersionContent.content : []) as Block[],
          context: data.getPromptVersionContent.context || '',
          variables: data.getPromptVersionContent.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
        });
      } else {
        setCurrentLoadedVersionContent(null);
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: QueryVersionContent] Error fetching version content:", err);
      // setLocalDetailsError is for the main prompt, maybe add a specific error for version content if needed
      setCurrentLoadedVersionContent(null);
    },
  });

  const fetchVersionContent = useCallback((versionId: string) => {
    if (!selectedPromptId || !versionId) {
      console.warn('[usePromptDetails] [Trace: FetchVersionContent] fetchVersionContent called with invalid promptId or versionId.');
      setCurrentLoadedVersionContent(null); // Clear previous content
      return;
    }
    console.log('[usePromptDetails] [Trace: FetchVersionContent] Triggering fetch for version content. Prompt ID:', selectedPromptId, 'Version ID:', versionId);
    triggerFetchVersionContent({ variables: { promptId: selectedPromptId, versionId } });
  }, [selectedPromptId, triggerFetchVersionContent]);


  useEffect(() => {
    if (!selectedPromptId) {
      setSelectedPromptDetails(null);
      lastFetchedPromptData.current = null;
      setLocalDetailsError(null);
      setCurrentLoadedVersionContent(null); // Clear version content if no prompt is selected
    }
  }, [selectedPromptId]);

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.updatePrompt) {
        console.log('[usePromptDetails] [Trace: MutationUpdateComplete] UPDATE_PROMPT_MUTATION onCompleted. Updated prompt ID:', data.updatePrompt.id, 'Title:', data.updatePrompt.title);
        setSelectedPromptDetails(prev => prev ? {
            ...prev,
            title: data.updatePrompt.title,
            description: data.updatePrompt.description,
            tags: data.updatePrompt.tags,
            isPublic: data.updatePrompt.isPublic,
            model: data.updatePrompt.model,
            updatedAt: data.updatePrompt.updatedAt,
            // Content and variables are updated directly by the mutation, no need to refetch full prompt for these specific fields
            content: (data.updatePrompt.content && Array.isArray(data.updatePrompt.content) ? data.updatePrompt.content : []) as Block[],
            context: data.updatePrompt.context, // Added context update
            variables: data.updatePrompt.variables.map((v: PromptVariable) => ({ ...v, id: v.id || cuid('db-var-') })),
        } : null);
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationUpdate] Mutation Error: Update Prompt", err);
      setLocalDetailsError("Failed to update prompt.");
      apolloRefetchPromptDetails();
    },
  });

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.snapshotPrompt) {
        console.log('[usePromptDetails] [Trace: MutationSnapshotComplete] SNAPSHOT_PROMPT_MUTATION onCompleted. Prompt ID:', data.snapshotPrompt.id);
        // Optimistically update versions list
        setSelectedPromptDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            versions: data.snapshotPrompt.versions.map((v: any) => ({
              ...v,
              id: v.id || cuid('db-ver-'),
              description: v.description || '',
            })),
            updatedAt: new Date().toISOString(),
          };
        });
        // Refetch the full prompt details (including active content, context, variables)
        // This will update selectedPromptDetails
        apolloRefetchPromptDetails();
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationSnapshot] Mutation Error: Snapshot Prompt", err);
      setLocalDetailsError("Failed to save version.");
      apolloRefetchPromptDetails();
    },
  });

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      if (data?.restorePromptVersion) {
        console.log('[usePromptDetails] [Trace: MutationRestoreComplete] RESTORE_PROMPT_VERSION_MUTATION onCompleted. Prompt ID:', data.restorePromptVersion.id);
        // After restoring, the main prompt's content, context, variables are updated.
        // We need to refetch the main prompt details to reflect this change in UI.
        apolloRefetchPromptDetails();
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationRestore] Mutation Error: Restore Prompt Version", err);
      setLocalDetailsError("Failed to restore version.");
      apolloRefetchPromptDetails();
    },
  });

  const [updateVersionDescriptionMutation] = useMutation(UPDATE_VERSION_DESCRIPTION_MUTATION, {
    onCompleted: (data) => {
      if (data?.updateVersionDescription) {
        console.log('[usePromptDetails] [Trace: MutationUpdateVersionDescriptionComplete] UPDATE_VERSION_DESCRIPTION_MUTATION onCompleted. Prompt ID:', data.updateVersionDescription.id);
        setSelectedPromptDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            versions: data.updateVersionDescription.versions.map((v: any) => ({
              ...v,
              id: v.id || cuid('db-ver-'),
              description: v.description || '',
            })),
            updatedAt: new Date().toISOString(),
          };
        });
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationUpdateVersionDescription] Mutation Error: Update Version Description", err);
      setLocalDetailsError("Failed to update version description.");
      apolloRefetchPromptDetails();
    },
  });


  const updatePromptDetails = useCallback(
    (
      promptId: string,
      updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
    ) => {
      if (!promptId) {
        console.warn('[usePromptDetails] [Trace: Update] updatePromptDetails called with an invalid promptId.');
        setLocalDetailsError('Cannot update prompt: invalid prompt ID provided.');
        return;
      }
      setLocalDetailsError(null);
      console.log('[usePromptDetails] [Trace: Update] updatePromptDetails: Optimistically updating prompt ID:', promptId, 'with keys:', Object.keys(updates));

      if (promptId === selectedPromptId) {
        setSelectedPromptDetails((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ...updates,
            updatedAt: new Date().toISOString(),
            content: updates.content !== undefined ? (updates.content as Block[]) : prev.content,
            context: updates.context !== undefined ? (updates.context as string) : prev.context, // Optimistic update for context
            variables: updates.variables !== undefined ? (updates.variables.map((v: Partial<PromptVariable>) => ({...v, id: v.id || cuid('patch-var-')})) as PromptVariable[]) : prev.variables,
          };
        });
      }

      const filteredUpdates: Record<string, any> = {};
      for (const key in updates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      updatePromptMutation({
        variables: {
          input: {
            id: promptId,
            ...filteredUpdates,
          },
        },
      }).catch((err) => {
        console.error("[usePromptDetails] [Error: UpdateGraphQL] Error updating prompt details via GraphQL:", err);
        setLocalDetailsError("Failed to update prompt details.");
        if (promptId === selectedPromptId) {
          apolloRefetchPromptDetails();
        }
      });
    },
    [selectedPromptId, updatePromptMutation, apolloRefetchPromptDetails]
  );

  const snapshotPrompt = useCallback(
    (notes?: string) => {
      if (!selectedPromptId) {
        console.warn('[usePromptDetails] [Trace: Snapshot] snapshotPrompt called with no selectedPromptId.');
        setLocalDetailsError('Cannot snapshot prompt: no prompt selected.');
        return;
      }
      setLocalDetailsError(null);
      console.log('[usePromptDetails] [Trace: Snapshot] snapshotPrompt: Initiating snapshot for prompt ID:', selectedPromptId);
      snapshotPromptMutation({
        variables: {
          input: { promptId: selectedPromptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` },
        },
      }).catch((err) => {
        console.error("[usePromptDetails] [Error: SnapshotGraphQL] Error creating prompt snapshot via GraphQL:", err);
        setLocalDetailsError("Failed to save version.");
        apolloRefetchPromptDetails();
      });
    },
    [selectedPromptId, snapshotPromptMutation, apolloRefetchPromptDetails]
  );

  const restorePromptVersion = useCallback(
    (versionId: string) => {
      if (!selectedPromptId) {
        console.warn('[usePromptDetails] [Trace: Restore] restorePromptVersion called with no selectedPromptId.');
        setLocalDetailsError('Cannot restore version: no prompt selected.');
        return;
      }
      setLocalDetailsError(null);
      console.log('[usePromptDetails] [Trace: Restore] restorePromptVersion: Initiating restore for prompt ID:', selectedPromptId, 'version ID:', versionId);
      restorePromptVersionMutation({
        variables: {
          input: { promptId: selectedPromptId, versionId },
        },
      }).catch((err) => {
        console.error("[usePromptDetails] [Error: RestoreGraphQL] Error restoring prompt version via GraphQL:", err);
        setLocalDetailsError("Failed to restore version.");
        apolloRefetchPromptDetails();
      });
    },
    [selectedPromptId, restorePromptVersionMutation, apolloRefetchPromptDetails]
  );

  const updateVersionDescription = useCallback(
    (promptId: string, versionId: string, description: string) => {
      if (!promptId || !versionId) {
        console.warn('[usePromptDetails] [Trace: UpdateVersionDesc] updateVersionDescription called with invalid IDs.');
        setLocalDetailsError('Cannot update version description: invalid prompt or version ID.');
        return;
      }
      setLocalDetailsError(null);
      console.log('[usePromptDetails] [Trace: UpdateVersionDesc] Updating description for prompt ID:', promptId, 'version ID:', versionId);

      if (promptId === selectedPromptId) {
        setSelectedPromptDetails(prev => {
          if (!prev) return null;
          const updatedVersions = prev.versions.map(v =>
            v.id === versionId ? { ...v, description: description } : v
          ) as PromptVersionType[];
          return { ...prev, versions: updatedVersions, updatedAt: new Date().toISOString() };
        });
      }

      updateVersionDescriptionMutation({
        variables: {
          input: { promptId, versionId, description },
        },
      }).catch((err) => {
        console.error("[usePromptDetails] [Error: UpdateVersionDescGraphQL] Error updating version description via GraphQL:", err);
        setLocalDetailsError("Failed to update version description.");
        if (promptId === selectedPromptId) {
          apolloRefetchPromptDetails();
        }
      });
    },
    [selectedPromptId, updateVersionDescriptionMutation, apolloRefetchPromptDetails]
  );

  return {
    selectedPromptDetails,
    loadingDetails: apolloDetailsLoading,
    detailsError: localDetailsError || apolloDetailsError?.message || null,
    updatePromptDetails,
    snapshotPrompt,
    restorePromptVersion,
    updateVersionDescription,
    refetchPromptDetails: apolloRefetchPromptDetails,

    // NEW: Expose version content loading state and functions
    fetchVersionContent,
    loadingVersionContent: apolloLoadingVersionContent,
    versionContentError: apolloVersionContentError?.message || null,
    currentLoadedVersionContent,
  };
}
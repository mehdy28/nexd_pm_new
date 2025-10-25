// hooks/usePromptDetails.ts
'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";

import { GET_PROMPT_DETAILS_QUERY } from "@/graphql/queries/promptRelatedQueries";
import {
  UPDATE_PROMPT_MUTATION,
  SNAPSHOT_PROMPT_MUTATION,
  RESTORE_PROMPT_VERSION_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, PromptVariable, Block } from '@/components/prompt-lab/store';

// Minimal cuid for client-side use if needed for new local vars/versions
function cuid(prefix: string = ''): string {
  const chars = '01234789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface UsePromptDetailsHook {
  selectedPromptDetails: Prompt | null;
  loadingDetails: boolean;
  detailsError: string | null;
  // Modified: updatePromptDetails now accepts promptId as its first argument
  updatePromptDetails: (
    promptId: string, // <-- Added promptId parameter
    updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
  ) => void;
  // Snapshot and restore continue to use the hook's selectedPromptId internally
  snapshotPrompt: (notes?: string) => void;
  restorePromptVersion: (versionId: string) => void;
  refetchPromptDetails: () => Promise<any>;
}

export function usePromptDetails(selectedPromptId: string | null, projectId: string | undefined): UsePromptDetailsHook {
  const [selectedPromptDetails, setSelectedPromptDetails] = useState<Prompt | null>(null);
  const [localDetailsError, setLocalDetailsError] = useState<string | null>(null);
  const lastFetchedPromptData = useRef<Prompt | null>(null); // To help maintain details locally

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
          lastFetchedPromptData.current = detailedPrompt;
          setSelectedPromptDetails(detailedPrompt);
        } else {
            setSelectedPromptDetails(null); // Clear details if no data found
            lastFetchedPromptData.current = null;
        }
      },
      onError: (err) => {
        console.error("[usePromptDetails] [Error: QueryDetails] Error fetching prompt details:", err);
        setLocalDetailsError("Failed to load prompt details.");
        setSelectedPromptDetails(null); // Clear details on error
        lastFetchedPromptData.current = null;
      },
    }
  );

  // Clear selectedPromptDetails if selectedPromptId becomes null
  useEffect(() => {
    if (!selectedPromptId) {
      setSelectedPromptDetails(null);
      lastFetchedPromptData.current = null;
      setLocalDetailsError(null);
    }
  }, [selectedPromptId]);

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.updatePrompt) {
        console.log('[usePromptDetails] [Trace: MutationUpdateComplete] UPDATE_PROMPT_MUTATION onCompleted. Updated prompt ID:', data.updatePrompt.id, 'Title:', data.updatePrompt.title);
        // Only update basic fields from mutation result, rely on re-fetch for full details if needed
        setSelectedPromptDetails(prev => prev ? {
            ...prev,
            title: data.updatePrompt.title,
            description: data.updatePrompt.description,
            tags: data.updatePrompt.tags,
            isPublic: data.updatePrompt.isPublic,
            model: data.updatePrompt.model,
            updatedAt: data.updatePrompt.updatedAt,
        } : null);
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationUpdate] Mutation Error: Update Prompt", err);
      setLocalDetailsError("Failed to update prompt.");
      apolloRefetchPromptDetails(); // Refetch details on error to resync
    },
  });

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: (data) => {
      if (data?.snapshotPrompt) {
        console.log('[usePromptDetails] [Trace: MutationSnapshotComplete] SNAPSHOT_PROMPT_MUTATION onCompleted. Prompt ID:', data.snapshotPrompt.id);
        apolloRefetchPromptDetails(); // Refetch details to get the new version in the list
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationSnapshot] Mutation Error: Snapshot Prompt", err);
      setLocalDetailsError("Failed to save version.");
      apolloRefetchPromptDetails(); // Refetch on error
    },
  });

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: (data) => {
      if (data?.restorePromptVersion) {
        console.log('[usePromptDetails] [Trace: MutationRestoreComplete] RESTORE_PROMPT_VERSION_MUTATION onCompleted. Prompt ID:', data.restorePromptVersion.id);
        apolloRefetchPromptDetails(); // Refetch details to show the restored content
      }
    },
    onError: (err) => {
      console.error("[usePromptDetails] [Error: MutationRestore] Mutation Error: Restore Prompt Version", err);
      setLocalDetailsError("Failed to restore version.");
      apolloRefetchPromptDetails(); // Refetch on error
    },
  });

  const updatePromptDetails = useCallback(
    (
      promptId: string, // <-- Now explicitly accepts the promptId to update
      updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>
    ) => {
      // Ensure the provided promptId is valid
      if (!promptId) {
        console.warn('[usePromptDetails] [Trace: Update] updatePromptDetails called with an invalid promptId.');
        setLocalDetailsError('Cannot update prompt: invalid prompt ID provided.');
        return;
      }
      setLocalDetailsError(null);
      console.log('[usePromptDetails] [Trace: Update] updatePromptDetails: Optimistically updating prompt ID:', promptId, 'with keys:', Object.keys(updates));

      // Optimistic UI update: ONLY update if the 'promptId' being updated
      // matches the 'selectedPromptId' of this particular hook instance.
      // If the hook is managing details for ID 'X' and an update comes for ID 'Y',
      // we don't want to optimistically apply 'Y's changes to 'X's display.
      if (promptId === selectedPromptId) {
        setSelectedPromptDetails((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ...updates,
            updatedAt: new Date().toISOString(), // Optimistic update timestamp
            content: updates.content !== undefined ? (updates.content as Block[]) : prev.content,
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
            id: promptId, // Use the provided promptId here
            ...filteredUpdates,
          },
        },
      }).catch((err) => {
        console.error("[usePromptDetails] [Error: UpdateGraphQL] Error updating prompt details via GraphQL:", err);
        setLocalDetailsError("Failed to update prompt details.");
        // If an update fails for the *currently selected* prompt, refetch its details to revert optimistic UI.
        // Otherwise, if it's an update for a different prompt (shouldn't happen often for this hook),
        // we might not need to refetch the *current* selected details.
        if (promptId === selectedPromptId) {
          apolloRefetchPromptDetails(); // Revert optimistic update by refetching actual state
        }
      });
    },
    [selectedPromptId, updatePromptMutation, apolloRefetchPromptDetails]
  );

  const snapshotPrompt = useCallback(
    (notes?: string) => {
      // This function still uses the hook's selectedPromptId
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
      // This function still uses the hook's selectedPromptId
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

  return {
    selectedPromptDetails,
    loadingDetails: apolloDetailsLoading,
    detailsError: localDetailsError || apolloDetailsError?.message || null,
    updatePromptDetails,
    snapshotPrompt,
    restorePromptVersion,
    refetchPromptDetails: apolloRefetchPromptDetails,
  };
}

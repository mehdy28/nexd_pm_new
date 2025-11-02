
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

import { PromptList } from "./prompt-list";
import { PromptLab } from "./prompt-lab";
import { Button } from "../ui/button";
import GlobalAppLoader from "@/components/global-app-loader";

import { usePromptsList } from "@/hooks/usePromptsList";
import { usePromptDetails } from "@/hooks/usePromptDetails";
// REMOVED: import { usePromptLab } from "@/hooks/usePrompts"; 

import { Prompt } from '@/components/prompt-lab/store';


export function PromptLabContainer({ projectId: initialProjectId }: { projectId?: string }) {
  console.log('[PromptLabContainer] [Trace: Render] Component rendering.');
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined);

  // REMOVED: usePromptLab hook
  // const { prompts: promptLabPrompts, loading: loadingPromptLab, triggerInitialPromptsFetch } = usePromptLab(projectId);


  // 1. Manage the selection state centrally
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // 2. Consume usePromptsList hook for list operations
  const {
    prompts,
    loadingList,
    listError,
    createPrompt: createPromptInList,
    deletePrompt: deletePromptFromList,
    triggerPromptsListFetch,
    loadMorePrompts, // ADDED: from usePromptsList
    hasMorePrompts,   // ADDED: from usePromptsList
  } = usePromptsList(projectId, selectedPromptId);

  // 3. Consume usePromptDetails hook for detail operations
  const {
    selectedPromptDetails,
    loadingDetails,
    detailsError,
    updatePromptDetails,
    snapshotPrompt,
    restorePromptVersion,
    refetchPromptDetails,
  } = usePromptDetails(selectedPromptId, projectId);

  // 4. Centralized select/deselect logic
  const selectPrompt = useCallback((id: string | null) => {
    console.log('[PromptLabContainer] [Trace: Select] selectPrompt called with ID:', id);
    setSelectedPromptId(id);
    // When deselecting, ensure the list is refreshed or re-fetched if needed
    if (id === null) {
      triggerPromptsListFetch(true); // Force a network-only refetch of the list
    }
  }, [triggerPromptsListFetch]);

  // Handle create prompt action
  const handleCreateNewPrompt = useCallback(async () => {
    console.log('[PromptLabContainer] [Trace: HandleCreate] handleCreateNewPrompt: Initiating prompt creation.');
    try {
      const newPrompt = await createPromptInList(); // Use the create from the list hook
      if (newPrompt) {
        console.log('[PromptLabContainer] [Trace: HandleCreate] New prompt created:', newPrompt.id);
        selectPrompt(newPrompt.id); // Select the newly created prompt
        // The list will be updated optimistically by usePromptsList, or refetched on deselect.
      }
    } catch (err) {
      console.error("[PromptLabContainer] [Error: Create] Failed to create new prompt:", err);
    }
  }, [createPromptInList, selectPrompt]);

  // Handle delete prompt action
  const handleDeletePrompt = useCallback(async (id: string) => {
    console.log('[PromptLabContainer] [Trace: HandleDelete] handleDeletePrompt: Initiating deletion for ID:', id);
    await deletePromptFromList(id); // Use the delete from the list hook
    if (selectedPromptId === id) {
      console.log('[PromptLabContainer] [Trace: HandleDelete] Deselecting deleted prompt.');
      selectPrompt(null); // Deselect if the deleted prompt was selected
    }
  }, [deletePromptFromList, selectedPromptId, selectPrompt]);

  // Handle "Back to List" action
  const handleBack = () => {
    console.log('[PromptLabContainer] [Trace: HandleBack] handleBack: Deselecting prompt.');
    selectPrompt(null); // Deselect the prompt. This will trigger a list refetch via its useCallback.
    // REMOVED: triggerInitialPromptsFetch(); // No longer needed as usePromptLab is removed
  };

  // Determine overall loading and error states
  // UPDATED: Removed loadingPromptLab as usePromptsList now handles list loading
  const isLoading = loadingList || loadingDetails; 
  const error = listError || detailsError;

  // Determine message for global loader
  let loaderMessage = "Loading..."; // Default message
  if (selectedPromptId) {
    loaderMessage = "Loading prompt details...";
  } else {
    loaderMessage = "Loading prompt list...";
  }

  // --- Global Loader Conditional Rendering ---
  if (isLoading && prompts.length === 0) { // Only show global loader if no prompts in list yet
    console.log(`[PromptLabContainer] [Trace: Render] Rendering GLOBAL LOADER. Message: "${loaderMessage}".`);
    return <GlobalAppLoader message={loaderMessage} />;
  }

  // --- Error Handling (after global loading completes) ---
  if (error) {
    console.log('[PromptLabContainer] [Trace: Render] Rendering ERROR STATE. Error:', error);
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-red-500">
        Error loading data: {error}
        <Button onClick={() => {
          console.log('[PromptLabContainer] [Trace: RetryButton] Retry button clicked.');
          if (selectedPromptId) {
            refetchPromptDetails(); // Retry details fetch if a prompt is selected
          } else {
            triggerPromptsListFetch(true); // Retry list fetch if no prompt is selected
          }
        }} className="mt-4">Retry</Button>
      </div>
    );
  }

  // --- Main UI Rendering (after global loading and error checks) ---
  if (selectedPromptId && selectedPromptDetails) {
    console.log(`[PromptLabContainer] [Trace: Render] Rendering PromptLab component with prompt ID: ${selectedPromptId}.`);
    return (
      <PromptLab
        prompt={selectedPromptDetails} // Pass the full details object
        onBack={handleBack}
        projectId={projectId}
      />
    );
  }

  // Default view: Prompt List (when no prompt is selected and not loading/error)
  console.log('[PromptLabContainer] [Trace: Render] Rendering PromptList component. Prompts count:', prompts.length);
  return (
    <PromptList
      prompts={prompts} // Use prompts from usePromptsList directly
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
      onDeletePrompt={handleDeletePrompt} // Pass delete handler
      isLoading={loadingList} // Pass loading state for load more button logic
      isError={!!listError}
      loadMorePrompts={loadMorePrompts} // Pass load more function
      hasMorePrompts={hasMorePrompts} // Pass hasMore flag
      isFetchingMore={loadingList && prompts.length > 0} // isFetchingMore for load more button
    />
  );
}
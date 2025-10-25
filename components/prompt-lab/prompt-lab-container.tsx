// components/prompt-lab/prompt-lab-container.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

import { PromptList } from "./prompt-list"; // Assuming this component exists
import { PromptLab } from "./prompt-lab";   // Assuming this component exists
import { Button } from "../ui/button";      // Assuming this component exists
import GlobalAppLoader from "@/components/global-app-loader"; // Assuming this component exists

// Import the new separated hooks
import { usePromptsList } from "@/hooks/usePromptsList";
import { usePromptDetails } from "@/hooks/usePromptDetails";
import { usePromptLab } from "@/hooks/usePrompts";

// Import the Prompt type if PromptList or PromptLab need it,
// or if you want to use it for initial structure in handleCreateNewPrompt
import { Prompt } from '@/components/prompt-lab/store';


export function PromptLabContainer({ projectId: initialProjectId }: { projectId?: string }) {
  console.log('[PromptLabContainer] [Trace: Render] Component rendering.');
  const params = useParams();
  const projectId = initialProjectId || (params.id as string | undefined);

  const {    prompts:  promptLabPrompts,    loading: loadingPromptLab, triggerInitialPromptsFetch } = usePromptLab(projectId);


  // 1. Manage the selection state centrally
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // 2. Consume usePromptsList hook for list operations
  const {
    prompts,
    loadingList,
    listError,
    createPrompt: createPromptInList, // Renamed to avoid collision with detail update
    deletePrompt: deletePromptFromList, // Renamed
    triggerPromptsListFetch,
  } = usePromptsList(projectId, selectedPromptId);

  // 3. Consume usePromptDetails hook for detail operations
  const {
    selectedPromptDetails, // This will be the full prompt object
    loadingDetails,
    detailsError,
    updatePromptDetails,
    snapshotPrompt,
    restorePromptVersion,
    refetchPromptDetails, // For specific detail refetches (e.g., after snapshot/restore)
  } = usePromptDetails(selectedPromptId, projectId);

  // 4. Centralized select/deselect logic
  const selectPrompt = useCallback((id: string | null) => {
    console.log('[PromptLabContainer] [Trace: Select] selectPrompt called with ID:', id);
    setSelectedPromptId(id);
    // When deselecting, explicitly trigger a list fetch to ensure it's up-to-date.
    // This will only fetch if selectedId becomes null.
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
        // refetchPromptDetails will be triggered automatically when selectedPromptId changes
        // Also refetch the list (in background) to reflect the new prompt, in case user goes back.
        // Or trust the optimistic update in usePromptsList.
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
    triggerInitialPromptsFetch(); // Explicitly trigger a clean, network-only fetch for the list
  };

  // Determine overall loading and error states
  // The loading from usePromptLab should behave the same as loadingList.
  // This means if usePromptLab is loading, we show the global loader with a relevant message.
  const isLoading = loadingList || loadingDetails || loadingPromptLab;
  const error = listError || detailsError;
  let promptsToDisplay = prompts;
  if (loadingPromptLab === false && promptLabPrompts.length > 0) {
    promptsToDisplay = promptLabPrompts;
  }

  
  // Determine message for global loader
  let loaderMessage = "Loading..."; // Default message
  if (loadingPromptLab) {
    loaderMessage = "Initializing prompt lab..."; // Message specifically for usePromptLab's initial load
  } else if (selectedPromptId) {
    loaderMessage = "Loading prompt details...";
  } else {
    loaderMessage = "Loading prompt list...";
  }

  // --- Global Loader Conditional Rendering ---
  if (isLoading) {
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
            triggerInitialPromptsFetch(); // Also retry the initial fetch if it was part of the error
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
      prompts={promptsToDisplay}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
    />
  );
}





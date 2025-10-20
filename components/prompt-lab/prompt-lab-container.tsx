// components/prompt-lab/prompt-lab-container.tsx
'use client'

import { PromptList } from "./prompt-list"
import { PromptLab } from "./prompt-lab"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react";
import { usePromptLab } from "@/hooks/usePrompts";
import { useEffect, useState } from "react";


export function PromptLabContainer({ projectId }: { projectId?: string }) {
  const {
    prompts,
    selectedPrompt,
    loading, // `loading` from usePromptLab is primarily for the *initial* fetch or when a network request is active for the main list query
    loadingDetails,
    error,
    createPrompt,
    selectPrompt,
    refetchPromptsList,
  } = usePromptLab(projectId);

  // NEW: Introduce a local state to explicitly manage loading when navigating back to the list
  // The `loading` from usePromptLab already covers the initial fetch.
  // This `isReturningToListAndRefetching` is specifically for when `selectedPrompt` becomes null
  // and we trigger `refetchPromptsList` for the list view.
  const [isReturningToListAndRefetching, setIsReturningToListAndRefetching] = useState(false);

  // Effect to trigger refetch when returning to the prompt list (selectedPrompt becomes null)
  useEffect(() => {
    console.log('[PromptLabContainer] useEffect: selectedPrompt changed. Current selectedPrompt:', selectedPrompt?.id || 'null');
    if (!selectedPrompt) {
      // We are navigating back to the list.
      // If `loading` is already true (e.g., initial load or another active fetch),
      // we don't need to set `isReturningToListAndRefetching` as `loading` will cover it.
      // Only trigger if a refetch is genuinely needed after deselecting.
      if (!loading && !isReturningToListAndRefetching) { // Only refetch if not already loading a list
        setIsReturningToListAndRefetching(true);
        console.log('[PromptLabContainer] selectedPrompt is null, triggering refetchPromptsList and setting isReturningToListAndRefetching to true.');
        refetchPromptsList()
          .finally(() => {
            // Once the refetch is complete (regardless of success or failure),
            // reset the loading flag.
            console.log('[PromptLabContainer] refetchPromptsList completed, setting isReturningToListAndRefetching to false.');
            setIsReturningToListAndRefetching(false);
          });
      }
    }
  }, [selectedPrompt, refetchPromptsList, loading, isReturningToListAndRefetching]); // Add `loading` and `isReturningToListAndRefetching` to dependencies

  const handleCreateNewPrompt = async () => {
    try {
      const newPrompt = await createPrompt();
      if (newPrompt) {
        selectPrompt(newPrompt.id);
      }
    } catch (err) {
      console.error("Failed to create new prompt:", err);
    }
  };

  const handleBack = () => {
    console.log('[PromptLabContainer] handleBack: Deselecting prompt.');
    selectPrompt(null);
    // The useEffect above will detect `selectedPrompt` becoming null and trigger the refetch and loading state.
  }

  // Combine the loading states for clarity in conditional rendering
  const isAnyLoading = loading || isReturningToListAndRefetching;

  // --- Conditional Rendering Logic ---

  // 1. If a prompt is selected, render PromptLab.
  // PromptLab handles its own `loadingDetails` via its `loadingDetails` prop.
  if (selectedPrompt) {
    return (
        <PromptLab
            prompt={selectedPrompt}
            onBack={handleBack}
            projectId={projectId}
            loadingDetails={loadingDetails}
        />
    );
  }

  // 2. If no prompt is selected (we are on the list view) AND
  //    any loading state is active, show the global loader for the list.
  if (isAnyLoading) {
    console.log('[PromptLabContainer] Rendering global loader for prompt list (loading or refetching).');
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Loading prompts data...</p>
      </div>
    );
  }

  // 3. If no prompt is selected (list view) AND loading is complete AND there's an error.
  if (error) { // No need to check `!selectedPrompt` as we're in this branch, and `isAnyLoading` is false
      console.log('[PromptLabContainer] Rendering error state for prompt list.');
      return (
        <div className="grid h-full place-items-center p-6 text-sm text-red-500">
          Error loading prompts: {error}
          <Button onClick={refetchPromptsList} className="mt-4">Retry</Button>
        </div>
      );
  }

  // 4. Default view: Prompt List.
  // This branch is reached ONLY IF `!selectedPrompt`, `!isAnyLoading`, and `!error`.
  // At this point, the `prompts` array (which might be empty) reflects the *final* data from the database.
  console.log('[PromptLabContainer] Rendering PromptList. Prompts prop count:', prompts.length);
  prompts.forEach(p => console.log(`  - PromptList prop: ID: ${p.id}, Title: ${p.title.substring(0,20)}...`));
  return (
    <PromptList
      prompts={prompts}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
      isLoading={false} // At this point, no longer loading. `isAnyLoading` is false.
      isError={false} // At this point, no error. `error` is null.
    />
  );
}
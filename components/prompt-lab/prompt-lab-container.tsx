// components/prompt-lab/prompt-lab-container.tsx
'use client'

import { PromptList } from "./prompt-list"
import { PromptLab } from "./prompt-lab"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react";
import { usePromptLab } from "@/hooks/usePrompts";
import { useEffect, useState, useRef } from "react";


export function PromptLabContainer({ projectId }: { projectId?: string }) {
  const {
    prompts,
    selectedPrompt,
    loading,
    loadingDetails,
    error,
    createPrompt,
    selectPrompt,
    triggerListFetchOnBack, // Changed from refetchPromptsList/fetchPromptsList
  } = usePromptLab(projectId);

  // Use a ref to track if we've ever been in the detail view.
  // This helps ensure `triggerListFetchOnBack` only runs when truly "returning"
  // and not during initial mount when `selectedPrompt` is null.
  const hasVisitedDetailView = useRef(false);

  useEffect(() => {
    console.log('[PromptLabContainer] useEffect (hasVisitedDetailView): selectedPrompt changed. ID:', selectedPrompt?.id || 'null');
    if (selectedPrompt) {
      hasVisitedDetailView.current = true;
    } else {
      // If selectedPrompt becomes null, it means we've returned to the list.
      // We should reset hasVisitedDetailView so that the fetch is properly triggered
      // the *next* time we navigate to a detail and then back.
      hasVisitedDetailView.current = false;
    }
  }, [selectedPrompt]);


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
    console.log('[PromptLabContainer] handleBack: Deselecting prompt. Will trigger a fresh list fetch.');
    
    // Only trigger the list fetch if we actually came from a detail view
    // to avoid unnecessary re-fetches on initial page load if projectId is present.
    if (hasVisitedDetailView.current) {
        console.log('[PromptLabContainer] handleBack: hasVisitedDetailView is true. Calling triggerListFetchOnBack.');
        triggerListFetchOnBack();
    } else {
        console.log('[PromptLabContainer] handleBack: hasVisitedDetailView is false. Not triggering list fetch.');
    }
    
    selectPrompt(null); // Deselect the prompt to show the list view
    // hasVisitedDetailView will be reset to false by its useEffect for the next cycle
  }

  // `loading` from usePromptLab will now correctly reflect when GET_PROJECT_PROMPTS_QUERY
  // is being fetched due to `listRefreshKey` changing or initial mount.
  const isAnyLoading = loading;

  // --- Conditional Rendering Logic ---

  // 1. If a prompt is selected, render PromptLab.
  if (selectedPrompt) {
    console.log('[PromptLabContainer] Rendering PromptLab for ID:', selectedPrompt.id, 'Title:', selectedPrompt.title);
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
    console.log('[PromptLabContainer] Rendering global loader for prompt list (loading).');
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Loading prompts data...</p>
      </div>
    );
  }

  // 3. If no prompt is selected (list view) AND loading is complete AND there's an error.
  if (error) {
      console.log('[PromptLabContainer] Rendering error state for prompt list.');
      return (
        <div className="grid h-full place-items-center p-6 text-sm text-red-500">
          Error loading prompts: {error}
          <Button onClick={triggerListFetchOnBack} className="mt-4">Retry</Button>
        </div>
      );
  }

  // 4. Default view: Prompt List.
  console.log('[PromptLabContainer] Rendering PromptList. Prompts prop count:', prompts.length);
  prompts.forEach(p => console.log(`  - PromptList prop: ID: ${p.id}, Title: ${p.title.substring(0,20)}...`));
  return (
    <PromptList
      prompts={prompts}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
      isLoading={false}
      isError={false}
    />
  );
}
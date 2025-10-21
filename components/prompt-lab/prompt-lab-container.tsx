// components/prompt-lab/prompt-lab-container.tsx
'use client'

import { PromptList } from "./prompt-list"
import { PromptLab } from "./prompt-lab"
import { Button } from "../ui/button"
import GlobalAppLoader from "@/components/global-app-loader"; // Import the global loader
import { usePromptLab } from "@/hooks/usePrompts";
import { useEffect, useState, useRef } from "react";


export function PromptLabContainer({ projectId }: { projectId?: string }) {
  console.log('[data loading sequence] [PromptLabContainer] Component rendering.');
  const {
    prompts,
    selectedPrompt,
    loading, // This is the single, global loading state from usePromptLab
    error,
    createPrompt,
    selectPrompt,
    triggerListFetchOnBack,
  } = usePromptLab(projectId);

  const hasVisitedDetailView = useRef(false);

  useEffect(() => {
    console.log('[data loading sequence] [PromptLabContainer] useEffect (hasVisitedDetailView): selectedPrompt changed. ID:', selectedPrompt?.id || 'null');
    if (selectedPrompt) {
      hasVisitedDetailView.current = true;
    } else {
      hasVisitedDetailView.current = false;
    }
  }, [selectedPrompt]);

  const handleCreateNewPrompt = async () => {
    console.log('[data loading sequence] [PromptLabContainer] handleCreateNewPrompt: Initiating prompt creation.');
    try {
      const newPrompt = await createPrompt();
      if (newPrompt) {
        console.log('[data loading sequence] [PromptLabContainer] New prompt created:', newPrompt.id);
        selectPrompt(newPrompt.id);
      }
    } catch (err) {
      console.error("[data loading sequence] [PromptLabContainer] Failed to create new prompt:", err);
    }
  };

  const handleBack = () => {
    console.log('[data loading sequence] [PromptLabContainer] handleBack: Deselecting prompt.');

    if (hasVisitedDetailView.current) {
      console.log('[data loading sequence] [PromptLabContainer] handleBack: hasVisitedDetailView is true. Calling triggerListFetchOnBack.');
      triggerListFetchOnBack();
    } else {
      console.log('[data loading sequence] [PromptLabContainer] handleBack: hasVisitedDetailView is false. Not triggering list fetch.');
    }

    selectPrompt(null);
  }

  // Determine message for global loader
  const loaderMessage = selectedPrompt ? "Loading prompt details..." : "Loading prompt list...";

  // --- Global Loader Conditional Rendering ---
  if (loading) {
    console.log(`[data loading sequence] [PromptLabContainer] Rendering GLOBAL LOADER. Message: "${loaderMessage}".`);
    return <GlobalAppLoader message={loaderMessage} />;
  }

  // --- Error Handling (after global loading completes) ---
  if (error) {
    console.log('[data loading sequence] [PromptLabContainer] Rendering ERROR STATE. Error:', error);
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-red-500">
        Error loading prompts: {error}
        <Button onClick={triggerListFetchOnBack} className="mt-4">Retry</Button>
      </div>
    );
  }

  // --- Main UI Rendering (after global loading and error checks) ---
  if (selectedPrompt) {
    console.log(`[data loading sequence] [PromptLabContainer] Rendering PromptLab component with prompt ID: ${selectedPrompt.id}.`);
    return (
      <PromptLab
        prompt={selectedPrompt}
        onBack={handleBack}
        projectId={projectId}
        // Removed `loadingDetails` prop as it's no longer needed for internal `PromptLab` loading UI.
        // The global loader covers it.
      />
    );
  }

  // Default view: Prompt List (when no prompt is selected and not loading/error)
  console.log('[data loading sequence] [PromptLabContainer] Rendering PromptList component. Prompts count:', prompts.length);
  // Remove `isLoading` and `isError` props from PromptList as global loader/error will handle it.
  return (
    <PromptList
      prompts={prompts}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
    />
  );
}
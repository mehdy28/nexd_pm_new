
// components/prompt-lab/prompt-lab-container.tsx
'use client'

import { PromptList } from "./prompt-list"
import { PromptLab } from "./prompt-lab"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react";
import { usePromptLab } from "@/hooks/usePrompts";


export function PromptLabContainer({ projectId }: { projectId?: string }) {
  // `usePromptLab` now manages selectedId internally, so we don't need `useState` for it here.
  const {
    prompts,
    selectedPrompt,
    loading,
    error,
    createPrompt,
    selectPrompt,
    refetchPromptsList, // If needed for external refetch (e.g., after creating a related project)
    
  } = usePromptLab(projectId); // Pass projectId to the hook

  // This `useEffect` now primarily handles initial creation and selection logic
  // based on the selectedPrompt becoming available or needing creation.
  const handleCreateNewPrompt = async () => {
    try {
      const newPrompt = await createPrompt();
      if (newPrompt) {
        selectPrompt(newPrompt.id);
      }
    } catch (err) {
      console.error("Failed to create new prompt:", err);
      // Error handling is already in the hook, but you can add more UI feedback here
    }
  };


  const handleBack = () => {
    selectPrompt(null)
  }

  // Handle global loading state for the container
  if (loading && !selectedPrompt) { // Only show full-screen loader if nothing is selected yet
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Loading prompts data...</p>
      </div>
    );
  }

  // Handle global error state
  if (error && !selectedPrompt) {
      return (
        <div className="grid h-full place-items-center p-6 text-sm text-red-500">
          Error loading prompts: {error}
          <Button onClick={refetchPromptsList} className="mt-4">Retry</Button>
        </div>
      );
  }

  if (selectedPrompt) {
    return (
        <PromptLab
            prompt={selectedPrompt}
            onBack={handleBack}
            projectId={projectId}
            // Pass loading states down to PromptLab
            // Removed direct passing from usePromptLab, these are now internal to PromptLab
            // isSnapshotting={isSnapshotting}
            // isRestoring={isRestoring}
        />
    );
  } else if (!selectedPrompt && loading) { // If a specific prompt is being loaded after selection
      return (
        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2">Loading selected prompt details...</p>
        </div>
      );
  } else if (!selectedPrompt && error) { // If selected prompt details failed
      return (
        <div className="grid h-full place-items-center p-6 text-sm text-red-500">
          Error loading selected prompt: {error}
          <Button onClick={handleBack} className="mt-4">Back to Prompt List</Button>
        </div>
      );
  }


  // Default view: Prompt List (if no prompt is selected and not loading details for one)
  return (
    <PromptList
      prompts={prompts} // Pass the list of prompts from the hook
      onSelectPrompt={selectPrompt} // Pass the selectPrompt action
      onCreatePrompt={handleCreateNewPrompt} // Pass the createPrompt action
      isLoading={loading}
      isError={!!error}
    />
  );
}
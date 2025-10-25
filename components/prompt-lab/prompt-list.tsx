// components/prompt-lab/prompt-list.tsx
'use client'

import PromptCard from './prompt-card';
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react" // Re-added Loader2 for internal handling if props dictate
import { Prompt } from '@/components/prompt-lab/store';
import { useEffect } from 'react';


interface PromptListProps {
  prompts: Prompt[];
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: () => Promise<any>;
  isLoading?: boolean; // Keep this prop for clarity, though it will likely be `false` when this component renders
  isError?: boolean; // Keep this prop for clarity, though it will likely be `false` when this component renders
}

export function PromptList({ prompts, onSelectPrompt, onCreatePrompt, isLoading, isError }: PromptListProps) {

  useEffect(() => {
    console.log(`[data loading sequence] [PromptList] Rendered with props. Prompts count: ${prompts.length}, isLoading: ${isLoading}, isError: ${isError}`);
    prompts.forEach(p => console.log(`[data loading sequence] [PromptList]   - Received Prompt ID: ${p.id}, Title: ${p.title.substring(0,20)}...`));
  }, [prompts, isLoading, isError]);


  // IMPORTANT:
  // With the global loader strategy in PromptLabContainer, these `isLoading` and `isError`
  // checks *should* ideally never be true when PromptList actually renders.
  // The PromptLabContainer will intercept and display the global loader or error message first.
  // However, by including them here, PromptList is self-contained and robust
  // to changes in its parent's rendering logic.

  if (isLoading) {
    console.log('[data loading sequence] [PromptList] Rendering internal loading state.');
    return (
      <div className="page-scroller p-6 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-slate-500">Loading prompt list...</p>
      </div>
    );
  }

  if (isError) {
    console.log('[data loading sequence] [PromptList] Rendering internal error state.');
    return (
      <div className="page-scroller p-6 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-red-500">
        <p className="text-lg">Failed to load prompts.</p>
        <p className="text-sm mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  console.log('[data loading sequence] [PromptList] Rendering main content (prompts or "no prompts found" message).');
  return (
    <div className="page-scroller p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Prompt Library</h2>
        <Button onClick={onCreatePrompt}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prompts.length === 0 ? (
          <p className="col-span-full text-center text-slate-500">No prompts found. Click "New Prompt" to create one.</p>
        ) : (
          prompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} onClick={() => onSelectPrompt(prompt.id)} />
          ))
        )}
      </div>
    </div>
  )
}
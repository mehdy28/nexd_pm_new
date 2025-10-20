// components/prompt-lab/prompt-list.tsx
'use client'

import PromptCard from './prompt-card';
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react" // Removed Loader2 as parent handles it
import { Prompt } from '@/components/prompt-lab/store';
import { useEffect } from 'react';


interface PromptListProps {
  prompts: Prompt[];
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: () => Promise<any>;
  isLoading: boolean; // Keep this prop for clarity, though it will likely be `false` when this component renders
  isError: boolean; // Keep this prop for clarity, though it will likely be `false` when this component renders
}

export function PromptList({ prompts, onSelectPrompt, onCreatePrompt, isLoading, isError }: PromptListProps) {

  useEffect(() => {
    console.log('[PromptList] Rendered with props. Prompts count:', prompts.length, 'isLoading:', isLoading, 'isError:', isError);
    prompts.forEach(p => console.log(`  - Received Prompt ID: ${p.id}, Title: ${p.title.substring(0,20)}...`));
  }, [prompts, isLoading, isError]);

  // The parent (PromptLabContainer) is now responsible for showing loaders and error messages
  // before rendering PromptList.
  // This means if PromptList is rendered, we can assume loading is complete and no error occurred.
  // The `isLoading` and `isError` props will effectively be `false` here due to the parent's logic.

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
          // This message is now correctly displayed *after* loading is confirmed complete
          // and no prompts were returned by the database.
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
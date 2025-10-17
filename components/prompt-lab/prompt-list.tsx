// components/prompt-lab/prompt-list.tsx
'use client'

import PromptCard from './prompt-card';
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { usePromptLab } from "@/hooks/usePrompts";
import { Prompt } from '@/components/prompt-lab/store'; // Import Prompt type


interface PromptListProps {
  prompts: Prompt[];
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: () => Promise<any>; // Changed return type to Promise<any> as it's async
  isLoading: boolean;
  isError: boolean;
}

export function PromptList({ prompts, onSelectPrompt, onCreatePrompt, isLoading, isError }: PromptListProps) {
  // `usePromptLab` is called in container, so here we receive props directly
  // The onCreatePrompt prop is now an async function from the container.

  if (isLoading) {
    return (
      <div className="page-scroller p-6 flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-slate-500">Loading prompts...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-scroller p-6 flex flex-col items-center justify-center h-full text-red-500">
        <p>Error loading prompts. Please try again.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Reload Page</Button>
      </div>
    );
  }

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
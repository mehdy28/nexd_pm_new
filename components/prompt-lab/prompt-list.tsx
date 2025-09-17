'use client'

import PromptCard from './prompt-card';
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { usePromptLab } from './store';

export function PromptList({ onSelectPrompt, projectId }: { onSelectPrompt: (id: string) => void; projectId?: string }) {
  const { prompts, create } = usePromptLab(projectId);

  const handleCreatePrompt = () => {
    const newPrompt = create();
    onSelectPrompt(newPrompt.id);
  };

  return (
    <div className="page-scroller p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Prompt Library</h2>
        <Button onClick={handleCreatePrompt}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} onClick={() => onSelectPrompt(prompt.id)} />
        ))}
      </div>
    </div>
  )
}

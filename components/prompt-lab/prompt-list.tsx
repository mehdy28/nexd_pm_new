'use client'

import PromptCard from './prompt-card';
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const prompts = [
  { id: '1', name: "Generate a blog post about AI in marketing", tags: ["marketing", "AI", "blogging"], createdAt: "2024-05-20T14:48:00.000Z" },
  { id: '2', name: "Create a social media campaign for a new product launch", tags: ["social media", "marketing"], createdAt: "2024-05-19T11:20:00.000Z" },
  { id: '3', name: "Write a sales email to a potential client", tags: ["sales", "email"], createdAt: "2024-05-18T09:00:00.000Z" },
  { id: '4', name: "Summarize a lengthy research paper", tags: ["research", "summary"], createdAt: "2024-05-17T16:30:00.000Z" },
  { id: '5', name: "Generate a list of creative ideas for a new app", tags: ["ideation", "mobile app"], createdAt: "2024-05-16T10:00:00.000Z" },
]

export function PromptList({ onSelectPrompt, projectId }: { onSelectPrompt: (id: string) => void; projectId?: string }) {
  return (
    <div className="page-scroller p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Prompt Library</h2>
        <Button onClick={() => onSelectPrompt('new')}>
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

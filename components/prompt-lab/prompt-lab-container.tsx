'use client'

import { useEffect, useState } from "react"
import { PromptList } from "./prompt-list"
import { PromptLab } from "./prompt-lab"
import { usePromptLab } from './store'
import { Button } from "../ui/button"


export function PromptLabContainer({ projectId }: { projectId?: string }) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const { prompts, create } = usePromptLab(projectId);

  useEffect(() => {
    if (selectedPromptId === "new") {
      const newPrompt = create();
      setSelectedPromptId(newPrompt.id);
    }
  }, [selectedPromptId, create]);

  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id)
  }

  const handleBack = () => {
    setSelectedPromptId(null)
  }

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) || null;

  if (selectedPromptId && selectedPrompt) {
    return <PromptLab promptId={selectedPromptId} onBack={handleBack} projectId={projectId} />
  } else if (selectedPromptId && !selectedPrompt && selectedPromptId !== "new") { // Added condition to exclude "new"
      return (
        <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
          The selected prompt could not be found.
          <Button onClick={handleBack} className="mt-4">Back to Prompt Library</Button>
        </div>
      );
  }

  return <PromptList onSelectPrompt={handleSelectPrompt} projectId={projectId} />
}

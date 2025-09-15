'use client'

import { useState } from "react"
import { PromptList } from "./prompt-list"
import { PromptLab } from "./prompt-lab"

export function PromptLabContainer({ projectId }: { projectId?: string }) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)

  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id)
  }

  const handleBack = () => {
    setSelectedPromptId(null)
  }

  if (selectedPromptId) {
    return <PromptLab promptId={selectedPromptId} onBack={handleBack} />
  }

  return <PromptList onSelectPrompt={handleSelectPrompt} projectId={projectId} />
}

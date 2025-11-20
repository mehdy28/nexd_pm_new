"use client"

import { useState, useCallback } from "react"
import { PromptList } from "../prompt-lab/prompt-list"
import { PromptLab } from "../prompt-lab/prompt-lab"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { usePersonalPromptsList } from "@/hooks/personal/usePersonalPromptsList"
import { usePromptDetails } from "@/hooks/usePromptDetails"
import { PromptTemplate } from "@/lib/prompts/prompt-templates" // Import the new type
import { generateClientKey } from "@/lib/utils" // Assuming you have a client key generator

export function PersonalPromptLabContainer() {
  console.log("[PersonalPromptLabContainer] [Trace: Render] Component rendering.")

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)

  const {
    prompts,
    loadingList,
    listError,
    createPrompt: createPromptInList,
    deletePrompt: deletePromptFromList,
    triggerPromptsListFetch,
    q,
    setQ,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalPromptsCount,
  } = usePersonalPromptsList(selectedPromptId)

  const { selectedPromptDetails, loadingDetails, detailsError, refetchPromptDetails } = usePromptDetails(
    selectedPromptId,
    undefined,
  )

  const selectPrompt = useCallback(
    (id: string | null) => {
      console.log("[PersonalPromptLabContainer] [Trace: Select] selectPrompt called with ID:", id)
      setSelectedPromptId(id)
      if (id === null) {
        triggerPromptsListFetch(true)
      }
    },
    [triggerPromptsListFetch],
  )

  const handleCreateNewPrompt = useCallback(async () => {
    console.log(
      "[PersonalPromptLabContainer] [Trace: HandleCreate] handleCreateNewPrompt: Initiating prompt creation.",
    )
    try {
      // Assumes createPromptInList can be called with no args for a blank prompt
      const newPrompt = await createPromptInList()
      if (newPrompt) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleCreate] New prompt created:", newPrompt.id)
        selectPrompt(newPrompt.id)
      }
    } catch (err) {
      console.error("[PersonalPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
    }
  }, [createPromptInList, selectPrompt])

  // NEW: Handler for creating a prompt from a template
  const handleCreateFromTemplate = useCallback(
    async (template: PromptTemplate) => {
      console.log(
        `[PersonalPromptLabContainer] [Trace: HandleCreateTemplate] Creating prompt from template: "${template.name}"`,
      )
      setIsCreatingTemplate(true)
      try {
        // Prepare template data for the mutation.
        // We generate temporary client-side keys for React list rendering.
        // The backend should ignore these and generate its own database IDs.
        const promptData = {
          title: template.name,
          content: template.content.map(b => ({ ...b, id: generateClientKey("block-") })),
          context: template.context,
          description: template.description,
          model: template.model,
          variables: template.variables.map(v => ({ ...v, id: generateClientKey("var-") })),
          tags: [template.category],
          isPublic: false,
        }

        // Assumes your createPromptInList hook is modified to accept initial data.
        // Example modification in hook: `const createPrompt = (initialData = defaultData) => ...`
        const newPrompt = await createPromptInList(promptData)
        if (newPrompt) {
          console.log(
            "[PersonalPromptLabContainer] [Trace: HandleCreateTemplate] New prompt created from template:",
            newPrompt.id,
          )
          selectPrompt(newPrompt.id)
        }
      } catch (err) {
        console.error(
          "[PersonalPromptLabContainer] [Error: CreateTemplate] Failed to create prompt from template:",
          err,
        )
      } finally {
        setIsCreatingTemplate(false)
      }
    },
    [createPromptInList, selectPrompt],
  )

  const handleDeletePrompt = useCallback(
    async (id: string) => {
      console.log(
        "[PersonalPromptLabContainer] [Trace: HandleDelete] handleDeletePrompt: Initiating deletion for ID:",
        id,
      )
      await deletePromptFromList(id)
      if (selectedPromptId === id) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleDelete] Deselecting deleted prompt.")
        selectPrompt(null)
      }
    },
    [deletePromptFromList, selectedPromptId, selectPrompt],
  )

  const handleBack = () => {
    console.log("[PersonalPromptLabContainer] [Trace: HandleBack] handleBack: Deselecting prompt.")
    selectPrompt(null)
  }

  const handleRetry = useCallback(() => {
    console.log("[PersonalPromptLabContainer] [Trace: RetryButton] Retry button clicked.")
    if (selectedPromptId) {
      refetchPromptDetails()
    } else {
      triggerPromptsListFetch(true)
    }
  }, [selectedPromptId, refetchPromptDetails, triggerPromptsListFetch])

  const isLoading = loadingList || loadingDetails
  const error = listError || detailsError
  let loaderMessage = selectedPromptId ? "Loading prompt details..." : "Loading your prompts..."

  if (isLoading && prompts.length === 0 && !listError && !detailsError) {
    console.log(
      `[PersonalPromptLabContainer] [Trace: Render] Rendering GLOBAL LOADER. Message: "${loaderMessage}".`,
    )
    return <LoadingPlaceholder message={loaderMessage} />
  }

  if (error) {
    console.log("[PersonalPromptLabContainer] [Trace: Render] Rendering ERROR STATE. Error:", error)
    return <ErrorPlaceholder error={new Error(error)} onRetry={handleRetry} />
  }

  if (selectedPromptId && selectedPromptDetails) {
    console.log(
      `[PersonalPromptLabContainer] [Trace: Render] Rendering PromptLab component with prompt ID: ${selectedPromptId}.`,
    )
    return <PromptLab prompt={selectedPromptDetails} onBack={handleBack} projectId={undefined} />
  }

  console.log(
    "[PersonalPromptLabContainer] [Trace: Render] Rendering PromptList component. Prompts count:",
    prompts.length,
  )
  return (
    <PromptList
      prompts={prompts}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
      onDeletePrompt={handleDeletePrompt}
      onSelectTemplate={handleCreateFromTemplate} // NEW PROP
      isCreatingFromTemplate={isCreatingTemplate} // NEW PROP
      isLoading={loadingList}
      isError={!!listError}
      q={q}
      setQ={setQ}
      page={page}
      setPage={setPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
      totalPages={totalPages}
      totalPromptsCount={totalPromptsCount}
    />
  )
}

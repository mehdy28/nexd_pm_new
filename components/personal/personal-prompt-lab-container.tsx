// components/personal/personal-prompt-lab-container.tsx
"use client"

import { useState, useCallback, useEffect } from "react"
import { PromptList } from "../prompt-lab/prompt-list"
import { PromptLab } from "../prompt-lab/prompt-lab"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { usePersonalPromptsList } from "@/hooks/personal/usePersonalPromptsList"
import { usePromptDetails } from "@/hooks/usePromptDetails"
import { PromptTemplate } from "@/lib/prompts/prompt-templates"
import { generateClientKey } from "@/lib/utils"

export function PersonalPromptLabContainer() {
  console.log("[PersonalPromptLabContainer] [Trace: Render] Component rendering.")

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  // FIX: Track when we are actively loading a newly created prompt to prevent UI flashing
  const [isPostCreationLoading, setIsPostCreationLoading] = useState(false)

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

  const {
    selectedPromptDetails,
    loadingDetails,
    detailsError,
    refetchPromptDetails,
    updatePromptDetails,
    updatePromptVersion,
    snapshotPrompt,
    setActivePromptVersion,
    updateVersionDescription,
    fetchVersionContent,
    loadingVersionContent,
    versionContentError,
    currentLoadedVersionContent,
  } = usePromptDetails(selectedPromptId, undefined)
  
  // FIX: When details finish loading, turn off the post-creation loading flag.
  useEffect(() => {
    if (!loadingDetails && isPostCreationLoading) {
      setIsPostCreationLoading(false)
    }
  }, [loadingDetails, isPostCreationLoading])


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
    setIsPostCreationLoading(true) // FIX: Set loading state before creation
    try {
      const newPrompt = await createPromptInList()
      if (newPrompt) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleCreate] New prompt created:", newPrompt.id)
        selectPrompt(newPrompt.id)
      } else {
        setIsPostCreationLoading(false) // FIX: Unset if creation fails
      }
    } catch (err) {
      console.error("[PersonalPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
      setIsPostCreationLoading(false) // FIX: Unset on error
    }
  }, [createPromptInList, selectPrompt])

  const handleCreateFromTemplate = useCallback(
    async (template: PromptTemplate) => {
      console.log(
        `[PersonalPromptLabContainer] [Trace: HandleCreateTemplate] Creating prompt from template: "${template.name}"`,
      )
      setIsCreatingTemplate(true)
      setIsPostCreationLoading(true) // FIX: Set loading state before creation
      try {
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

        const newPrompt = await createPromptInList(promptData)
        if (newPrompt) {
          console.log(
            "[PersonalPromptLabContainer] [Trace: HandleCreateTemplate] New prompt created from template:",
            newPrompt.id,
          )
          selectPrompt(newPrompt.id)
        } else {
          setIsPostCreationLoading(false) // FIX: Unset if creation fails
        }
      } catch (err) {
        console.error(
          "[PersonalPromptLabContainer] [Error: CreateTemplate] Failed to create prompt from template:",
          err,
        )
        setIsPostCreationLoading(false) // FIX: Unset on error
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
  let loaderMessage = isPostCreationLoading || selectedPromptId ? "Loading prompt details..." : "Loading your prompts..."

  // FIX: Use the new post-creation flag to force the loader screen
  if (isPostCreationLoading || (isLoading && !selectedPromptDetails && prompts.length === 0)) {
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
    return (
      <PromptLab
        prompt={selectedPromptDetails}
        onBack={handleBack}
        projectId={undefined}
        isLoading={loadingDetails}
        error={detailsError}
        refetch={refetchPromptDetails}
        updatePromptDetails={updatePromptDetails}
        updatePromptVersion={updatePromptVersion}
        snapshotPrompt={snapshotPrompt}
        setActivePromptVersion={setActivePromptVersion}
        updateVersionDescription={updateVersionDescription}
        fetchVersionContent={fetchVersionContent}
        loadingVersionContent={loadingVersionContent}
        versionContentError={versionContentError}
        currentLoadedVersionContent={currentLoadedVersionContent}
      />
    )
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
      onSelectTemplate={handleCreateFromTemplate}
      isCreatingFromTemplate={isCreatingTemplate}
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

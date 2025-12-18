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
  const [isPostCreationLoading, setIsPostCreationLoading] = useState(false)

  const {
    prompts,
    loadingList,
    listError,
    createPrompt: createPromptInList,
    deletePrompt: deletePromptFromList,
    deleteManyPrompts: deleteManyPromptsFromList,
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
    setIsPostCreationLoading(true)
    try {
      const newPrompt = await createPromptInList()
      if (newPrompt) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleCreate] New prompt created:", newPrompt.id)
        selectPrompt(newPrompt.id)
      } else {
        setIsPostCreationLoading(false)
      }
    } catch (err) {
      console.error("[PersonalPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
      setIsPostCreationLoading(false)
    }
  }, [createPromptInList, selectPrompt])

  const handleCreateFromTemplate = useCallback(
    async (template: PromptTemplate) => {
      console.log(
        `[PersonalPromptLabContainer] [Trace: HandleCreateTemplate] Creating prompt from template: "${template.name}"`,
      )
      setIsCreatingTemplate(true)
      setIsPostCreationLoading(true)
      try {
        const promptData = {
          title: template.name,
          content: template.content.map(b => ({ ...b, id: generateClientKey("block-") })),
          context: template.context,
          description: template.description,
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
          setIsPostCreationLoading(false)
        }
      } catch (err) {
        console.error(
          "[PersonalPromptLabContainer] [Error: CreateTemplate] Failed to create prompt from template:",
          err,
        )
        setIsPostCreationLoading(false)
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
      
      console.log("[PersonalPromptLabContainer] [Trace: HandleDelete] Deletion promise resolved.")
      
      if (selectedPromptId === id) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleDelete] Deselecting deleted prompt.")
        selectPrompt(null)
      }
    },
    [deletePromptFromList, selectedPromptId, selectPrompt],
  )

  const handleDeleteManyPrompts = useCallback(
    async (ids: string[]) => {
      console.log(
        "[PersonalPromptLabContainer] [Trace: HandleDeleteMany] handleDeleteManyPrompts: Initiating deletion for IDs:",
        ids,
      )
      await deleteManyPromptsFromList(ids)
      
      console.log("[PersonalPromptLabContainer] [Trace: HandleDeleteMany] Bulk deletion promise resolved.")

      // If the currently selected prompt is in the deleted list, deselect it
      if (selectedPromptId && ids.includes(selectedPromptId)) {
        selectPrompt(null)
      }
    },
    [deleteManyPromptsFromList, selectedPromptId, selectPrompt],
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
  let loaderMessage =
    isPostCreationLoading || selectedPromptId ? "Loading prompt details..." : "Loading your prompts..."

  if (isPostCreationLoading || (isLoading && !selectedPromptDetails && prompts.length === 0)) {
    return <LoadingPlaceholder message={loaderMessage} />
  }

  if (error) {
    return <ErrorPlaceholder error={new Error(error)} onRetry={handleRetry} />
  }

  if (selectedPromptId && selectedPromptDetails) {
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

  return (
    <PromptList
      prompts={prompts}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
      onDeletePrompt={handleDeletePrompt}
      onDeleteManyPrompts={handleDeleteManyPrompts}
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

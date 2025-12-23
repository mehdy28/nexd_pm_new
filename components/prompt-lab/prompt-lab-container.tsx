"use client"

import { useState, useCallback } from "react"
import { ProjectPromptList } from "../prompt-lab/project-prompt-list"
import { PromptLab } from "../prompt-lab/prompt-lab"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { usePersonalPromptsList } from "@/hooks/personal/usePersonalPromptsList"
import { usePromptDetails } from "@/hooks/usePromptDetails"
import { PromptTemplate } from "@/lib/prompts/prompt-templates"
import { generateClientKey } from "@/lib/utils"

export function PersonalPromptLabContainer() {

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

  const selectPrompt = useCallback(
    (id: string | null) => {
      setSelectedPromptId(id)
      if (id === null) {
        triggerPromptsListFetch(true)
      }
    },
    [triggerPromptsListFetch],
  )

  const handleCreateNewPrompt = useCallback(async () => {

    try {
      const newPrompt = await createPromptInList()
      if (newPrompt) {
        selectPrompt(newPrompt.id)
      }
    } catch (err) {
      console.error("[PersonalPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
    }
  }, [createPromptInList, selectPrompt])

  const handleCreateFromTemplate = useCallback(
    async (template: PromptTemplate) => {
      setIsCreatingTemplate(true)
      try {
        const promptData = {
          title: template.name,
          content: template.content.map(b => ({ ...b, id: generateClientKey("block-") })),
          context: template.context,
          description: template.description,
          modelProfileId: template.modelProfileId,
          variables: template.variables.map(v => ({ ...v, id: generateClientKey("var-") })),
          tags: [template.category],
          isPublic: false,
        }

        const newPrompt = await createPromptInList(promptData)
        if (newPrompt) {
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
      await deletePromptFromList(id)
      if (selectedPromptId === id) {
        selectPrompt(null)
      }
    },
    [deletePromptFromList, selectedPromptId, selectPrompt],
  )

  const handleBack = () => {
    selectPrompt(null)
  }

  const handleRetry = useCallback(() => {
    if (selectedPromptId) {
      refetchPromptDetails()
    } else {
      triggerPromptsListFetch(true)
    }
  }, [selectedPromptId, refetchPromptDetails, triggerPromptsListFetch])

  const isLoading = loadingList || loadingDetails
  const error = listError || detailsError
  let loaderMessage = selectedPromptId ? "Loading prompt details..." : "Loading your prompts..."

  if (isLoading && !selectedPromptDetails && prompts.length === 0) {
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
    <ProjectPromptList
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
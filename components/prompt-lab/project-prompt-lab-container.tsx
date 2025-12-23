"use client"

import { useState, useCallback, useEffect } from "react"
import { ProjectPromptList } from "../prompt-lab/project-prompt-list"
import { PromptLab } from "../prompt-lab/prompt-lab"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { useProjectPromptsList } from "@/hooks/useProjectPromptsList"
import { usePromptDetails } from "@/hooks/usePromptDetails"
import { PromptTemplate } from "@/lib/prompts/prompt-templates"
import { generateClientKey } from "@/lib/utils"
import { CustomToast, ToastType } from "@/components/ui/custom-toast"

interface ProjectPromptLabContainerProps {
  projectId: string
}

export function ProjectPromptLabContainer({ projectId }: ProjectPromptLabContainerProps) {

  if (!projectId) {
    return <ErrorPlaceholder error={new Error("Project ID is missing.")} />
  }

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [isPostCreationLoading, setIsPostCreationLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

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
  } = useProjectPromptsList(projectId, selectedPromptId)

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
  } = usePromptDetails(selectedPromptId, projectId)
  
  useEffect(() => {
    if (!loadingDetails && isPostCreationLoading) {
      setIsPostCreationLoading(false)
    }
  }, [loadingDetails, isPostCreationLoading])


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

    setIsPostCreationLoading(true)
    try {
      const newPrompt = await createPromptInList({ projectId }) 
      if (newPrompt) {
        showToast("Prompt created successfully", "success")
        selectPrompt(newPrompt.id)
      } else {
        setIsPostCreationLoading(false)
      }
    } catch (err) {
      console.error("[ProjectPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
      showToast("Failed to create prompt", "error")
      setIsPostCreationLoading(false)
    }
  }, [createPromptInList, selectPrompt, projectId, showToast])

  const handleCreateFromTemplate = useCallback(
    async (template: PromptTemplate) => {
      setIsCreatingTemplate(true)
      setIsPostCreationLoading(true)
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
          projectId: projectId,
        }

        const newPrompt = await createPromptInList(promptData)
        if (newPrompt) {
          showToast(`Created from ${template.name}`, "success")
          selectPrompt(newPrompt.id)
        } else {
          setIsPostCreationLoading(false)
        }
      } catch (err) {
        console.error(
          "[ProjectPromptLabContainer] [Error: CreateTemplate] Failed to create prompt from template:",
          err,
        )
        showToast("Failed to apply template", "error")
        setIsPostCreationLoading(false)
      } finally {
        setIsCreatingTemplate(false)
      }
    },
    [createPromptInList, selectPrompt, projectId, showToast],
  )

  const handleDeletePrompt = useCallback(
    async (id: string) => {
      try {
        await deletePromptFromList(id)
        showToast("Prompt deleted", "success")

        if (selectedPromptId === id) {
          selectPrompt(null)
        }
      } catch (err) {
        showToast("Failed to delete prompt", "error")
      }
    },
    [deletePromptFromList, selectedPromptId, selectPrompt, showToast],
  )

  const handleDeleteManyPrompts = useCallback(
    async (ids: string[]) => {
      try {
        await deleteManyPromptsFromList(ids)
        showToast(`${ids.length} prompts deleted`, "success")

        if (selectedPromptId && ids.includes(selectedPromptId)) {
          selectPrompt(null)
        }
      } catch (err) {
        showToast("Failed to delete prompts", "error")
      }
    },
    [deleteManyPromptsFromList, selectedPromptId, selectPrompt, showToast]
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
  let loaderMessage = isPostCreationLoading || selectedPromptId ? "Loading prompt details..." : "Loading project prompts..."

  if (isPostCreationLoading || (isLoading && !selectedPromptDetails && prompts.length === 0)) {
    return <LoadingPlaceholder message={loaderMessage} />
  }

  if (error) {
    return <ErrorPlaceholder error={new Error(error)} onRetry={handleRetry} />
  }

  return (
    <div className="h-full relative">
      {toast && (
        <CustomToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {selectedPromptId && selectedPromptDetails ? (
        <PromptLab
          prompt={selectedPromptDetails}
          onBack={handleBack}
          projectId={projectId}
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
          onShowToast={showToast}
        />
      ) : (
        <ProjectPromptList
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
          onShowToast={showToast}
        />
      )}
    </div>
  )
}
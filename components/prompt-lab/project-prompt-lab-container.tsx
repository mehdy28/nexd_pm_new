"use client"

import { useState, useCallback, useEffect } from "react"
import { ProjectPromptList } from "../prompt-lab/project-prompt-list"
import { PromptLab } from "../prompt-lab/prompt-lab"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
// Use the new project hook
import { useProjectPromptsList } from "@/hooks/useProjectPromptsList" 
import { usePromptDetails } from "@/hooks/usePromptDetails"
import { PromptTemplate } from "@/lib/prompts/prompt-templates"
import { generateClientKey } from "@/lib/utils"

interface ProjectPromptLabContainerProps {
  projectId: string
}

export function ProjectPromptLabContainer({ projectId }: ProjectPromptLabContainerProps) {
  console.log("[ProjectPromptLabContainer] [Trace: Render] Component rendering for Project ID:", projectId)

  // Ensure we have a projectId before proceeding
  if (!projectId) {
    return <ErrorPlaceholder error={new Error("Project ID is missing.")} />
  }

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  // Track when we are actively loading a newly created prompt to prevent UI flashing
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
  } = useProjectPromptsList(projectId, selectedPromptId) // Use project hook with projectId

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
  } = usePromptDetails(selectedPromptId, projectId) // Pass projectId to usePromptDetails if required for authorization/caching
  
  // When details finish loading, turn off the post-creation loading flag.
  useEffect(() => {
    if (!loadingDetails && isPostCreationLoading) {
      setIsPostCreationLoading(false)
    }
  }, [loadingDetails, isPostCreationLoading])


  const selectPrompt = useCallback(
    (id: string | null) => {
      console.log("[ProjectPromptLabContainer] [Trace: Select] selectPrompt called with ID:", id)
      setSelectedPromptId(id)
      if (id === null) {
        // Trigger a list refresh when returning to the list view
        triggerPromptsListFetch(true)
      }
    },
    [triggerPromptsListFetch],
  )

  const handleCreateNewPrompt = useCallback(async () => {
    console.log(
      "[ProjectPromptLabContainer] [Trace: HandleCreate] handleCreateNewPrompt: Initiating project prompt creation.",
    )
    setIsPostCreationLoading(true) // Set loading state before creation
    try {
      // createPromptInList already knows the projectId from the hook context
      const newPrompt = await createPromptInList({ projectId }) 
      if (newPrompt) {
        console.log("[ProjectPromptLabContainer] [Trace: HandleCreate] New prompt created:", newPrompt.id)
        selectPrompt(newPrompt.id)
      } else {
        setIsPostCreationLoading(false) // Unset if creation fails
      }
    } catch (err) {
      console.error("[ProjectPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
      setIsPostCreationLoading(false) // Unset on error
    }
  }, [createPromptInList, selectPrompt, projectId])

  const handleCreateFromTemplate = useCallback(
    async (template: PromptTemplate) => {
      console.log(
        `[ProjectPromptLabContainer] [Trace: HandleCreateTemplate] Creating project prompt from template: "${template.name}"`,
      )
      setIsCreatingTemplate(true)
      setIsPostCreationLoading(true) // Set loading state before creation
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
          projectId: projectId, // Ensure projectId is explicitly passed with template data
        }

        const newPrompt = await createPromptInList(promptData)
        if (newPrompt) {
          console.log(
            "[ProjectPromptLabContainer] [Trace: HandleCreateTemplate] New prompt created from template:",
            newPrompt.id,
          )
          selectPrompt(newPrompt.id)
        } else {
          setIsPostCreationLoading(false) // Unset if creation fails
        }
      } catch (err) {
        console.error(
          "[ProjectPromptLabContainer] [Error: CreateTemplate] Failed to create prompt from template:",
          err,
        )
        setIsPostCreationLoading(false) // Unset on error
      } finally {
        setIsCreatingTemplate(false)
      }
    },
    [createPromptInList, selectPrompt, projectId],
  )

  const handleDeletePrompt = useCallback(
    async (id: string) => {
      console.log(
        "[ProjectPromptLabContainer] [Trace: HandleDelete] handleDeletePrompt: Initiating deletion for ID:",
        id,
      )
      await deletePromptFromList(id)
      if (selectedPromptId === id) {
        console.log("[ProjectPromptLabContainer] [Trace: HandleDelete] Deselecting deleted prompt.")
        selectPrompt(null)
      }
    },
    [deletePromptFromList, selectedPromptId, selectPrompt],
  )

  const handleBack = () => {
    console.log("[ProjectPromptLabContainer] [Trace: HandleBack] handleBack: Deselecting prompt.")
    selectPrompt(null)
  }

  const handleRetry = useCallback(() => {
    console.log("[ProjectPromptLabContainer] [Trace: RetryButton] Retry button clicked.")
    if (selectedPromptId) {
      refetchPromptDetails()
    } else {
      triggerPromptsListFetch(true)
    }
  }, [selectedPromptId, refetchPromptDetails, triggerPromptsListFetch])

  const isLoading = loadingList || loadingDetails
  const error = listError || detailsError
  let loaderMessage = isPostCreationLoading || selectedPromptId ? "Loading prompt details..." : "Loading project prompts..."

  // Use the new post-creation flag to force the loader screen
  if (isPostCreationLoading || (isLoading && !selectedPromptDetails && prompts.length === 0)) {
    console.log(
      `[ProjectPromptLabContainer] [Trace: Render] Rendering GLOBAL LOADER. Message: "${loaderMessage}".`,
    )
    return <LoadingPlaceholder message={loaderMessage} />
  }

  if (error) {
    console.log("[ProjectPromptLabContainer] [Trace: Render] Rendering ERROR STATE. Error:", error)
    return <ErrorPlaceholder error={new Error(error)} onRetry={handleRetry} />
  }

  if (selectedPromptId && selectedPromptDetails) {
    console.log(
      `[ProjectPromptLabContainer] [Trace: Render] Rendering PromptLab component with prompt ID: ${selectedPromptId}.`,
    )
    return (
      <PromptLab
        prompt={selectedPromptDetails}
        onBack={handleBack}
        projectId={projectId} // Pass projectId to PromptLab
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
    "[ProjectPromptLabContainer] [Trace: Render] Rendering ProjectPromptList component. Prompts count:",
    prompts.length,
  )
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
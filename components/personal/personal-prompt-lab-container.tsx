"use client"

import { useState, useCallback } from "react"

import { PromptList } from "../prompt-lab/prompt-list"
import { PromptLab } from "../prompt-lab/prompt-lab"
import { Button } from "../ui/button"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

import { usePersonalPromptsList } from "@/hooks/personal/usePersonalPromptsList"
import { usePromptDetails } from "@/hooks/usePromptDetails"

export function PersonalPromptLabContainer() {
  console.log("[PersonalPromptLabContainer] [Trace: Render] Component rendering.")

  // 1. Manage the selection state centrally
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)

  // 2. Consume usePersonalPromptsList hook for list operations
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

  // 3. Consume usePromptDetails hook for detail operations (projectId is undefined for personal prompts)
  const {
    selectedPromptDetails,
    loadingDetails,
    detailsError,
    refetchPromptDetails,
  } = usePromptDetails(selectedPromptId, undefined)

  // 4. Centralized select/deselect logic
  const selectPrompt = useCallback(
    (id: string | null) => {
      console.log("[PersonalPromptLabContainer] [Trace: Select] selectPrompt called with ID:", id)
      setSelectedPromptId(id)
      // When deselecting, ensure the list is refreshed or re-fetched if needed
      if (id === null) {
        triggerPromptsListFetch(true) // Force a network-only refetch of the list
      }
    },
    [triggerPromptsListFetch]
  )

  // Handle create prompt action
  const handleCreateNewPrompt = useCallback(async () => {
    console.log(
      "[PersonalPromptLabContainer] [Trace: HandleCreate] handleCreateNewPrompt: Initiating prompt creation."
    )
    try {
      const newPrompt = await createPromptInList() // Use the create from the list hook
      if (newPrompt) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleCreate] New prompt created:", newPrompt.id)
        selectPrompt(newPrompt.id) // Select the newly created prompt
      }
    } catch (err) {
      console.error("[PersonalPromptLabContainer] [Error: Create] Failed to create new prompt:", err)
    }
  }, [createPromptInList, selectPrompt])

  // Handle delete prompt action
  const handleDeletePrompt = useCallback(
    async (id: string) => {
      console.log(
        "[PersonalPromptLabContainer] [Trace: HandleDelete] handleDeletePrompt: Initiating deletion for ID:",
        id
      )
      await deletePromptFromList(id) // Use the delete from the list hook
      if (selectedPromptId === id) {
        console.log("[PersonalPromptLabContainer] [Trace: HandleDelete] Deselecting deleted prompt.")
        selectPrompt(null) // Deselect if the deleted prompt was selected
      }
    },
    [deletePromptFromList, selectedPromptId, selectPrompt]
  )

  // Handle "Back to List" action
  const handleBack = () => {
    console.log("[PersonalPromptLabContainer] [Trace: HandleBack] handleBack: Deselecting prompt.")
    selectPrompt(null) // Deselect the prompt. This will trigger a list refetch via its useCallback.
  }

  const handleRetry = useCallback(() => {
    console.log("[PersonalPromptLabContainer] [Trace: RetryButton] Retry button clicked.")
    if (selectedPromptId) {
      refetchPromptDetails() // Retry details fetch if a prompt is selected
    } else {
      triggerPromptsListFetch(true) // Retry list fetch if no prompt is selected
    }
  }, [selectedPromptId, refetchPromptDetails, triggerPromptsListFetch])

  // Determine overall loading and error states
  const isLoading = loadingList || loadingDetails
  const error = listError || detailsError

  // Determine message for global loader
  let loaderMessage = "Loading..." // Default message
  if (selectedPromptId) {
    loaderMessage = "Loading prompt details..."
  } else {
    loaderMessage = "Loading your prompts..."
  }

  // --- Global Loader Conditional Rendering ---
  if (isLoading && prompts.length === 0 && !listError && !detailsError) {
    console.log(`[PersonalPromptLabContainer] [Trace: Render] Rendering GLOBAL LOADER. Message: "${loaderMessage}".`)
    return <LoadingPlaceholder message={loaderMessage} />
  }

  // --- Error Handling (after global loading completes) ---
  if (error) {
    console.log("[PersonalPromptLabContainer] [Trace: Render] Rendering ERROR STATE. Error:", error)
    return <ErrorPlaceholder error={new Error(error)} onRetry={handleRetry} />
  }

  // --- Main UI Rendering (after global loading and error checks) ---
  if (selectedPromptId && selectedPromptDetails) {
    console.log(
      `[PersonalPromptLabContainer] [Trace: Render] Rendering PromptLab component with prompt ID: ${selectedPromptId}.`
    )
    return (
      <PromptLab
        prompt={selectedPromptDetails} // Pass the full details object
        onBack={handleBack}
        projectId={undefined} // No projectId for personal prompts
      />
    )
  }

  // Default view: Prompt List (when no prompt is selected and not loading/error)
  console.log(
    "[PersonalPromptLabContainer] [Trace: Render] Rendering PromptList component. Prompts count:",
    prompts.length
  )
  return (
    <PromptList
      prompts={prompts}
      onSelectPrompt={selectPrompt}
      onCreatePrompt={handleCreateNewPrompt}
      onDeletePrompt={handleDeletePrompt}
      isLoading={loadingList}
      isError={!!listError}
      // Search and Pagination Props
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

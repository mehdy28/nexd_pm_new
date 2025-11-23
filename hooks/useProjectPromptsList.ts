"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useDebounce } from "use-debounce"

// Updated query import for project prompts
import { GET_PROJECT_PROMPTS_QUERY } from "@/graphql/queries/promptRelatedQueries"

// Note: In a real-world scenario, these mutations should ideally be project-specific
// (e.g., CREATE_PROJECT_PROMPT_MUTATION, DELETE_PROJECT_PROMPT_MUTATION) and imported
// from a project-related path. Using the original imports as placeholders for functionality.
import {
  CREATE_PROMPT_MUTATION, // Assumed to handle projectId input
  DELETE_PROMPT_MUTATION, // Assumed to handle deletion by ID
} from "@/graphql/mutations/personal/personalPromptRelatedMutations"

// Reusing types from the component store
import { Prompt, Block, PromptVariable } from "@/components/prompt-lab/store"

// This function should ideally be in a shared utility file.
function generateClientKey(prefix: string = ""): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Defining the type for the optional initial data passed to createPrompt
type PromptCreationData = Partial<{
  title: string
  content: Block[]
  context: string
  description: string
  category: string
  tags: string[]
  isPublic: boolean
  model: string
  variables: Partial<PromptVariable>[]
  projectId?: string
}>

interface UseProjectPromptsListHook {
  prompts: Prompt[]
  loadingList: boolean
  listError: string | null
  createPrompt: (initialData?: PromptCreationData) => Promise<Prompt | undefined>
  deletePrompt: (id: string) => void
  triggerPromptsListFetch: (forceRefetch?: boolean) => void
  // Search and Pagination
  q: string
  setQ: (q: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  totalPages: number
  totalPromptsCount: number
}

const ITEMS_PER_PAGE = 9

/**
 * Hook to manage the list of Prompts associated with a specific Project.
 *
 * @param projectId The ID of the project whose prompts are being managed.
 * @param selectedId Optional ID of a prompt currently selected (used to potentially skip list query).
 */
export function useProjectPromptsList(
  projectId: string,
  selectedId: string | null,
): UseProjectPromptsListHook {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [localListError, setLocalListError] = useState<string | null>(null)

  // Search and Pagination State
  const [q, setQ] = useState("")
  const [debouncedQ] = useDebounce(q, 300) // Debounce search input
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)
  const [totalPromptsCount, setTotalPromptsCount] = useState(0)

  // --- Querying Project Prompts List ---
  const {
    data: promptsListData,
    loading: apolloListLoading,
    error: apolloListError,
    refetch: apolloRefetchPromptsList,
  } = useQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: {
      projectId: projectId, // Crucial filter for project context
      skip: (page - 1) * pageSize,
      take: pageSize,
      q: debouncedQ,
    },
    // Only skip if the project ID is available AND a specific prompt is selected
    skip: !projectId || selectedId !== null,
    fetchPolicy: "network-only",
    onCompleted: data => {
      console.log(
        "[useProjectPromptsList] [Trace: QueryListComplete] GET_PROJECT_PROMPTS_QUERY onCompleted. Data length:",
        data?.getProjectPrompts.prompts.length,
        "prompts. Total Count:",
        data?.getProjectPrompts.totalCount,
      )
      setLocalListError(null)
      const mappedPrompts: Prompt[] = data.getProjectPrompts.prompts.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        tags: p.tags,
        isPublic: p.isPublic,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        model: p.model || "gpt-4o",
        projectId: p.projectId,
        // These fields are not part of the list query response. Initialize them as empty.
        activeVersion: undefined,
        versions: [],
      }))
      setPrompts(mappedPrompts)
      setTotalPromptsCount(data.getProjectPrompts.totalCount)
    },
    onError: err => {
      console.error("[useProjectPromptsList] [Error: QueryList] Error fetching project prompts list:", err)
      setLocalListError("Failed to load project prompts list.")
    },
  })

  // Handlers that reset page number when search or page size changes
  const handleSetQ = (newQ: string) => {
    setPage(1)
    setQ(newQ)
  }

  const handleSetPageSize = (newPageSize: number) => {
    setPage(1)
    setPageSize(newPageSize)
  }

  const triggerPromptsListFetch = useCallback(
    (forceRefetch: boolean = false) => {
      if (forceRefetch) {
        console.log(
          "[useProjectPromptsList] [Trace: TriggerFetch] Explicitly triggering GET_PROJECT_PROMPTS_QUERY refetch.",
        )
        setLocalListError(null)
        setPage(1) // Reset to page 1 on a manual full refresh
        apolloRefetchPromptsList()
      }
    },
    [apolloRefetchPromptsList],
  )

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalPromptsCount / pageSize))
  }, [totalPromptsCount, pageSize])

  // --- Mutation for Creating Prompt ---
  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.createPrompt) {
        console.log(
          "[useProjectPromptsList] [Trace: MutationCreateComplete] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:",
          data.createPrompt.id,
        )
        // Refetch the entire list to ensure pagination and sorting are correct
        apolloRefetchPromptsList()
      }
    },
    onError: err => {
      console.error("[useProjectPromptsList] [Error: MutationCreate] Mutation Error: Create Prompt", err)
      setLocalListError("Failed to create prompt.")
    },
  })

  // --- Mutation for Deleting Prompt ---
  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.deletePrompt.id) {
        console.log(
          "[useProjectPromptsList] [Trace: MutationDeleteComplete] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:",
          data.deletePrompt.id,
        )
        // Check if the current page would become empty
        if (prompts.length === 1 && page > 1) {
          setPage(p => p - 1)
        } else {
          apolloRefetchPromptsList()
        }
      }
    },
    onError: err => {
      console.error("[useProjectPromptsList] [Error: MutationDelete] Mutation Error: Delete Prompt", err)
      setLocalListError("Failed to delete prompt.")
      apolloRefetchPromptsList()
    },
  })

  const createPrompt = useCallback(
    async (initialData?: PromptCreationData): Promise<Prompt | undefined> => {
      if (!projectId) {
        setLocalListError("Cannot create a prompt without a projectId.")
        return undefined
      }

      setLocalListError(null)
      console.log(
        "[useProjectPromptsList] [Trace: Create] createPrompt: Initiating creation for project prompt in Project ID:",
        projectId,
      )
      try {
        const defaultPromptInput = {
          title: "Untitled Project Prompt",
          content: [],
          context: "",
          description: "",
          category: "",
          tags: [],
          isPublic: false,
          model: "gpt-4o",
          projectId: projectId, // Inject the required projectId here
          variables: [],
        }

        const finalInput = { ...defaultPromptInput, ...initialData }

        const cleanContent =
          finalInput.content?.map(({ __typename, id, ...block }, index) => ({
            ...block,
            order: index,
          })) ?? []

        const cleanVariables =
          finalInput.variables?.map(({ __typename, id, ...variable }) => variable) ?? []

        const { data } = await createPromptMutation({
          variables: {
            input: {
              ...finalInput,
              content: cleanContent,
              variables: cleanVariables,
            },
          },
        })

        if (data?.createPrompt) {
          // Construct the returned prompt object
          const newPrompt: Prompt = {
            id: data.createPrompt.id,
            title: data.createPrompt.title,
            description: data.createPrompt.description,
            tags: data.createPrompt.tags,
            isPublic: data.createPrompt.isPublic,
            createdAt: data.createPrompt.createdAt,
            updatedAt: data.createPrompt.updatedAt,
            model: data.createPrompt.model,
            projectId: data.createPrompt.projectId,
            activeVersion: data.createPrompt.activeVersion ? {
                ...data.createPrompt.activeVersion,
                content: data.createPrompt.activeVersion.content as Block[],
                variables: data.createPrompt.activeVersion.variables as PromptVariable[],
            } : undefined,
            versions: data.createPrompt.versions.map((v: any) => ({
              ...v,
              id: v.id || generateClientKey("db-ver-"),
            })),
          }
          return newPrompt
        }
      } catch (err: any) {
        console.error("[useProjectPromptsList] [Error: CreateGraphQL] Error creating prompt via GraphQL:", err)
        setLocalListError("Failed to create project prompt.")
      }
      return undefined
    },
    [createPromptMutation, projectId],
  )

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalListError(null)
      console.log("[useProjectPromptsList] [Trace: Delete] deletePrompt: Initiating deletion for prompt ID:", id)
      deletePromptMutation({ variables: { id } }).catch(err => {
        console.error("[useProjectPromptsList] [Error: DeleteGraphQL] Error deleting prompt via GraphQL:", err)
        setLocalListError("Failed to delete prompt.")
        apolloRefetchPromptsList()
      })
    },
    [deletePromptMutation, apolloRefetchPromptsList],
  )

  return {
    prompts,
    loadingList: apolloListLoading,
    listError: localListError || apolloListError?.message || null,
    createPrompt,
    deletePrompt,
    triggerPromptsListFetch,
    q,
    setQ: handleSetQ,
    page,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalPages,
    totalPromptsCount,
  }
}
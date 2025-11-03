"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useDebounce } from "use-debounce"

import { GET_MY_PROMPTS_QUERY } from "@/graphql/queries/personal/personalPromptRelatedQueries"
import {
  CREATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
} from "@/graphql/mutations/personal/personalPromptRelatedMutations"
import { Prompt, Block, PromptVariable } from "@/components/prompt-lab/store"

function cuid(prefix: string = ""): string {
  const chars = "01234789abcdefghijklmnopqrstuvwxyz"
  let result = prefix + "c"
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

interface UsePersonalPromptsListHook {
  prompts: Prompt[]
  loadingList: boolean
  listError: string | null
  createPrompt: () => Promise<Prompt | undefined>
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

export function usePersonalPromptsList(selectedId: string | null): UsePersonalPromptsListHook {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [localListError, setLocalListError] = useState<string | null>(null)

  // Search and Pagination State
  const [q, setQ] = useState("")
  const [debouncedQ] = useDebounce(q, 300) // Debounce search input
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)
  const [totalPromptsCount, setTotalPromptsCount] = useState(0)

  const {
    data: promptsListData,
    loading: apolloListLoading,
    error: apolloListError,
    refetch: apolloRefetchPromptsList,
  } = useQuery(GET_MY_PROMPTS_QUERY, {
    variables: {
      skip: (page - 1) * pageSize,
      take: pageSize,
      q: debouncedQ,
    },
    skip: selectedId !== null, // Skip query if a prompt is selected
    fetchPolicy: "network-only",
    onCompleted: data => {
      console.log(
        "[usePersonalPromptsList] [Trace: QueryListComplete] GET_MY_PROMPTS_QUERY onCompleted. Data length:",
        data?.getMyPrompts.prompts.length,
        "prompts. Total Count:",
        data?.getMyPrompts.totalCount
      )
      setLocalListError(null)
      const mappedPrompts: Prompt[] = data.getMyPrompts.prompts.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        tags: p.tags,
        isPublic: p.isPublic,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        model: p.model || "gpt-4o",
        projectId: p.projectId,
        content: [],
        context: "",
        variables: [],
        versions: [],
      }))
      setPrompts(mappedPrompts) // Replace prompts with the current page's data
      setTotalPromptsCount(data.getMyPrompts.totalCount)
      console.log(
        "[usePersonalPromptsList] [Trace: SetPromptsList] Updating prompts state from list. New count:",
        mappedPrompts.length
      )
    },
    onError: err => {
      console.error("[usePersonalPromptsList] [Error: QueryList] Error fetching personal prompts list:", err)
      setLocalListError("Failed to load prompts list.")
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
          "[usePersonalPromptsList] [Trace: TriggerFetch] Explicitly triggering GET_MY_PROMPTS_QUERY refetch."
        )
        setLocalListError(null)
        setPage(1) // Reset to page 1 on a manual full refresh
        apolloRefetchPromptsList()
      }
    },
    [apolloRefetchPromptsList]
  )

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalPromptsCount / pageSize))
  }, [totalPromptsCount, pageSize])

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.createPrompt) {
        console.log(
          "[usePersonalPromptsList] [Trace: MutationCreateComplete] CREATE_PROMPT_MUTATION onCompleted. New prompt ID:",
          data.createPrompt.id
        )
        apolloRefetchPromptsList()
      }
    },
    onError: err => {
      console.error("[usePersonalPromptsList] [Error: MutationCreate] Mutation Error: Create Prompt", err)
      setLocalListError("Failed to create prompt.")
    },
  })

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.deletePrompt.id) {
        console.log(
          "[usePersonalPromptsList] [Trace: MutationDeleteComplete] DELETE_PROMPT_MUTATION onCompleted. Deleted prompt ID:",
          data.deletePrompt.id
        )
        if (prompts.length === 1 && page > 1) {
          setPage(p => p - 1)
        } else {
          apolloRefetchPromptsList()
        }
      }
    },
    onError: err => {
      console.error("[usePersonalPromptsList] [Error: MutationDelete] Mutation Error: Delete Prompt", err)
      setLocalListError("Failed to delete prompt.")
      apolloRefetchPromptsList()
    },
  })

  const createPrompt = useCallback(async (): Promise<Prompt | undefined> => {
    setLocalListError(null)
    console.log("[usePersonalPromptsList] [Trace: Create] createPrompt: Initiating creation for personal prompt.")
    try {
      const defaultPromptInput = {
        title: "Untitled Prompt",
        content: [],
        context: "",
        description: "",
        category: "",
        tags: [],
        isPublic: false,
        model: "gpt-4o",
        projectId: null,
        variables: [],
      }

      const { data } = await createPromptMutation({
        variables: { input: defaultPromptInput },
      })

      if (data?.createPrompt) {
        const newPrompt: Prompt = {
          id: data.createPrompt.id,
          title: data.createPrompt.title,
          content:
            data.createPrompt.content && Array.isArray(data.createPrompt.content)
              ? (data.createPrompt.content as Block[])
              : [],
          context: data.createPrompt.context,
          description: data.createPrompt.description,
          tags: data.createPrompt.tags,
          isPublic: data.createPrompt.isPublic,
          createdAt: data.createPrompt.createdAt,
          updatedAt: data.createPrompt.updatedAt,
          model: data.createPrompt.model,
          projectId: data.createPrompt.projectId,
          variables: data.createPrompt.variables.map((v: PromptVariable) => ({
            ...v,
            id: v.id || cuid("db-var-"),
          })),
          versions: data.createPrompt.versions.map((v: any) => ({
            ...v,
            id: v.id || cuid("db-ver-"),
            content: v.content && Array.isArray(v.content) ? (v.content as Block[]) : [],
            context: v.context || "",
            variables: v.variables || [],
          })),
        }
        return newPrompt
      }
    } catch (err: any) {
      console.error("[usePersonalPromptsList] [Error: CreateGraphQL] Error creating prompt via GraphQL:", err)
      setLocalListError("Failed to create prompt.")
    }
    return undefined
  }, [createPromptMutation])

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalListError(null)
      console.log("[usePersonalPromptsList] [Trace: Delete] deletePrompt: Initiating deletion for prompt ID:", id)
      deletePromptMutation({ variables: { id } }).catch(err => {
        console.error("[usePersonalPromptsList] [Error: DeleteGraphQL] Error deleting prompt via GraphQL:", err)
        setLocalListError("Failed to delete prompt.")
        apolloRefetchPromptsList()
      })
    },
    [deletePromptMutation, apolloRefetchPromptsList]
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
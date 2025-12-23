"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useDebounce } from "use-debounce"

import { GET_PROJECT_PROMPTS_QUERY } from "@/graphql/queries/promptRelatedQueries"
import {
  CREATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  DELETE_MANY_PROMPTS_MUTATION,
} from "@/graphql/mutations/personal/personalPromptRelatedMutations"

import { Prompt, Block, PromptVariable } from "@/components/prompt-lab/store"

function generateClientKey(prefix: string = ""): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

type PromptCreationData = Partial<{
  title: string
  content: Block[]
  context: string
  description: string
  category: string
  tags: string[]
  isPublic: boolean
  modelProfileId: string
  variables: Partial<PromptVariable>[]
  projectId?: string
}>

interface UseProjectPromptsListHook {
  prompts: Prompt[]
  loadingList: boolean
  listError: string | null
  createPrompt: (initialData?: PromptCreationData) => Promise<Prompt | undefined>
  deletePrompt: (id: string) => Promise<void>
  deleteManyPrompts: (ids: string[]) => Promise<void>
  triggerPromptsListFetch: (forceRefetch?: boolean) => void
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

export function useProjectPromptsList(
  projectId: string,
  selectedId: string | null,
): UseProjectPromptsListHook {
  const [localListError, setLocalListError] = useState<string | null>(null)

  // Search and Pagination State
  const [q, setQ] = useState("")
  const [debouncedQ] = useDebounce(q, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)

  // --- Querying Project Prompts List ---
  const {
    data: promptsListData,
    loading: apolloListLoading,
    error: apolloListError,
    refetch: apolloRefetchPromptsList,
  } = useQuery(GET_PROJECT_PROMPTS_QUERY, {
    variables: {
      projectId: projectId,
      skip: (page - 1) * pageSize,
      take: pageSize,
      q: debouncedQ,
    },
    // Only skip if the project ID is available AND a specific prompt is selected
    skip: !projectId || selectedId !== null,
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
    onError: err => {
      console.error("[useProjectPromptsList] [Error: QueryList]", err)
      setLocalListError("Failed to load project prompts list.")
    },
  })

  // --- DERIVED STATE (Fix for Deletion Issue) ---
  const prompts = useMemo(() => {
    if (!promptsListData?.getProjectPrompts?.prompts) {
      return []
    }


    return promptsListData.getProjectPrompts.prompts.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      tags: p.tags,
      isPublic: p.isPublic,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      modelProfileId: p.modelProfileId,
      projectId: p.projectId,
      activeVersion: undefined,
      versions: [],
    })) as Prompt[]
  }, [promptsListData])

  const totalPromptsCount = useMemo(() => {
    return promptsListData?.getProjectPrompts?.totalCount || 0
  }, [promptsListData])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalPromptsCount / pageSize))
  }, [totalPromptsCount, pageSize])

  // --- Mutations ---

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    refetchQueries: [
      {
        query: GET_PROJECT_PROMPTS_QUERY,
        variables: { projectId, skip: (page - 1) * pageSize, take: pageSize, q: debouncedQ },
      },
    ],
    awaitRefetchQueries: true,
    onError: err => {
      console.error(err)
      setLocalListError("Failed to create prompt.")
    },
  })

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    refetchQueries: [
      {
        query: GET_PROJECT_PROMPTS_QUERY,
        variables: { projectId, skip: (page - 1) * pageSize, take: pageSize, q: debouncedQ },
      },
    ],
    awaitRefetchQueries: true,
    onCompleted: data => {
      if (prompts.length === 1 && page > 1) {
        setPage(p => p - 1)
      }
    },
    onError: err => {
      console.error(err)
      setLocalListError("Failed to delete prompt.")
    },
  })

  const [deleteManyPromptsMutation] = useMutation(DELETE_MANY_PROMPTS_MUTATION, {
    refetchQueries: [
      {
        query: GET_PROJECT_PROMPTS_QUERY,
        variables: { projectId, skip: (page - 1) * pageSize, take: pageSize, q: debouncedQ },
      },
    ],
    awaitRefetchQueries: true,
    onCompleted: data => {
      const count = data?.deleteManyPrompts?.count || 0
      if (prompts.length <= count && page > 1) {
          setPage(p => p - 1)
      }
    },
    onError: err => {
      console.error(err)
      setLocalListError("Failed to delete selected prompts.")
    }
  })

  // --- Handlers ---

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
        setLocalListError(null)
        setPage(1)
        apolloRefetchPromptsList()
      }
    },
    [apolloRefetchPromptsList],
  )

  const createPrompt = useCallback(
    async (initialData?: PromptCreationData): Promise<Prompt | undefined> => {
      if (!projectId) {
        setLocalListError("Cannot create a prompt without a projectId.")
        return undefined
      }

      setLocalListError(null)
      try {
        const defaultPromptInput = {
          title: "Untitled Project Prompt",
          content: [],
          context: "",
          description: "",
          category: "",
          tags: [],
          isPublic: false,
          projectId: projectId,
          variables: [],
        }

        const finalInput = { ...defaultPromptInput, ...initialData }
        const cleanContent = finalInput.content?.map(({ __typename, id, ...block }, index) => ({
            ...block,
            order: index,
          })) ?? []
        const cleanVariables = finalInput.variables?.map(({ __typename, id, ...variable }) => variable) ?? []

        const { data } = await createPromptMutation({
          variables: {
            input: { ...finalInput, content: cleanContent, variables: cleanVariables },
          },
        })

        if (data?.createPrompt) {
          const newPrompt: Prompt = {
            id: data.createPrompt.id,
            title: data.createPrompt.title,
            description: data.createPrompt.description,
            tags: data.createPrompt.tags,
            isPublic: data.createPrompt.isPublic,
            createdAt: data.createPrompt.createdAt,
            updatedAt: data.createPrompt.updatedAt,
            modelProfileId: data.createPrompt.modelProfileId,
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
        console.error(err)
        setLocalListError("Failed to create project prompt.")
      }
      return undefined
    },
    [createPromptMutation, projectId],
  )

  const deletePrompt = useCallback(
    async (id: string) => {
      setLocalListError(null)
      await deletePromptMutation({ variables: { id } })
    },
    [deletePromptMutation],
  )

  const deleteManyPrompts = useCallback(
    async (ids: string[]) => {
      setLocalListError(null)
      await deleteManyPromptsMutation({ variables: { ids } })
    },
    [deleteManyPromptsMutation]
  )

  return {
    prompts,
    loadingList: apolloListLoading,
    listError: localListError || apolloListError?.message || null,
    createPrompt,
    deletePrompt,
    deleteManyPrompts,
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
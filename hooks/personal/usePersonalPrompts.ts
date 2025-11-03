"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useQuery, useMutation, useLazyQuery } from "@apollo/client"

import {
  GET_MY_PROMPTS_QUERY,
  GET_PROMPT_DETAILS_QUERY,
} from "@/graphql/queries/personal/personalPromptRelatedQueries"
import {
  CREATE_PROMPT_MUTATION,
  UPDATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  SNAPSHOT_PROMPT_MUTATION,
  RESTORE_PROMPT_VERSION_MUTATION,
} from "@/graphql/mutations/personal/personalPromptRelatedMutations"
import {
  Prompt,
  PromptVariable,
  Version,
  Block,
} from "@/components/prompt-lab/store"

function cuid(prefix: string = ""): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
  let result = prefix + "c"
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

interface UsePersonalPromptsHook {
  prompts: Prompt[]
  selectedPrompt: Prompt | null
  loading: boolean
  error: string | null
  createPrompt: () => Promise<Prompt | undefined>
  updatePrompt: (
    id: string,
    updates: Partial<Omit<Prompt, "id" | "createdAt" | "updatedAt" | "user" | "project" | "versions">>
  ) => void
  deletePrompt: (id: string) => void
  snapshotPrompt: (promptId: string, notes?: string) => void
  restorePromptVersion: (promptId: string, versionId: string) => void
  selectPrompt: (id: string | null) => void
  refetchPromptsList: () => Promise<any>
  triggerInitialPromptsFetch: () => void
}

export function usePersonalPrompts(): UsePersonalPromptsHook {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const lastDetailedPromptData = useRef<Prompt | null>(null)

  const selectPrompt = useCallback((id: string | null) => {
    console.log("[usePersonalPrompts] [Trace: Select] selectPrompt called with ID:", id)
    setSelectedId(id)
    if (id === null) {
      lastDetailedPromptData.current = null
      console.log("[usePersonalPrompts] [Trace: Select] Deselected prompt, cleared lastDetailedPromptData.")
    }
  }, [])

  const [
    getMyPrompts,
    { data: promptsListData, loading: listLoading, error: listError, refetch: apolloRefetchPromptsList },
  ] = useLazyQuery(GET_MY_PROMPTS_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: data => {
      console.log(
        "[usePersonalPrompts] [Trace: QueryListComplete] GET_MY_PROMPTS_QUERY onCompleted. Data length:",
        data?.getMyPrompts.prompts.length,
        "prompts."
      )
      setLocalError(null)
      const mappedPrompts: Prompt[] =
        data.getMyPrompts.prompts.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tags: p.tags,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          model: p.model || "gpt-4o",
          content: [],
          context: "",
          projectId: p.projectId,
          variables: [],
          versions: [],
        }))

      setPrompts(prevPrompts => {
        const prevPromptsMap = new Map(prevPrompts.map(p => [p.id, p]))
        const mergedPrompts = mappedPrompts.map(newPrompt => {
          const prevPrompt = prevPromptsMap.get(newPrompt.id)
          if (prevPrompt) {
            return {
              ...newPrompt,
              content:
                prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId
                  ? lastDetailedPromptData.current.content
                  : prevPrompt.content,
              context:
                prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId
                  ? lastDetailedPromptData.current.context
                  : prevPrompt.context,
              variables:
                prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId
                  ? lastDetailedPromptData.current.variables
                  : prevPrompt.variables,
              versions:
                prevPrompt.id === selectedId && lastDetailedPromptData.current?.id === selectedId
                  ? lastDetailedPromptData.current.versions
                  : prevPrompt.versions,
            }
          }
          return newPrompt
        })

        const updatedPromptIds = new Set(mappedPrompts.map(p => p.id))
        const filteredPrevPrompts = prevPrompts.filter(
          prevPrompt => updatedPromptIds.has(prevPrompt.id) || prevPrompt.id === selectedId
        )

        const finalPrompts = Array.from(new Set([...filteredPrevPrompts, ...mergedPrompts].map(p => p.id)))
          .map(id => {
            if (id === selectedId && lastDetailedPromptData.current?.id === selectedId) {
              return lastDetailedPromptData.current
            }
            return (
              mergedPrompts.find(p => p.id === id) || filteredPrevPrompts.find(p => p.id === id)
            )
          })
          .filter(Boolean) as Prompt[]

        console.log(
          "[usePersonalPrompts] [Trace: SetPromptsList] Updating prompts state from list. New count:",
          finalPrompts.length
        )
        return finalPrompts.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      })
    },
    onError: err => {
      console.error("[usePersonalPrompts] [Error: QueryList] Error fetching personal prompts list:", err)
      setLocalError("Failed to load prompts list.")
    },
  })

  const triggerInitialPromptsFetch = useCallback(() => {
    console.log(
      "[usePersonalPrompts] [Trace: TriggerFetch] Explicitly triggering GET_MY_PROMPTS_QUERY (network-only)."
    )
    getMyPrompts()
    setPrompts([])
    setSelectedId(null)
    lastDetailedPromptData.current = null
    setLocalError(null)
  }, [getMyPrompts])

  useEffect(() => {
    if (selectedId === null && !promptsListData && !getMyPrompts.called) {
      console.log("[usePersonalPrompts] [Trace: useEffectListFetch] Triggering initial list fetch (auto-load).")
      getMyPrompts()
    }
  }, [getMyPrompts, selectedId, promptsListData])

  const { data: promptDetailsData, loading: detailsLoading } = useQuery(GET_PROMPT_DETAILS_QUERY, {
    variables: { id: selectedId },
    skip: !selectedId,
    fetchPolicy: "network-only",
    onCompleted: data => {
      if (data?.getPromptDetails) {
        console.log(
          "[usePersonalPrompts] [Trace: QueryDetailsComplete] GET_PROMPT_DETAILS_QUERY onCompleted. Details for ID:",
          data.getPromptDetails.id
        )
        setLocalError(null)
        const detailedPrompt: Prompt = {
          id: data.getPromptDetails.id,
          title: data.getPromptDetails.title,
          content: (
            data.getPromptDetails.content && Array.isArray(data.getPromptDetails.content)
              ? data.getPromptDetails.content
              : []
          ) as Block[],
          context: data.getPromptDetails.context,
          description: data.getPromptDetails.description,
          category: data.getPromptDetails.category,
          tags: data.getPromptDetails.tags,
          isPublic: data.getPromptDetails.isPublic,
          createdAt: data.getPromptDetails.createdAt,
          updatedAt: data.getPromptDetails.updatedAt,
          model: data.getPromptDetails.model,
          projectId: data.getPromptDetails.projectId,
          variables: data.getPromptDetails.variables.map((v: PromptVariable) => ({
            ...v,
            id: v.id || cuid("db-var-"),
          })),
          versions: data.getPromptDetails.versions.map((v: any) => ({
            ...v,
            id: v.id || cuid("db-ver-"),
            content: (v.content && Array.isArray(v.content) ? v.content : []) as Block[],
          })),
        }

        lastDetailedPromptData.current = detailedPrompt

        setPrompts(prevPrompts => prevPrompts.map(p => (p.id === detailedPrompt.id ? { ...detailedPrompt } : p)))
      }
    },
    onError: err => {
      console.error("[usePersonalPrompts] [Error: QueryDetails] Error fetching prompt details:", err)
      setLocalError("Failed to load prompt details.")
      setSelectedId(null)
    },
  })

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.createPrompt) {
        const newPrompt: Prompt = {
          id: data.createPrompt.id,
          title: data.createPrompt.title,
          content: (
            data.createPrompt.content && Array.isArray(data.createPrompt.content)
              ? data.createPrompt.content
              : []
          ) as Block[],
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
            content: (v.content && Array.isArray(v.content) ? v.content : []) as Block[],
          })),
        }
        lastDetailedPromptData.current = newPrompt
        setPrompts(prevPrompts =>
          [newPrompt, ...prevPrompts].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        )
        selectPrompt(newPrompt.id)
      }
    },
    onError: err => {
      console.error("[usePersonalPrompts] [Error: MutationCreate] Mutation Error: Create Prompt", err)
      setLocalError("Failed to create prompt.")
    },
  })

  const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.updatePrompt) {
        setPrompts(prevPrompts =>
          prevPrompts
            .map(p =>
              p.id === data.updatePrompt.id
                ? {
                    ...p,
                    title: data.updatePrompt.title,
                    description: data.updatePrompt.description,
                    tags: data.updatePrompt.tags,
                    isPublic: data.updatePrompt.isPublic,
                    model: data.updatePrompt.model,
                    updatedAt: data.updatePrompt.updatedAt,
                  }
                : p
            )
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        )
      }
    },
    onError: err => {
      console.error("[usePersonalPrompts] [Error: MutationUpdate] Mutation Error: Update Prompt", err)
      setLocalError("Failed to update prompt.")
      if (selectedId) selectPrompt(selectedId)
      else apolloRefetchPromptsList()
    },
  })

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.deletePrompt.id) {
        setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== data.deletePrompt.id))
        if (selectedId === data.deletePrompt.id) {
          setSelectedId(null)
          lastDetailedPromptData.current = null
        }
      }
    },
    onError: err => {
      console.error("[usePersonalPrompts] [Error: MutationDelete] Mutation Error: Delete Prompt", err)
      setLocalError("Failed to delete prompt.")
      apolloRefetchPromptsList()
    },
  })

  const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
    onCompleted: data => {
      if (data?.snapshotPrompt) {
        if (selectedId === data.snapshotPrompt.id) {
          selectPrompt(selectedId)
        } else {
          setPrompts(prevPrompts =>
            prevPrompts.map(p =>
              p.id === data.snapshotPrompt.id ? { ...p, updatedAt: data.snapshotPrompt.updatedAt } : p
            )
          )
        }
      }
    },
    onError: err => {
      console.error("[usePersonalPrompts] [Error: MutationSnapshot] Mutation Error: Snapshot Prompt", err)
      setLocalError("Failed to save version.")
      if (selectedId) selectPrompt(selectedId)
    },
  })

  const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
    onCompleted: data => {
      if (data?.restorePromptVersion) {
        if (selectedId === data.restorePromptVersion.id) {
          selectPrompt(selectedId)
        } else {
          setPrompts(prevPrompts =>
            prevPrompts.map(p =>
              p.id === data.restorePromptVersion.id ? { ...p, updatedAt: new Date().toISOString() } : p
            )
          )
        }
      }
    },
    onError: err => {
      console.error(
        "[usePersonalPrompts] [Error: MutationRestore] Mutation Error: Restore Prompt Version",
        err
      )
      setLocalError("Failed to restore version.")
      if (selectedId) selectPrompt(selectedId)
    },
  })

  useEffect(() => {
    const isLoadingListForLibrary = listLoading && selectedId === null
    setLocalLoading(isLoadingListForLibrary || (detailsLoading && !!selectedId))
  }, [listLoading, detailsLoading, selectedId])

  useEffect(() => {
    if (listError) {
      setLocalError(listError.message)
    }
  }, [listError])

  const createPrompt = useCallback(async (): Promise<Prompt | undefined> => {
    setLocalError(null)
    try {
      const defaultPrompt = {
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
        variables: { input: defaultPrompt },
      })

      if (data?.createPrompt) {
        return data.createPrompt as Prompt
      }
    } catch (err: any) {
      console.error("[usePersonalPrompts] [Error: CreateGraphQL] Error creating prompt via GraphQL:", err)
      setLocalError("Failed to create prompt.")
    }
    return undefined
  }, [createPromptMutation])

  const updatePrompt = useCallback(
    (
      id: string,
      updates: Partial<Omit<Prompt, "id" | "createdAt" | "updatedAt" | "user" | "project" | "versions">>
    ) => {
      setLocalError(null)
      setPrompts(prev => {
        const updatedPrompts = prev.map(p =>
          p.id === id
            ? {
                ...p,
                ...updates,
                updatedAt: new Date().toISOString(),
                content: updates.content
                  ? (updates.content && Array.isArray(updates.content) ? updates.content : []) as Block[]
                  : p.content,
                variables: updates.variables
                  ? (updates.variables.map(v => ({ ...v, id: v.id || cuid("patch-var-") })) as PromptVariable[])
                  : p.variables,
              }
            : p
        )
        const sorted = [...updatedPrompts].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        if (id === selectedId) {
          const updatedSelectedPrompt = sorted.find(p => p.id === id)
          if (updatedSelectedPrompt) {
            lastDetailedPromptData.current = updatedSelectedPrompt
          }
        }
        return sorted
      })

      updatePromptMutation({
        variables: { input: { id, ...updates } },
      }).catch(err => {
        setLocalError("Failed to update prompt.")
        if (selectedId) selectPrompt(selectedId)
        else apolloRefetchPromptsList()
      })
    },
    [updatePromptMutation, selectedId, selectPrompt, apolloRefetchPromptsList]
  )

  const deletePrompt = useCallback(
    (id: string) => {
      setLocalError(null)
      setPrompts(prev => prev.filter(p => p.id !== id))
      if (selectedId === id) {
        setSelectedId(null)
        lastDetailedPromptData.current = null
      }

      deletePromptMutation({ variables: { id } }).catch(err => {
        setLocalError("Failed to delete prompt.")
        apolloRefetchPromptsList()
      })
    },
    [selectedId, deletePromptMutation, apolloRefetchPromptsList]
  )

  const snapshotPrompt = useCallback(
    (promptId: string, notes?: string) => {
      setLocalError(null)
      snapshotPromptMutation({
        variables: {
          input: { promptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` },
        },
      }).catch(err => {
        setLocalError("Failed to save version.")
        if (selectedId) selectPrompt(selectedId)
      })
    },
    [snapshotPromptMutation, selectedId, selectPrompt]
  )

  const restorePromptVersion = useCallback(
    (promptId: string, versionId: string) => {
      setLocalError(null)
      restorePromptVersionMutation({
        variables: { input: { promptId, versionId } },
      }).catch(err => {
        setLocalError("Failed to restore version.")
        if (selectedId) selectPrompt(selectedId)
      })
    },
    [restorePromptVersionMutation, selectedId, selectPrompt]
  )

  const selectedPrompt = useMemo(() => {
    const foundPrompt = prompts.find(p => p.id === selectedId) || null
    if (foundPrompt && foundPrompt.id === lastDetailedPromptData.current?.id) {
      return lastDetailedPromptData.current
    }
    return foundPrompt
  }, [prompts, selectedId])

  return {
    prompts,
    selectedPrompt,
    loading: localLoading,
    error: localError,
    createPrompt,
    updatePrompt,
    deletePrompt,
    snapshotPrompt,
    restorePromptVersion,
    selectPrompt,
    refetchPromptsList: apolloRefetchPromptsList,
    triggerInitialPromptsFetch,
  }
}
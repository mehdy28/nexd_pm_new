import { useQuery, useMutation, NetworkStatus } from "@apollo/client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useDebounce } from "use-debounce"
import { GET_MY_WhiteboardS, GET_WHITEBOARD_DETAILS } from "@/graphql/queries/personal/personalWhiteboards"
import {
  CREATE_PERSONAL_Whiteboard,
  UPDATE_Whiteboard,
  DELETE_Whiteboard,
  DELETE_MANY_WhiteboardS,
} from "@/graphql/mutations/personal/personalWhiteboards"

type JsonScalar = any

export type WhiteboardListItem = {
  id: string
  title: string
  updatedAt: string
  data: JsonScalar
  thumbnail: string | null
  projectId: string | null
}

export type WhiteboardDetails = {
  id: string
  title: string
  data: JsonScalar
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

type CreatePersonalWhiteboardInput = {
  title: string
  data: JsonScalar
  thumbnail?: string | null
}

type UpdateWhiteboardInput = {
  id: string
  title?: string
  data?: JsonScalar
  thumbnail?: string | null
}

export const usePersonalWhiteboards = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 500)

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_MY_WhiteboardS, {
    variables: {
      search: debouncedSearch,
      skip: (page - 1) * pageSize,
      take: pageSize,
    },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  })

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  const Whiteboards = useMemo(() => data?.getMyWhiteboards?.Whiteboards || [], [data])
  const totalCount = useMemo(() => data?.getMyWhiteboards?.totalCount || 0, [data])

  const refetchQueries = [
    {
      query: GET_MY_WhiteboardS,
      variables: { search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
    },
  ]

  const [createWhiteboardMutation] = useMutation(CREATE_PERSONAL_Whiteboard, { refetchQueries })
  const [updateWhiteboardMutation] = useMutation(UPDATE_Whiteboard, { refetchQueries })
  const [deleteWhiteboardMutation] = useMutation(DELETE_Whiteboard, { refetchQueries })
  
  const [deleteManyWhiteboardMutation] = useMutation(DELETE_MANY_WhiteboardS, {
    refetchQueries,
  })

  const createWhiteboard = useCallback(
    async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      const { data } = await createWhiteboardMutation({
        variables: { input: { title, data: initialData, thumbnail } },
      })
      return data?.createPersonalWhiteboard
    },
    [createWhiteboardMutation]
  )

  const updateWhiteboard = useCallback(
    async (id: string, updates: Omit<UpdateWhiteboardInput, "id">) => {
      const { data } = await updateWhiteboardMutation({ variables: { input: { id, ...updates } } })
      return data?.updateWhiteboard
    },
    [updateWhiteboardMutation]
  )

  const deleteWhiteboard = useCallback(
    async (id: string) => {
      const { data } = await deleteWhiteboardMutation({ variables: { id } })
      return data?.deleteWhiteboard
    },
    [deleteWhiteboardMutation]
  )

  const deleteManyPersonalWhiteboards = useCallback(
    async (ids: string[]) => {
      const { data } = await deleteManyWhiteboardMutation({ variables: { ids } })
      return data?.deleteManyWhiteboards
    },
    [deleteManyWhiteboardMutation]
  )

  return {
    Whiteboards,
    totalCount,
    loading: loading || networkStatus === NetworkStatus.refetch,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetch,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    deleteManyPersonalWhiteboards,
  }
}

export const useWhiteboardDetails = (WhiteboardId: string | null) => {
  const { data, loading, error, refetch } = useQuery<{ getWhiteboardDetails: WhiteboardDetails }>(
    GET_WHITEBOARD_DETAILS,
    {
      variables: { id: WhiteboardId! },
      skip: !WhiteboardId,
      fetchPolicy: "network-only",
    }
  )

  return {
    Whiteboard: data?.getWhiteboardDetails,
    loading,
    error,
    refetch,
  }
}
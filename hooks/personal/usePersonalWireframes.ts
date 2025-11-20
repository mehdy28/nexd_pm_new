//hooks/personal/usePersonalWireframes.ts
import { useQuery, useMutation, NetworkStatus } from "@apollo/client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useDebounce } from "use-debounce"
import { GET_MY_WIREFRAMES, GET_WIREFRAME_DETAILS } from "@/graphql/queries/personal/personalWireframes"
import {
  CREATE_PERSONAL_WIREFRAME,
  UPDATE_WIREFRAME,
  DELETE_WIREFRAME,
} from "@/graphql/mutations/personal/personalWireframes"

type JsonScalar = any

export type WireframeListItem = {
  id: string
  title: string
  updatedAt: string
  data: JsonScalar // <-- CHANGED THIS LINE (removed ?)
  thumbnail: string | null
  projectId: string | null // Can be null for personal wireframes
}

export type WireframeDetails = {
  id: string
  title: string
  data: JsonScalar
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

type CreatePersonalWireframeInput = {
  title: string
  data: JsonScalar
  thumbnail?: string | null
}

type UpdateWireframeInput = {
  id: string
  title?: string
  data?: JsonScalar
  thumbnail?: string | null
}

export const usePersonalWireframes = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 500)

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_MY_WIREFRAMES, {
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

  const wireframes = useMemo(() => data?.getMyWireframes?.wireframes || [], [data])
  const totalCount = useMemo(() => data?.getMyWireframes?.totalCount || 0, [data])

  const refetchQueries = [
    {
      query: GET_MY_WIREFRAMES,
      variables: { search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
    },
  ]

  const [createWireframeMutation] = useMutation(CREATE_PERSONAL_WIREFRAME, { refetchQueries })
  const [updateWireframeMutation] = useMutation(UPDATE_WIREFRAME, { refetchQueries })
  const [deleteWireframeMutation] = useMutation(DELETE_WIREFRAME, { refetchQueries })

  const createWireframe = useCallback(
    async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      const { data } = await createWireframeMutation({
        variables: { input: { title, data: initialData, thumbnail } },
      })
      return data?.createPersonalWireframe
    },
    [createWireframeMutation]
  )

  const updateWireframe = useCallback(
    async (id: string, updates: Omit<UpdateWireframeInput, "id">) => {
      const { data } = await updateWireframeMutation({ variables: { input: { id, ...updates } } })
      return data?.updateWireframe
    },
    [updateWireframeMutation]
  )

  const deleteWireframe = useCallback(
    async (id: string) => {
      const { data } = await deleteWireframeMutation({ variables: { id } })
      return data?.deleteWireframe
    },
    [deleteWireframeMutation]
  )

  return {
    wireframes,
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
    createWireframe,
    updateWireframe,
    deleteWireframe,
  }
}

export const useWireframeDetails = (wireframeId: string | null) => {
  const { data, loading, error, refetch } = useQuery<{ getWireframeDetails: WireframeDetails }>(
    GET_WIREFRAME_DETAILS,
    {
      variables: { id: wireframeId! },
      skip: !wireframeId,
      fetchPolicy: "network-only",
    }
  )

  return {
    wireframe: data?.getWireframeDetails,
    loading,
    error,
    refetch,
  }
}
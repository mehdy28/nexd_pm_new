import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, NetworkStatus } from "@apollo/client"
import type { Block } from "@blocknote/core"
import { useDebounce } from "use-debounce"

import { GET_MY_DOCUMENTS, GET_DOCUMENT_DETAILS } from "@/graphql/queries/personal/personalDocuments"
import {
  CREATE_PERSONAL_DOCUMENT,
  UPDATE_DOCUMENT,
  DELETE_DOCUMENT,
} from "@/graphql/mutations/personal/personalDocuments"

export interface PersonalDocument {
  id: string
  title: string
  updatedAt: number
  content: Block[] | null
  dataUrl: string | null
  type: "doc" | "pdf"
  projectId: string | null
}

type HookProvidedState = {
  documents: PersonalDocument[]
  totalCount: number
  selectedDocument: PersonalDocument | null
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  search: string
}

interface UsePersonalDocumentsHook extends HookProvidedState {
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearch: (search: string) => void
  createPersonalDocument: (
    title: string,
    initialContent?: Block[]
  ) => Promise<PersonalDocument | undefined>
  createPdfFromDataUrl: (dataUrl: string, name: string) => Promise<PersonalDocument | undefined>
  updatePersonalDocument: (
    id: string,
    updates: Partial<Omit<PersonalDocument, "id" | "type" | "projectId">>
  ) => void
  deletePersonalDocument: (id: string) => void
  selectDocument: (id: string | null) => void
  refetchDocumentsList: () => Promise<any>
}

export function usePersonalDocuments(): UsePersonalDocumentsHook {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 500)

  const {
    data: documentsListData,
    loading: listLoading,
    error: listError,
    refetch: refetchDocumentsList,
    networkStatus,
  } = useQuery(GET_MY_DOCUMENTS, {
    variables: {
      search: debouncedSearch,
      skip: (page - 1) * pageSize,
      take: pageSize,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  })

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  const documents = useMemo(() => {
    return (
      documentsListData?.getMyDocuments.documents.map((doc: any) => ({
        ...doc,
        updatedAt: new Date(doc.updatedAt).getTime(),
      })) || []
    )
  }, [documentsListData])

  const totalCount = useMemo(() => {
    return documentsListData?.getMyDocuments.totalCount || 0
  }, [documentsListData])

  const { data: documentDetailsData, loading: detailsLoading } = useQuery(GET_DOCUMENT_DETAILS, {
    variables: { id: selectedId },
    skip: !selectedId,
    fetchPolicy: "network-only",
  })

  const selectedDocument = useMemo(() => {
    if (!selectedId) return null
    if (documentDetailsData?.getDocumentDetails) {
      const details = documentDetailsData.getDocumentDetails
      return {
        ...details,
        content: details.content,
        dataUrl: details.dataUrl,
        updatedAt: new Date(details.updatedAt).getTime(),
        type: details.content ? "doc" : "pdf",
      }
    }
    return documents.find(doc => doc.id === selectedId) || null
  }, [selectedId, documentDetailsData, documents])

  const [createDocumentMutation] = useMutation(CREATE_PERSONAL_DOCUMENT, {
    onCompleted: data => {
      if (data?.createPersonalDocument) {
        selectDocument(data.createPersonalDocument.id)
      }
    },
    refetchQueries: [
      {
        query: GET_MY_DOCUMENTS,
        variables: { search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
      },
    ],
  })

  const [updateDocumentMutation] = useMutation(UPDATE_DOCUMENT)

  const [deleteDocumentMutation] = useMutation(DELETE_DOCUMENT, {
    onCompleted: data => {
      if (selectedId === data?.deleteDocument.id) {
        selectDocument(null)
      }
    },
    refetchQueries: [
      {
        query: GET_MY_DOCUMENTS,
        variables: { search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
      },
    ],
  })

  const selectDocument = useCallback((id: string | null) => setSelectedId(id), [])

  const createPersonalDocument = useCallback(
    async (title: string, initialContent: Block[] = []) => {
      const { data } = await createDocumentMutation({
        variables: { input: { title, content: initialContent, dataUrl: null } },
      })
      return data?.createPersonalDocument
    },
    [createDocumentMutation]
  )

  const createPdfFromDataUrl = useCallback(
    async (dataUrl: string, name: string) => {
      const { data } = await createDocumentMutation({
        variables: { input: { title: name, dataUrl, content: null } },
      })
      return data?.createPersonalDocument
    },
    [createDocumentMutation]
  )

  const updatePersonalDocument = useCallback(
    (id: string, updates: any) => {
      updateDocumentMutation({ variables: { input: { id, ...updates } } })
    },
    [updateDocumentMutation]
  )

  const deletePersonalDocument = useCallback(
    (id: string) => {
      deleteDocumentMutation({ variables: { id } })
    },
    [deleteDocumentMutation]
  )

  const loading = listLoading || detailsLoading || networkStatus === NetworkStatus.refetch

  return {
    documents,
    totalCount,
    selectedDocument,
    loading,
    error: listError?.message || localError,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    createPersonalDocument,
    createPdfFromDataUrl,
    updatePersonalDocument,
    deletePersonalDocument,
    selectDocument,
    refetchDocumentsList,
  }
}
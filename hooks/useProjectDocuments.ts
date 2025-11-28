import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, NetworkStatus, gql } from "@apollo/client"
import type { Block } from "@blocknote/core"
import { useDebounce } from "use-debounce"

import {
  GET_PROJECT_DOCUMENTS
} from "@/graphql/queries/documents"
import { 
  CREATE_DOCUMENT, 
  UPDATE_DOCUMENT, 
  DELETE_DOCUMENT,
  DELETE_MANY_DOCUMENTS 
} from "@/graphql/mutations/documents"
import { GET_DOCUMENT_DETAILS_WITH_COMMENTS } from "@/graphql/queries/personal/personalDocuments"

export interface CommentAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  avatar?: string | null 
  avatarColor?: string | null 
}

export interface DocumentComment {
  id: string
  content: string
  createdAt: string
  author: CommentAuthor
}

export interface ProjectDocument {
  id: string
  title: string
  updatedAt: number
  content: Block[] | null
  dataUrl: string | null
  type: "doc" | "pdf"
  projectId: string
  comments: DocumentComment[] 
}

type HookProvidedState = {
  documents: ProjectDocument[]
  totalCount: number
  selectedDocument: ProjectDocument | null
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  search: string
}

interface UseProjectDocumentsHook extends HookProvidedState {
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearch: (search: string) => void
  createProjectDocument: (title: string, initialContent?: Block[]) => Promise<ProjectDocument | undefined>
  createPdfFromDataUrl: (dataUrl: string, name: string) => Promise<ProjectDocument | undefined>
  updateProjectDocument: (id: string, updates: Partial<Omit<ProjectDocument, "id" | "type" | "projectId" | "comments">>) => void
  deleteProjectDocument: (id: string) => void
  deleteManyProjectDocuments: (ids: string[]) => void
  selectDocument: (id: string | null) => void
  refetchDocumentsList: () => Promise<any>
}

export function useProjectDocuments(projectId: string): UseProjectDocumentsHook {
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
  } = useQuery(GET_PROJECT_DOCUMENTS, {
    variables: {
      projectId,
      search: debouncedSearch,
      skip: (page - 1) * pageSize,
      take: pageSize,
    },
    skip: !projectId,
    fetchPolicy: "network-only", 
    notifyOnNetworkStatusChange: true,
  })

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  const documents = useMemo(() => {
    return (
      documentsListData?.getProjectDocuments.documents.map((doc: any) => ({
        ...doc,
        updatedAt: new Date(doc.updatedAt).getTime(),
        comments: [],
        type: doc.content ? "doc" : (doc.dataUrl ? "pdf" : "doc"), 
      })) || []
    )
  }, [documentsListData])

  const totalCount = useMemo(() => {
    return documentsListData?.getProjectDocuments.totalCount || 0
  }, [documentsListData])

  const { data: documentDetailsData, loading: detailsLoading } = useQuery(
    GET_DOCUMENT_DETAILS_WITH_COMMENTS, 
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only",
    },
  )

  const selectedDocument = useMemo(() => {
    if (!selectedId) return null
    if (documentDetailsData?.getDocumentDetails) {
      const details = documentDetailsData.getDocumentDetails
      
      const processedContent =
        details.content && Array.isArray(details.content) && details.content.length > 0
          ? details.content
          : (details.type === "doc" ? [{ type: "paragraph", content: [] }] : null)

      return {
        ...details,
        content: processedContent,
        dataUrl: details.dataUrl,
        updatedAt: new Date(details.updatedAt).getTime(),
        type: details.type || (details.content ? "doc" : "pdf"),
        comments: details.comments || [],
      } as ProjectDocument 
    }
    
    const docFromList = documents.find(doc => doc.id === selectedId)
    if (docFromList) {
        return {
            ...docFromList,
            content: null, 
            dataUrl: null, 
            comments: [], 
        } as ProjectDocument
    }
    
    return null
  }, [selectedId, documentDetailsData, documents])

  const refetchVars = useMemo(() => ({
    projectId,
    search: debouncedSearch,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }), [projectId, debouncedSearch, page, pageSize]);


  const [createDocumentMutation] = useMutation(CREATE_DOCUMENT, {
    onCompleted: data => {
      if (data?.createDocument) {
        selectDocument(data.createDocument.id)
      }
    },
    refetchQueries: [{ query: GET_PROJECT_DOCUMENTS, variables: refetchVars }],
  })

  const [updateDocumentMutation] = useMutation(UPDATE_DOCUMENT, {
    refetchQueries: (mutationResult) => {
      const updatedDocumentId = mutationResult.data?.updateDocument?.id;
      if (!updatedDocumentId) return [];
      return [
        {
          query: GET_DOCUMENT_DETAILS_WITH_COMMENTS, 
          variables: { id: updatedDocumentId },
        },
        {
          query: GET_PROJECT_DOCUMENTS,
          variables: refetchVars,
        },
      ];
    },
  })

  const [deleteDocumentMutation] = useMutation(DELETE_DOCUMENT, {
    onCompleted: data => {
      if (selectedId === data?.deleteDocument.id) {
        selectDocument(null)
      }
    },
    refetchQueries: [{ query: GET_PROJECT_DOCUMENTS, variables: refetchVars }],
  })

  const [deleteManyDocumentMutation] = useMutation(DELETE_MANY_DOCUMENTS, {
    onCompleted: () => {
      // If selected doc is among deleted, clear selection (handled by parent or UI state)
      // Refetch handles list update
    },
    refetchQueries: [{ query: GET_PROJECT_DOCUMENTS, variables: refetchVars }],
  })

  const selectDocument = useCallback((id: string | null) => setSelectedId(id), [])

  const createProjectDocument = useCallback(
    async (title: string, initialContent: Block[] = []) => {
      if (!projectId) return undefined
      const { data } = await createDocumentMutation({
        variables: { input: { projectId, title, content: initialContent, dataUrl: null, type: "doc" } }, 
      })
      return data?.createDocument
    },
    [projectId, createDocumentMutation],
  )

  const createPdfFromDataUrl = useCallback(
    async (dataUrl: string, name: string) => {
      if (!projectId) return undefined
      const { data } = await createDocumentMutation({
        variables: { input: { projectId, title: name, dataUrl, content: null, type: "pdf" } }, 
      })
      return data?.createDocument
    },
    [projectId, createDocumentMutation],
  )

  const updateProjectDocument = useCallback(
    (id: string, updates: any) => {
      updateDocumentMutation({ variables: { input: { id, ...updates } } })
    },
    [updateDocumentMutation],
  )

  const deleteProjectDocument = useCallback(
    (id: string) => {
      deleteDocumentMutation({ variables: { id } })
    },
    [deleteDocumentMutation],
  )

  const deleteManyProjectDocuments = useCallback(
    (ids: string[]) => {
      deleteManyDocumentMutation({ variables: { ids } })
    },
    [deleteManyDocumentMutation]
  )

  const loading = listLoading || detailsLoading || networkStatus === NetworkStatus.refetch

  return {
    documents: documents as ProjectDocument[],
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
    createProjectDocument,
    createPdfFromDataUrl,
    updateProjectDocument,
    deleteProjectDocument,
    deleteManyProjectDocuments,
    selectDocument,
    refetchDocumentsList,
  }
}
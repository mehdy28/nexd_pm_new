// hooks/useProjectDocuments.ts

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, NetworkStatus, gql } from "@apollo/client"
import type { Block } from "@blocknote/core"
import { useDebounce } from "use-debounce"

// We must ensure we fetch details *with comments* to support the editor view.
// Assuming a new query or an updated existing query handles this.
import {
  GET_PROJECT_DOCUMENTS
} from "@/graphql/queries/documents"
import { CREATE_DOCUMENT, UPDATE_DOCUMENT, DELETE_DOCUMENT } from "@/graphql/mutations/documents"
import { GET_DOCUMENT_DETAILS_WITH_COMMENTS } from "@/graphql/queries/personal/personalDocuments"


// Replicating Comment types from usePersonalDocuments for compatibility
export interface CommentAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  avatar?: string | null // Optional based on usePersonalDocuments
  avatarColor?: string | null // Added avatarColor
}

export interface DocumentComment {
  id: string
  content: string
  createdAt: string
  author: CommentAuthor
}

// Updated ProjectDocument to include comments and reflect the expected structure
export interface ProjectDocument {
  id: string
  title: string
  updatedAt: number
  content: Block[] | null
  dataUrl: string | null
  type: "doc" | "pdf"
  projectId: string
  comments: DocumentComment[] // ADDED comments array
}

// Omit functions that will be provided by the hook itself.
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
  updateProjectDocument: (id: string, updates: Partial<Omit<ProjectDocument, "id" | "type" | "projectId" | "comments">> /* Exclude comments from direct updates */) => void
  deleteProjectDocument: (id: string) => void
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
    fetchPolicy: "network-only", // Changed to network-only like the personal hook
    notifyOnNetworkStatusChange: true,
  })

  // Reset to page 1 when search or page size changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  const documents = useMemo(() => {
    return (
      documentsListData?.getProjectDocuments.documents.map((doc: any) => ({
        ...doc,
        updatedAt: new Date(doc.updatedAt).getTime(),
        // Ensure list items are cast correctly, although they won't have content/comments initially
        comments: [],
        type: doc.content ? "doc" : (doc.dataUrl ? "pdf" : "doc"), // Infer type if not explicitly provided by list API
      })) || []
    )
  }, [documentsListData])

  const totalCount = useMemo(() => {
    return documentsListData?.getProjectDocuments.totalCount || 0
  }, [documentsListData])

  const { data: documentDetailsData, loading: detailsLoading } = useQuery(
    GET_DOCUMENT_DETAILS_WITH_COMMENTS, // Use the query that fetches comments
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
      } as ProjectDocument // Assert type with comments
    }
    
    // Fallback to list data while details are loading
    const docFromList = documents.find(doc => doc.id === selectedId)
    if (docFromList) {
        return {
            ...docFromList,
            content: null, // Clear content while details load
            dataUrl: null, // Clear dataUrl while details load
            comments: [], // Clear comments while details load
        } as ProjectDocument
    }
    
    return null
  }, [selectedId, documentDetailsData, documents])

  // Mutation Refetch Variables definition
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
          query: GET_DOCUMENT_DETAILS_WITH_COMMENTS, // Refetch details with comments
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

  // Exposed functions
  const selectDocument = useCallback((id: string | null) => setSelectedId(id), [])

  const createProjectDocument = useCallback(
    async (title: string, initialContent: Block[] = []) => {
      if (!projectId) return undefined
      const { data } = await createDocumentMutation({
        variables: { input: { projectId, title, content: initialContent, dataUrl: null, type: "doc" } }, // Ensure 'type' is passed if needed by backend
      })
      return data?.createDocument
    },
    [projectId, createDocumentMutation],
  )

  const createPdfFromDataUrl = useCallback(
    async (dataUrl: string, name: string) => {
      if (!projectId) return undefined
      const { data } = await createDocumentMutation({
        variables: { input: { projectId, title: name, dataUrl, content: null, type: "pdf" } }, // Ensure 'type' is passed if needed by backend
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
    selectDocument,
    refetchDocumentsList,
  }
}
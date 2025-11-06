// // hooks/useProjectDocuments.ts

// import { useState, useEffect, useCallback, useMemo } from "react"
// import { useQuery, useMutation, NetworkStatus } from "@apollo/client"
// import type { Block } from "@blocknote/core"
// import { useDebounce } from "use-debounce"

// import { GET_PROJECT_DOCUMENTS, GET_DOCUMENT_DETAILS } from "@/graphql/queries/documents"
// import { CREATE_DOCUMENT, UPDATE_DOCUMENT, DELETE_DOCUMENT } from "@/graphql/mutations/documents"

// export interface ProjectDocument {
//   id: string
//   title: string
//   updatedAt: number
//   content: Block[] | null
//   dataUrl: string | null
//   type: "doc" | "pdf"
//   projectId: string
// }

// // Omit functions that will be provided by the hook itself.
// type HookProvidedState = {
//   documents: ProjectDocument[]
//   totalCount: number
//   selectedDocument: ProjectDocument | null
//   loading: boolean
//   error: string | null
//   page: number
//   pageSize: number
//   search: string
// }

// interface UseProjectDocumentsHook extends HookProvidedState {
//   setPage: (page: number) => void
//   setPageSize: (size: number) => void
//   setSearch: (search: string) => void
//   createProjectDocument: (title: string, initialContent?: Block[]) => Promise<ProjectDocument | undefined>
//   createPdfFromDataUrl: (dataUrl: string, name: string) => Promise<ProjectDocument | undefined>
//   updateProjectDocument: (id: string, updates: Partial<Omit<ProjectDocument, "id" | "type" | "projectId">>) => void
//   deleteProjectDocument: (id: string) => void
//   selectDocument: (id: string | null) => void
//   refetchDocumentsList: () => Promise<any>
// }

// export function useProjectDocuments(projectId: string): UseProjectDocumentsHook {
//   const [selectedId, setSelectedId] = useState<string | null>(null)
//   const [localError, setLocalError] = useState<string | null>(null)
//   const [page, setPage] = useState(1)
//   const [pageSize, setPageSize] = useState(12)
//   const [search, setSearch] = useState("")
//   const [debouncedSearch] = useDebounce(search, 500)

//   const {
//     data: documentsListData,
//     loading: listLoading,
//     error: listError,
//     refetch: refetchDocumentsList,
//     networkStatus,
//   } = useQuery(GET_PROJECT_DOCUMENTS, {
//     variables: {
//       projectId,
//       search: debouncedSearch,
//       skip: (page - 1) * pageSize,
//       take: pageSize,
//     },
//     skip: !projectId,
//     fetchPolicy: "cache-and-network",
//     notifyOnNetworkStatusChange: true,
//   })

//   // Reset to page 1 when search or page size changes
//   useEffect(() => {
//     setPage(1)
//   }, [debouncedSearch, pageSize])
  
//   const documents = useMemo(() => {
//     return (
//       documentsListData?.getProjectDocuments.documents.map((doc: any) => ({
//         ...doc,
//         updatedAt: new Date(doc.updatedAt).getTime(),
//       })) || []
//     )
//   }, [documentsListData])

//   const totalCount = useMemo(() => {
//     return documentsListData?.getProjectDocuments.totalCount || 0
//   }, [documentsListData])

//   const { data: documentDetailsData, loading: detailsLoading } = useQuery(GET_DOCUMENT_DETAILS, {
//     variables: { id: selectedId },
//     skip: !selectedId,
//     fetchPolicy: "network-only",
//   })

//   const selectedDocument = useMemo(() => {
//     if (!selectedId) return null
//     if (documentDetailsData?.getDocumentDetails) {
//       const details = documentDetailsData.getDocumentDetails
//       return {
//         ...details,
//         content: details.content,
//         dataUrl: details.dataUrl,
//         updatedAt: new Date(details.updatedAt).getTime(),
//         type: details.content ? "doc" : "pdf",
//       }
//     }
//     // Fallback to list data while details are loading
//     return documents.find(doc => doc.id === selectedId) || null
//   }, [selectedId, documentDetailsData, documents])

//   // Mutations (simplified as they largely just need to refetch the main query)
//   const [createDocumentMutation] = useMutation(CREATE_DOCUMENT, {
//     onCompleted: data => {
//       if (data?.createDocument) {
//         selectDocument(data.createDocument.id)
//       }
//     },
//     refetchQueries: [
//         {
//             query: GET_PROJECT_DOCUMENTS,
//             variables: { projectId, search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize }
//         }
//     ],
//   })

//   const [updateDocumentMutation] = useMutation(UPDATE_DOCUMENT)
//   const [deleteDocumentMutation] = useMutation(DELETE_DOCUMENT, {
//     onCompleted: data => {
//       if (selectedId === data?.deleteDocument.id) {
//         selectDocument(null)
//       }
//     },
//     refetchQueries: [
//         {
//             query: GET_PROJECT_DOCUMENTS,
//             variables: { projectId, search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize }
//         }
//     ],
//   })

//   // Exposed functions
//   const selectDocument = useCallback((id: string | null) => setSelectedId(id), [])
  
//   const createProjectDocument = useCallback(async (title: string, initialContent: Block[] = []) => {
//       if (!projectId) return undefined
//       const { data } = await createDocumentMutation({
//         variables: { input: { projectId, title, content: initialContent, dataUrl: null } },
//       })
//       return data?.createDocument
//   }, [projectId, createDocumentMutation])

//   const createPdfFromDataUrl = useCallback(async (dataUrl: string, name: string) => {
//       if (!projectId) return undefined
//       const { data } = await createDocumentMutation({
//         variables: { input: { projectId, title: name, dataUrl, content: null } },
//       })
//       return data?.createDocument
//   }, [projectId, createDocumentMutation])

//   const updateProjectDocument = useCallback((id: string, updates: any) => {
//       updateDocumentMutation({ variables: { input: { id, ...updates } } })
//   }, [updateDocumentMutation])

//   const deleteProjectDocument = useCallback((id: string) => {
//       deleteDocumentMutation({ variables: { id } })
//   }, [deleteDocumentMutation])

//   const loading = listLoading || detailsLoading || networkStatus === NetworkStatus.refetch
  
//   return {
//     documents,
//     totalCount,
//     selectedDocument,
//     loading,
//     error: listError?.message || localError,
//     page,
//     setPage,
//     pageSize,
//     setPageSize,
//     search,
//     setSearch,
//     createProjectDocument,
//     createPdfFromDataUrl,
//     updateProjectDocument,
//     deleteProjectDocument,
//     selectDocument,
//     refetchDocumentsList,
//   }
// }

// hooks/useProjectDocuments.ts

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, NetworkStatus } from "@apollo/client"
import type { Block } from "@blocknote/core"
import { useDebounce } from "use-debounce"

import { GET_PROJECT_DOCUMENTS, GET_DOCUMENT_DETAILS } from "@/graphql/queries/documents"
import { CREATE_DOCUMENT, UPDATE_DOCUMENT, DELETE_DOCUMENT } from "@/graphql/mutations/documents"

export interface ProjectDocument {
  id: string
  title: string
  updatedAt: number
  content: Block[] | null
  dataUrl: string | null
  type: "doc" | "pdf"
  projectId: string
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
  updateProjectDocument: (id: string, updates: Partial<Omit<ProjectDocument, "id" | "type" | "projectId">>) => void
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
    fetchPolicy: "cache-and-network",
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
      })) || []
    )
  }, [documentsListData])

  const totalCount = useMemo(() => {
    return documentsListData?.getProjectDocuments.totalCount || 0
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
    // Fallback to list data while details are loading
    return documents.find(doc => doc.id === selectedId) || null
  }, [selectedId, documentDetailsData, documents])

  // Mutations (simplified as they largely just need to refetch the main query)
  const [createDocumentMutation] = useMutation(CREATE_DOCUMENT, {
    onCompleted: data => {
      if (data?.createDocument) {
        selectDocument(data.createDocument.id)
      }
    },
    refetchQueries: [
      {
        query: GET_PROJECT_DOCUMENTS,
        variables: { projectId, search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
      },
    ],
  })

  // FIX: Added refetchQueries to the update mutation to prevent stale cache.
  const [updateDocumentMutation] = useMutation(UPDATE_DOCUMENT, {
    refetchQueries: (mutationResult) => {
      const updatedDocumentId = mutationResult.data?.updateDocument?.id;
      if (!updatedDocumentId) return [];
      return [
        {
          query: GET_DOCUMENT_DETAILS,
          variables: { id: updatedDocumentId },
        },
        {
          query: GET_PROJECT_DOCUMENTS,
          variables: { projectId, search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
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
    refetchQueries: [
      {
        query: GET_PROJECT_DOCUMENTS,
        variables: { projectId, search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
      },
    ],
  })

  // Exposed functions
  const selectDocument = useCallback((id: string | null) => setSelectedId(id), [])

  const createProjectDocument = useCallback(
    async (title: string, initialContent: Block[] = []) => {
      if (!projectId) return undefined
      const { data } = await createDocumentMutation({
        variables: { input: { projectId, title, content: initialContent, dataUrl: null } },
      })
      return data?.createDocument
    },
    [projectId, createDocumentMutation],
  )

  const createPdfFromDataUrl = useCallback(
    async (dataUrl: string, name: string) => {
      if (!projectId) return undefined
      const { data } = await createDocumentMutation({
        variables: { input: { projectId, title: name, dataUrl, content: null } },
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
    createProjectDocument,
    createPdfFromDataUrl,
    updateProjectDocument,
    deleteProjectDocument,
    selectDocument,
    refetchDocumentsList,
  }
}
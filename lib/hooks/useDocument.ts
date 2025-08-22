"use client"

import { useQuery, useMutation } from "@apollo/client"
import { gql } from "@apollo/client"

const GET_DOCUMENTS = gql`
  query GetDocuments($projectId: ID, $userId: ID, $personal: Boolean) {
    documents(projectId: $projectId, userId: $userId, personal: $personal) {
      id
      title
      type
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
    }
  }
`

const GET_DOCUMENT = gql`
  query GetDocument($id: ID!) {
    document(id: $id) {
      id
      title
      content
      type
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
      comments {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
      }
    }
  }
`

const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      id
      title
      content
      type
      createdAt
    }
  }
`

const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
    updateDocument(id: $id, input: $input) {
      id
      title
      content
      type
      updatedAt
    }
  }
`

const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`

export function useDocuments(projectId?: string, userId?: string, personal?: boolean) {
  const { data, loading, error, refetch } = useQuery(GET_DOCUMENTS, {
    variables: { projectId, userId, personal },
  })

  return {
    documents: data?.documents || [],
    loading,
    error,
    refetch,
  }
}

export function useDocument(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_DOCUMENT, {
    variables: { id },
    skip: !id,
  })

  return {
    document: data?.document,
    loading,
    error,
    refetch,
  }
}

export function useCreateDocument() {
  const [createDocument, { loading, error }] = useMutation(CREATE_DOCUMENT)

  return {
    createDocument,
    loading,
    error,
  }
}

export function useUpdateDocument() {
  const [updateDocument, { loading, error }] = useMutation(UPDATE_DOCUMENT)

  return {
    updateDocument,
    loading,
    error,
  }
}

export function useDeleteDocument() {
  const [deleteDocument, { loading, error }] = useMutation(DELETE_DOCUMENT)

  return {
    deleteDocument,
    loading,
    error,
  }
}

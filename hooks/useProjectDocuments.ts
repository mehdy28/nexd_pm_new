import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams } from "next/navigation";
import type { Block } from "@blocknote/core";

import {
  GET_PROJECT_DOCUMENTS,
  GET_DOCUMENT_DETAILS,
} from "@/graphql/queries/documents";
import {
  CREATE_DOCUMENT,
  UPDATE_DOCUMENT,
  DELETE_DOCUMENT,
} from "@/graphql/mutations/documents";

export interface ProjectDocument {
  id: string;
  title: string;
  updatedAt: number;
  content: Block[] | null;
  dataUrl: string | null;
  type: "doc" | "pdf";
  projectId: string;
}

interface UseProjectDocumentsHook {
  documents: ProjectDocument[];
  selectedDocument: ProjectDocument | null;
  loading: boolean;
  error: string | null;
  createProjectDocument: (
    title: string,
    initialContent?: Block[]
  ) => Promise<ProjectDocument | undefined>;
  createPdfFromDataUrl: (
    dataUrl: string,
    name: string
  ) => Promise<ProjectDocument | undefined>;
  updateProjectDocument: (
    id: string,
    updates: Partial<Omit<ProjectDocument, "id" | "type" | "projectId">>
  ) => void;
  deleteProjectDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
  refetchDocumentsList: () => Promise<any>;
}

export function useProjectDocuments(): UseProjectDocumentsHook {
  const { id: projectId } = useParams() as { id: string };

  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // --- Callbacks for document selection (defined early due to dependencies) ---
  const selectDocument = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // 1. Query for the list of documents
  const {
    data: documentsListData,
    loading: listLoading,
    error: listError,
    refetch: refetchDocumentsList,
  } = useQuery(GET_PROJECT_DOCUMENTS, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      setLocalError(null);
      const mappedDocs: ProjectDocument[] = data.getProjectDocuments.map(
        (doc: any) => ({
          id: doc.id,
          title: doc.title,
          updatedAt: new Date(doc.updatedAt).getTime(),
          content: null, // Initial minimal state: content/dataUrl are not loaded in list query
          dataUrl: null, // Initial minimal state: content/dataUrl are not loaded in list query
          type: doc.type,
          projectId: doc.projectId,
        })
      );

      setDocuments((prevDocs) => {
        // Create a map of existing documents for quick lookup
        const prevDocsMap = new Map(prevDocs.map(doc => [doc.id, doc]));

        // Merge and update documents.
        // For documents present in the new list, update minimal info but keep full content/dataUrl if already loaded.
        // For new documents, add them.
        const mergedDocs = mappedDocs.map(newDoc => {
          const prevDoc = prevDocsMap.get(newDoc.id);
          if (prevDoc) {
            // Update minimal fields, keep loaded content/dataUrl if they exist
            return {
              ...newDoc,
              content: prevDoc.content,
              dataUrl: prevDoc.dataUrl
            };
          }
          return newDoc; // It's a new doc from the refetch
        });

        // Ensure no docs that were deleted on the server remain in local state
        const updatedDocIds = new Set(mappedDocs.map(d => d.id));
        const filteredPrevDocs = prevDocs.filter(prevDoc => updatedDocIds.has(prevDoc.id));

        // Combine and sort, preferring the more detailed mergedDocs if available
        const finalDocs = Array.from(new Set([...filteredPrevDocs, ...mergedDocs].map(d => d.id)))
          .map(id => mergedDocs.find(d => d.id === id) || filteredPrevDocs.find(d => d.id === id)) as ProjectDocument[];

        return finalDocs.sort((a, b) => b.updatedAt - a.updatedAt);
      });
    },
    onError: (err) => {
      console.error("Error fetching project documents list:", err);
      setLocalError("Failed to load documents list.");
    },
  });

  // 2. Query for full document details when one is selected
  const { data: documentDetailsData, loading: detailsLoading } = useQuery(
    GET_DOCUMENT_DETAILS,
    {
      variables: { id: selectedId },
      skip: !selectedId,
      fetchPolicy: "network-only", // Always get fresh details
      onCompleted: (data) => {
        if (data?.getDocumentDetails) {
          setLocalError(null);
          setDocuments((prevDocs) =>
            prevDocs.map((d) =>
              d.id === data.getDocumentDetails.id
                ? {
                    ...d,
                    title: data.getDocumentDetails.title,
                    content: data.getDocumentDetails.content, // This will be Block[] from backend
                    dataUrl: data.getDocumentDetails.dataUrl,
                    updatedAt: new Date(data.getDocumentDetails.updatedAt).getTime(),
                    type: data.getDocumentDetails.content ? "doc" : "pdf",
                  }
                : d
            )
          );
        }
      },
      onError: (err) => {
        console.error("Error fetching document details:", err);
        setLocalError("Failed to load document details.");
        setSelectedId(null); // Deselect if details fail to load
      },
    }
  );

  // --- Mutations for CRUD operations ---
  const [createDocumentMutation] = useMutation(CREATE_DOCUMENT, {
    update(cache, { data: { createDocument } }) {
      if (!createDocument) return;

      const existingDocsQuery = cache.readQuery<{
        getProjectDocuments: ProjectDocument[];
      }>({
        query: GET_PROJECT_DOCUMENTS,
        variables: { projectId },
      });

      if (existingDocsQuery) {
        cache.writeQuery({
          query: GET_PROJECT_DOCUMENTS,
          variables: { projectId },
          data: {
            getProjectDocuments: [
              {
                id: createDocument.id,
                title: createDocument.title,
                updatedAt: new Date(createDocument.updatedAt).getTime(),
                type: createDocument.type,
                projectId: createDocument.projectId,
                content: null, // Minimal for list, actual content is in local state and fetched on select
                dataUrl: null, // Minimal for list
                __typename: "DocumentListItem",
              },
              ...existingDocsQuery.getProjectDocuments,
            ].sort((a, b) => b.updatedAt - a.updatedAt), // Sort again
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.createDocument) {
        const newDoc: ProjectDocument = {
          id: data.createDocument.id,
          title: data.createDocument.title,
          updatedAt: new Date(data.createDocument.updatedAt).getTime(),
          content: data.createDocument.type === "doc" ? ([{
            id: "default-block-temp",
            type: "paragraph",
            props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left"
            },
            content: [],
            children: []
          }] as Block[]) : null,
          dataUrl: data.createDocument.type === "pdf" ? "" : null,
          type: data.createDocument.type,
          projectId: data.createDocument.projectId,
        };
        setDocuments((prevDocs) => [newDoc, ...prevDocs].sort((a, b) => b.updatedAt - a.updatedAt));
        selectDocument(newDoc.id); // Auto-select the newly created document using the now-defined selectDocument
      }
    },
    onError: (err) => {
      console.error("Mutation Error: Create Document", err);
      setLocalError("Failed to create document.");
    },
  });

  const [updateDocumentMutation] = useMutation(UPDATE_DOCUMENT, {
    onCompleted: (data) => {
      if (data?.updateDocument) {
        setDocuments((prevDocs) =>
          prevDocs.map((d) =>
            d.id === data.updateDocument.id
              ? {
                  ...d,
                  title: data.updateDocument.title,
                  updatedAt: new Date(data.updateDocument.updatedAt).getTime(),
                }
              : d
          )
        );
        // If the updated document is currently selected, trigger a refetch of its full details
        // by re-selecting it. This ensures the GET_DOCUMENT_DETAILS query runs.
        if (selectedId === data.updateDocument.id) {
            selectDocument(selectedId);
        }
      }
      refetchDocumentsList(); // Always refetch the list to get updated updatedAt and title
    },
    onError: (err) => {
      console.error("Mutation Error: Update Document", err);
      setLocalError("Failed to update document.");
      refetchDocumentsList(); // Rollback: refetch documents to revert to server state
    },
  });

  const [deleteDocumentMutation] = useMutation(DELETE_DOCUMENT, {
    update(cache, { data: { deleteDocument } }) {
      if (!deleteDocument) return;

      const existingDocs = cache.readQuery<{
        getProjectDocuments: ProjectDocument[];
      }>({
        query: GET_PROJECT_DOCUMENTS,
        variables: { projectId },
      });

      if (existingDocs) {
        cache.writeQuery({
          query: GET_PROJECT_DOCUMENTS,
          variables: { projectId },
          data: {
            getProjectDocuments: existingDocs.getProjectDocuments.filter(
              (doc) => doc.id !== deleteDocument.id
            ),
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.deleteDocument.id) {
        setDocuments((prevDocs) => prevDocs.filter((d) => d.id !== data.deleteDocument.id));
        if (selectedId === data.deleteDocument.id) {
          setSelectedId(null);
        }
      }
    },
    onError: (err) => {
      console.error("Mutation Error: Delete Document", err);
      setLocalError("Failed to delete document.");
      refetchDocumentsList(); // Force refetch on error to reconcile state
    },
  });

  // Combine loading states
  useEffect(() => {
    setLocalLoading(listLoading || detailsLoading || !projectId);
  }, [listLoading, detailsLoading, projectId]);

  useEffect(() => {
    if (listError) setLocalError(listError.message);
  }, [listError]);

  // --- Callbacks for document operations ---
  const createProjectDocument = useCallback(
    async (title: string, initialContent: Block[] = [{
        id: "default-block",
        type: "paragraph",
        props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left"
        },
        content: [],
        children: []
    }]): Promise<ProjectDocument | undefined> => {
      if (!projectId) {
        console.error("Project ID is missing for document creation.");
        setLocalError("Project context missing.");
        return;
      }

      setLocalError(null);
      try {
        const { data } = await createDocumentMutation({
          variables: {
            input: {
              projectId,
              title,
              content: initialContent,
              dataUrl: null,
            },
          },
        });

        if (data?.createDocument) {
          // onCompleted will handle updating local state and selection.
          const newDoc: ProjectDocument = {
            id: data.createDocument.id,
            title: data.createDocument.title,
            updatedAt: new Date(data.createDocument.updatedAt).getTime(),
            content: initialContent,
            dataUrl: null,
            type: "doc",
            projectId: data.createDocument.projectId,
          };
          return newDoc;
        }
      } catch (err: any) {
        console.error("Error creating document via GraphQL:", err);
        setLocalError("Failed to create document.");
      }
      return undefined;
    },
    [projectId, createDocumentMutation]
  );

  const createPdfFromDataUrl = useCallback(
    async (dataUrl: string, name: string): Promise<ProjectDocument | undefined> => {
      if (!projectId) {
        console.error("Project ID is missing for PDF creation.");
        setLocalError("Project context missing.");
        return;
      }

      setLocalError(null);
      try {
        const { data } = await createDocumentMutation({
          variables: {
            input: {
              projectId,
              title: name,
              dataUrl,
              content: null,
            },
          },
        });

        if (data?.createDocument) {
          // onCompleted will handle updating local state.
          const newPdfDoc: ProjectDocument = {
            id: data.createDocument.id,
            title: data.createDocument.title,
            updatedAt: new Date(data.createDocument.updatedAt).getTime(),
            content: null,
            dataUrl,
            type: "pdf",
            projectId: data.createDocument.projectId,
          };
          return newPdfDoc;
        }
      } catch (err: any) {
        console.error("Error creating PDF via GraphQL:", err);
        setLocalError("Failed to upload PDF.");
      }
      return undefined;
    },
    [projectId, createDocumentMutation]
  );

  const updateProjectDocument = useCallback(
    (
      id: string,
      updates: Partial<Omit<ProjectDocument, "id" | "type" | "projectId">>
    ) => {
      setLocalError(null);

      const contentToUpdate = updates.content === undefined ? undefined : updates.content;
      const dataUrlToUpdate = updates.dataUrl === undefined ? undefined : updates.dataUrl;

      // Optimistic update for UI responsiveness
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? {
            ...d,
            ...updates,
            updatedAt: Date.now(),
            type: updates.content !== undefined && updates.content !== null ? "doc" :
                  updates.dataUrl !== undefined && updates.dataUrl !== null ? "pdf" : d.type
        } : d))
      );

      updateDocumentMutation({
        variables: {
          input: {
            id,
            title: updates.title,
            content: contentToUpdate,
            dataUrl: dataUrlToUpdate,
          },
        },
      }).catch((err) => {
        console.error("Error updating document via GraphQL:", err);
        setLocalError("Failed to update document.");
        refetchDocumentsList(); // Rollback: refetch documents to revert to server state
      });
    },
    [updateDocumentMutation, refetchDocumentsList, selectedId, selectDocument] // Corrected order of dependencies
  );

  const deleteProjectDocument = useCallback(
    (id: string) => {
      setLocalError(null);
      // Optimistic update for Documents state
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedId === id) setSelectedId(null);

      deleteDocumentMutation({
        variables: { id },
      }).catch((err) => {
        console.error("Error deleting document via GraphQL:", err);
        setLocalError("Failed to delete document.");
        refetchDocumentsList(); // Rollback: refetch documents to revert to server state
      });
    },
    [selectedId, deleteDocumentMutation, refetchDocumentsList]
  );

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedId) || null,
    [documents, selectedId]
  );

  return {
    documents,
    selectedDocument,
    loading: localLoading,
    error: localError,
    createProjectDocument,
    createPdfFromDataUrl,
    updateProjectDocument,
    deleteProjectDocument,
    selectDocument,
    refetchDocumentsList,
  };
}
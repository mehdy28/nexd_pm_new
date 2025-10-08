import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Block } from "@blocknote/core"; // NEW IMPORT: Block type from BlockNote

// --- REMOVED dataUrl from interfaces ---
interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: string;
  type: "doc"; // Only 'doc' type now
  projectId: string;
}

interface CreateDocumentInput {
  projectId: string;
  title: string;
  content: Block[] | null; // UPDATED: Content is now Block[] | null
  dataUrl?: string | null; // ADDED: dataUrl for PDF creation
}

interface UpdateDocumentInput {
  id: string;
  title?: string;
  content?: Block[] | null; // UPDATED: Content is now Block[] | null
  dataUrl?: string | null; // ADDED: dataUrl for PDF update
}

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

const documentResolvers = {
  Query: {
    getProjectDocuments: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext
    ): Promise<DocumentListItem[]> => {
      console.log("[getProjectDocuments Query] called with projectId:", projectId);
      const { user } = context;

      if (!user?.id) {
        console.log("[getProjectDocuments Query] Authentication required: No user ID found.");
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log("[getProjectDocuments Query] User authenticated:", user.id);

      try {
        const documents = await prisma.document.findMany({
          where: {
            projectId: projectId,
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            content: true,
            dataUrl: true, // ADDED: Select dataUrl
          },
        });
        console.log(`[getProjectDocuments Query] Found ${documents.length} documents for projectId: ${projectId}`);

        const result = documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          updatedAt: doc.updatedAt.toISOString(),
          type: doc.dataUrl ? "pdf" : "doc", // UPDATED: Determine type based on dataUrl
          projectId: projectId,
        }));
        console.log("[getProjectDocuments Query] Successfully transformed documents. Returning list.");
        return result;
      } catch (error) {
        console.error("[getProjectDocuments Query] Error fetching documents:", error);
        throw error;
      }
    },

    getDocumentDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<PrismaDocumentType | null> => {
      console.log("[getDocumentDetails Query] called with document ID:", id);
      const { user } = context;

      if (!user?.id) {
        console.log("[getDocumentDetails Query] Authentication required: No user ID found.");
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log("[getDocumentDetails Query] User authenticated:", user.id);

      try {
        const document = await prisma.document.findUnique({
          where: { id },
          include: {
            project: {
              select: { id: true, name: true, workspaceId: true },
            },
            personalUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        if (!document) {
          console.log(`[getDocumentDetails Query] Document with ID ${id} not found.`);
          return null;
        }
        console.log(`[getDocumentDetails Query] Found document: ${document.title} (ID: ${document.id})`);

        const isProjectDocument = document.projectId !== null;
        const isPersonalDocument = document.userId !== null;

        let isAuthorized = false;

        if (isPersonalDocument && document.userId === user.id) {
          isAuthorized = true;
          console.log("[getDocumentDetails Query] Authorized: User is personal owner.");
        } else if (isProjectDocument && document.projectId) {
          isAuthorized = true;
          console.log("[getDocumentDetails Query] Authorized: Document is a project document (membership check skipped).");
        }

        if (!isAuthorized) {
          console.log("[getDocumentDetails Query] Authorization failed: User not authorized to access this document.");
          throw new GraphQLError("Authorization required: Not authorized to access this document", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const result = {
          id: document.id,
          title: document.title,
          content: document.content, // Prisma's JSON type already returns the object/array directly
          dataUrl: document.dataUrl, // ADDED: Include dataUrl
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          project: document.project ? { ...document.project, __typename: 'Project' } : null,
          personalUser: document.personalUser ? { ...document.personalUser, __typename: 'User' } : null,
          comments: [],
          activities: [],
          __typename: 'Document'
        };
        console.log("[getDocumentDetails Query] Successfully fetched and transformed document details. Returning data.");
        return result;
      } catch (error) {
        console.error(`[getDocumentDetails Query] Error fetching document details for ID ${id}:`, error);
        throw error;
      }
    },
  },

  Mutation: {
    createDocument: async (
      _parent: any,
      { input }: { input: CreateDocumentInput },
      context: GraphQLContext
    ): Promise<DocumentListItem> => {
      console.log("[createDocument Mutation] called with input:", input);
      const { user } = context;
      const { projectId, title, content, dataUrl } = input; // UPDATED: Destructure dataUrl

      if (!user?.id) {
        console.log("[createDocument Mutation] Authentication required: No user ID found.");
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log("[createDocument Mutation] User authenticated:", user.id);

      if (!projectId) {
        console.log("[createDocument Mutation] Validation Error: Project ID is required.");
        throw new GraphQLError("Project ID is required to create a document.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // NEW: Validation for either content (doc) or dataUrl (pdf)
      if (content === null && dataUrl === null) {
        console.log("[createDocument Mutation] Validation Error: Document content or dataUrl is required.");
        throw new GraphQLError("Document content or dataUrl is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }



      try {
        const newDocument = await prisma.document.create({
          data: {
            title,
            content: content, // Save Block[] directly
            dataUrl: dataUrl, // Save dataUrl directly
            project: { connect: { id: projectId } },
          },
        });
        console.log(`[createDocument Mutation] Successfully created document: ${newDocument.title} (ID: ${newDocument.id})`);

        const result = {
          id: newDocument.id,
          title: newDocument.title,
          updatedAt: newDocument.updatedAt.toISOString(),
          type: newDocument.dataUrl ? "pdf" : "doc", // Determine type from saved document
          projectId: newDocument.projectId!,
        };
        console.log("[createDocument Mutation] Returning newly created document.");
        return result;
      } catch (error) {
        console.error("[createDocument Mutation] Error creating document:", error);
        throw error;
      }
    },

    updateDocument: async (
      _parent: any,
      { input }: { input: UpdateDocumentInput },
      context: GraphQLContext
    ): Promise<DocumentListItem> => {
      console.log("[updateDocument Mutation] called with input:", input);
      const { user } = context;
      const { id, title, content, dataUrl } = input; // UPDATED: Destructure dataUrl

      if (!user?.id) {
        console.log("[updateDocument Mutation] Authentication required: No user ID found.");
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log("[updateDocument Mutation] User authenticated:", user.id);

      try {
        const existingDocument = await prisma.document.findUnique({
          where: { id },
          select: { projectId: true, userId: true },
        });

        if (!existingDocument) {
          console.log(`[updateDocument Mutation] Document with ID ${id} not found.`);
          throw new GraphQLError("Document not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        console.log(`[updateDocument Mutation] Found existing document for update: ID ${id}`);


        const isProjectDocument = existingDocument.projectId !== null;
        const isPersonalDocument = existingDocument.userId !== null;

        let isAuthorized = false;

        if (isPersonalDocument && existingDocument.userId === user.id) {
          isAuthorized = true;
          console.log("[updateDocument Mutation] Authorized: User is personal owner.");
        } else if (isProjectDocument && existingDocument.projectId) {
          isAuthorized = true;
          console.log("[updateDocument Mutation] Authorized: Document is a project document (membership check skipped).");
        }

        if (!isAuthorized) {
          console.log("[updateDocument Mutation] Authorization failed: User not authorized to update this document.");
          throw new GraphQLError("Authorization required: Not authorized to update this document", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const updatedDocument = await prisma.document.update({
          where: { id },
          data: {
            title: title ?? undefined,
            content: content !== undefined ? content : undefined, // Update Block[] directly
            dataUrl: dataUrl !== undefined ? dataUrl : undefined, // Update dataUrl directly
          },
        });
        console.log(`[updateDocument Mutation] Successfully updated document: ${updatedDocument.title} (ID: ${updatedDocument.id})`);

        const result = {
          id: updatedDocument.id,
          title: updatedDocument.title,
          updatedAt: updatedDocument.updatedAt.toISOString(),
          type: updatedDocument.dataUrl ? "pdf" : "doc", // Determine type from updated document
          projectId: updatedDocument.projectId!,
        };
        console.log("[updateDocument Mutation] Returning updated document.");
        return result;
      } catch (error) {
        console.error(`[updateDocument Mutation] Error updating document ID ${id}:`, error);
        throw error;
      }
    },

    deleteDocument: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<DocumentListItem> => {
      console.log("[deleteDocument Mutation] called with document ID:", id);
      const { user } = context;

      if (!user?.id) {
        console.log("[deleteDocument Mutation] Authentication required: No user ID found.");
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log("[deleteDocument Mutation] User authenticated:", user.id);

      try {
        const existingDocument = await prisma.document.findUnique({
          where: { id },
          select: { projectId: true, userId: true, title: true, updatedAt: true, content: true, dataUrl: true }, // ADDED: select dataUrl
        });

        if (!existingDocument) {
          console.log(`[deleteDocument Mutation] Document with ID ${id} not found.`);
          throw new GraphQLError("Document not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        console.log(`[deleteDocument Mutation] Found existing document for deletion: ID ${id}`);

        const isProjectDocument = existingDocument.projectId !== null;
        const isPersonalDocument = existingDocument.userId !== null;

        let isAuthorized = false;

        if (isPersonalDocument && existingDocument.userId === user.id) {
          isAuthorized = true;
          console.log("[deleteDocument Mutation] Authorized: User is personal owner.");
        } else if (isProjectDocument && existingDocument.projectId) {
          isAuthorized = true;
          console.log("[deleteDocument Mutation] Authorized: Document is a project document (membership check skipped).");
        }

        if (!isAuthorized) {
          console.log("[deleteDocument Mutation] Authorization failed: User not authorized to delete this document.");
          throw new GraphQLError("Authorization required: Not authorized to delete this document", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const deletedDocument = await prisma.document.delete({
          where: { id },
        });
        console.log(`[deleteDocument Mutation] Successfully deleted document: ${deletedDocument.title} (ID: ${deletedDocument.id})`);

        const result = {
          id: deletedDocument.id,
          title: deletedDocument.title,
          updatedAt: deletedDocument.updatedAt.toISOString(),
          type: deletedDocument.dataUrl ? "pdf" : "doc", // Determine type from deleted document
          projectId: deletedDocument.projectId!,
        };
        console.log("[deleteDocument Mutation] Returning deleted document info.");
        return result;
      } catch (error) {
        console.error(`[deleteDocument Mutation] Error deleting document ID ${id}:`, error);
        throw error;
      }
    },
  },
  Document: {
      // No custom field resolvers needed, but the type itself must be an object
      // This acts as a pass-through resolver for the Document type.
  },
};

export default documentResolvers;

type PrismaDocumentType = Prisma.DocumentGetPayload<{
  include: {
    project: {
      select: { id: true, name: true, workspaceId: true };
    };
    personalUser: {
      select: { id: true, firstName: true, lastName: true };
    };
  };
}>;
// graphql/resolvers/documentResolver.ts
import { GraphQLError } from "graphql";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
const documentResolvers = {
    Query: {
        getProjectDocuments: async (_parent, { projectId, search, skip = 0, take = 12, }, context) => {
            const { user } = context;
            if (!user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const where = {
                projectId: projectId,
                ...(search && {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                }),
            };
            try {
                const [documents, totalCount] = await prisma.$transaction([
                    prisma.document.findMany({
                        where,
                        skip,
                        take,
                        orderBy: { updatedAt: "desc" },
                        select: { id: true, title: true, updatedAt: true, dataUrl: true },
                    }),
                    prisma.document.count({ where }),
                ]);
                const mappedDocuments = documents.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    updatedAt: doc.updatedAt.toISOString(),
                    type: doc.dataUrl ? "pdf" : "doc",
                    projectId: projectId,
                }));
                return {
                    documents: mappedDocuments,
                    totalCount,
                };
            }
            catch (error) {
                console.error("[getProjectDocuments Query] Error fetching documents:", error);
                throw error;
            }
        },
        // ... getDocumentDetails remains the same
        getDocumentDetails: async (_parent, { id }, context) => {
            const { user } = context;
            if (!user?.id) {
                throw new GraphQLError("Authentication required", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            try {
                const document = await prisma.document.findUnique({
                    where: { id },
                    include: {
                        project: {
                            select: { id: true, name: true, workspaceId: true },
                        },
                        personalUser: {
                            select: { id: true, firstName: true, lastName: true, avatarColor: true },
                        },
                    },
                });
                if (!document) {
                    return null;
                }
                const isProjectDocument = document.projectId !== null;
                const isPersonalDocument = document.userId !== null;
                let isAuthorized = false;
                if (isPersonalDocument && document.userId === user.id) {
                    isAuthorized = true;
                }
                else if (isProjectDocument && document.projectId) {
                    isAuthorized = true;
                }
                if (!isAuthorized) {
                    throw new GraphQLError("Authorization required: Not authorized to access this document", {
                        extensions: { code: "FORBIDDEN" },
                    });
                }
                const result = {
                    id: document.id,
                    title: document.title,
                    content: document.content, // Prisma's JSON type already returns the object/array directly
                    dataUrl: document.dataUrl, // ADDED: Include dataUrl
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt,
                    projectId: document.projectId, // Include projectId
                    userId: document.userId, // Include userId
                    type: document.dataUrl ? "pdf" : "doc", // Determine type from dataUrl
                    project: document.project ? { ...document.project, __typename: 'Project' } : null,
                    personalUser: document.personalUser ? { ...document.personalUser, __typename: 'User' } : null,
                    comments: [],
                    activities: [],
                    __typename: 'Document'
                };
                return { ...result, type: result.type };
            }
            catch (error) {
                console.error(`[getDocumentDetails Query] Error fetching document details for ID ${id}:`, error);
                throw error;
            }
        },
    },
    Mutation: {
        // ... createDocument, updateDocument, deleteDocument remain the same
        createDocument: async (_parent, { input }, context) => {
            const { user } = context;
            const { projectId, title, content, dataUrl } = input; // UPDATED: Destructure dataUrl
            if (!user?.id) {
                throw new GraphQLError("Authentication required", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            if (!projectId) {
                throw new GraphQLError("Project ID is required to create a document.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            // NEW: Validation for either content (doc) or dataUrl (pdf)
            if (content === null && dataUrl === null) {
                throw new GraphQLError("Document content or dataUrl is required.", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            try {
                const newDocument = await prisma.document.create({
                    data: {
                        title: title ?? "Untitled",
                        content: content !== null ? content : Prisma.JsonNull, // Save Block[] directly or set to JsonNull
                        dataUrl: dataUrl, // Save dataUrl directly
                        project: { connect: { id: projectId } },
                    },
                });
                const result = {
                    id: newDocument.id,
                    title: newDocument.title,
                    updatedAt: newDocument.updatedAt.toISOString(),
                    type: newDocument.dataUrl ? "pdf" : "doc", // Explicitly cast type
                    projectId: newDocument.projectId,
                };
                return { ...result, type: result.type };
            }
            catch (error) {
                console.error("[createDocument Mutation] Error creating document:", error);
                throw error;
            }
        },
        updateDocument: async (_parent, { input }, context) => {
            const { user } = context;
            const { id, title, content, dataUrl } = input; // UPDATED: Destructure dataUrl
            if (!user?.id) {
                throw new GraphQLError("Authentication required", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            try {
                const existingDocument = await prisma.document.findUnique({
                    where: { id },
                    select: { projectId: true, userId: true },
                });
                if (!existingDocument) {
                    throw new GraphQLError("Document not found", {
                        extensions: { code: "NOT_FOUND" },
                    });
                }
                const isProjectDocument = existingDocument.projectId !== null;
                const isPersonalDocument = existingDocument.userId !== null;
                let isAuthorized = false;
                if (isPersonalDocument && existingDocument.userId === user.id) {
                    isAuthorized = true;
                }
                else if (isProjectDocument && existingDocument.projectId) {
                    isAuthorized = true;
                }
                if (!isAuthorized) {
                    throw new GraphQLError("Authorization required: Not authorized to update this document", {
                        extensions: { code: "FORBIDDEN" },
                    });
                }
                const updatedDocument = await prisma.document.update({
                    where: { id },
                    data: {
                        title: title ?? undefined,
                        content: content === null ? Prisma.JsonNull : content !== undefined ? content : undefined, // Handle null and undefined cases
                        dataUrl: dataUrl !== undefined ? dataUrl : undefined, // Update dataUrl directly
                    },
                });
                const result = {
                    id: updatedDocument.id,
                    title: updatedDocument.title,
                    updatedAt: updatedDocument.updatedAt.toISOString(),
                    type: updatedDocument.dataUrl ? "pdf" : "doc", // Explicitly typed as "pdf" | "doc"
                    projectId: updatedDocument.projectId,
                };
                return { ...result, type: result.type };
            }
            catch (error) {
                console.error(`[updateDocument Mutation] Error updating document ID ${id}:`, error);
                throw error;
            }
        },
        deleteDocument: async (_parent, { id }, context) => {
            const { user } = context;
            if (!user?.id) {
                throw new GraphQLError("Authentication required", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            try {
                const existingDocument = await prisma.document.findUnique({
                    where: { id },
                    select: { projectId: true, userId: true, title: true, updatedAt: true, content: true, dataUrl: true }, // ADDED: select dataUrl
                });
                if (!existingDocument) {
                    throw new GraphQLError("Document not found", {
                        extensions: { code: "NOT_FOUND" },
                    });
                }
                const isProjectDocument = existingDocument.projectId !== null;
                const isPersonalDocument = existingDocument.userId !== null;
                let isAuthorized = false;
                if (isPersonalDocument && existingDocument.userId === user.id) {
                    isAuthorized = true;
                }
                else if (isProjectDocument && existingDocument.projectId) {
                    isAuthorized = true;
                }
                if (!isAuthorized) {
                    throw new GraphQLError("Authorization required: Not authorized to delete this document", {
                        extensions: { code: "FORBIDDEN" },
                    });
                }
                const deletedDocument = await prisma.document.delete({
                    where: { id },
                });
                const result = {
                    id: deletedDocument.id,
                    title: deletedDocument.title,
                    updatedAt: deletedDocument.updatedAt.toISOString(),
                    type: deletedDocument.dataUrl ? "pdf" : "doc", // Determine type from deleted document
                    projectId: deletedDocument.projectId,
                };
                return { ...result, type: result.type };
            }
            catch (error) {
                console.error(`[deleteDocument Mutation] Error deleting document ID ${id}:`, error);
                throw error;
            }
        },
        deleteManyDocuments: async (_parent, { ids }, context) => {
            const { user } = context;
            if (!user?.id) {
                throw new GraphQLError("Authentication required", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            if (!ids || ids.length === 0) {
                return { count: 0 };
            }
            try {
                // We use a direct deleteMany with OR logic to efficiently matching authorized documents.
                // It matches if the ID is in the list AND (the user owns it OR it belongs to a project).
                // This mirrors the logic in single deleteDocument where we authorize if projectId exists.
                const { count } = await prisma.document.deleteMany({
                    where: {
                        id: { in: ids },
                        OR: [
                            { userId: user.id }, // User is the owner (personal document)
                            { projectId: { not: null } } // Document belongs to a project (project document)
                        ]
                    },
                });
                return { count };
            }
            catch (error) {
                console.error("[deleteManyDocuments Mutation] Error deleting documents:", error);
                throw error;
            }
        },
    },
    Document: {
    // This remains as a pass-through
    },
};
export default documentResolvers;

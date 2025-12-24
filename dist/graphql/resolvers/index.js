//graphql/resolvers/index.ts
import { userResolver } from "./userResolver.js";
import setupResolver from "./setupResolver.js";
import workspaceResolver from "./workspaceResolver.js";
import { accountResolver } from "./accountResolver.js";
// Project-specific resolvers
import projectResolver from "./projectResolver.js";
import projectSectionResolver from "./projectSectionResolver.js";
import taskResolver from "./taskResolver.js";
import { sprintResolvers } from "./sprintResolver.js";
import documentResolvers from "./documentResolver.js";
import WhiteboardResolvers from "./WhiteboardResolver.js";
import promptResolvers from "./promptResolver.js";
import promptVariableResolver from "./promptVariableResolver.js";
import lookupResolvers from "./lookupResolvers.js";
import { projectDashboardResolvers } from "./projectDashboardResolver.js";
// Personal/User-specific resolvers
import personalResolver from "./personal/personalResolver.js";
import personalSectionResolver from "./personal/personalSectionResolver.js";
import personalTaskResolver from "./personal/personalTaskResolver.js";
import personalDocumentResolvers from "./personal/personalDocumentResolver.js";
import personalWhiteboardResolvers from "./personal/personalWhiteboardResolver.js";
import personalPromptResolvers from "./personal/personalPromptResolver.js";
// Messaging and Ticketing resolvers
import { messagingResolvers } from "./messagingResolver.js";
// Member management resolvers
import { memberManagementResolvers } from "./memberManagementResolver.js";
import promptResolversAi from "./promptResolverAi.js";
// Model Profile Resolvers
import modelProfileResolvers from "./modelProfilesResolver.js";
// Admin management resolvers
import { adminSupportResolvers } from "./adminSupportResolvers.js";
import { adminResolvers } from "./admi.js";
import { earlyAccessResolver } from "./earlyAccessResolver.js";
export const resolvers = {
    Query: {
        // General & Workspace
        ...workspaceResolver.Query,
        ...userResolver.Query,
        ...lookupResolvers.Query,
        ...memberManagementResolvers.Query,
        ...accountResolver.Query,
        // Project
        ...projectResolver.Query,
        ...taskResolver.Query,
        ...documentResolvers.Query,
        ...WhiteboardResolvers.Query,
        ...promptResolvers.Query,
        ...promptVariableResolver.Query,
        ...projectDashboardResolvers.Query,
        // Personal
        ...personalResolver.Query,
        ...personalDocumentResolvers.Query,
        ...personalWhiteboardResolvers.Query,
        ...personalPromptResolvers.Query,
        ...personalTaskResolver.Query,
        // Messaging & Tickets
        ...messagingResolvers.Query,
        // Admin
        ...adminSupportResolvers.Query,
        ...adminResolvers.Query,
        // Model Profiles
        ...modelProfileResolvers.Query,
        // Early Access
        ...earlyAccessResolver.Query,
    },
    Mutation: {
        // General & Workspace
        ...workspaceResolver.Mutation,
        // Setup & User
        ...setupResolver.Mutation,
        ...userResolver.Mutation,
        ...accountResolver.Mutation,
        // Member Management
        ...memberManagementResolvers.Mutation,
        // Project
        ...projectResolver.Mutation,
        ...projectSectionResolver.Mutation,
        ...taskResolver.Mutation,
        ...sprintResolvers.Mutation,
        ...documentResolvers.Mutation,
        ...WhiteboardResolvers.Mutation,
        ...promptResolvers.Mutation,
        // Personal
        ...personalSectionResolver.Mutation,
        ...personalTaskResolver.Mutation,
        ...personalDocumentResolvers.Mutation,
        ...personalWhiteboardResolvers.Mutation,
        ...personalPromptResolvers.Mutation,
        // Messaging & Tickets
        ...messagingResolvers.Mutation,
        // Prompt AI
        ...promptResolversAi.Mutation,
        // Admin Support
        ...adminSupportResolvers.Mutation,
        // Model Profiles
        ...modelProfileResolvers.Mutation,
        // Early Access
        ...earlyAccessResolver.Mutation,
    },
    Subscription: {
        // Real-time Messaging & Tickets
        ...messagingResolvers.Subscription,
        ...adminSupportResolvers.Subscription,
    },
    // Field Resolvers for nested or computed fields
    Task: taskResolver.Task,
    TaskListView: taskResolver.TaskListView,
    Document: documentResolvers.Document,
    Whiteboard: WhiteboardResolvers.Whiteboard,
    Project: {
        ...projectResolver.Project,
        ...promptResolvers.Project,
    },
    User: promptResolvers.User,
};

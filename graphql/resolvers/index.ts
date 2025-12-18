import { userResolver } from "./userResolver";
import setupResolver from "./setupResolver";
import workspaceResolver from "./workspaceResolver";
import { accountResolver } from "./accountResolver";
// Project-specific resolvers
import projectResolver from "./projectResolver";
import projectSectionResolver from "./projectSectionResolver";
import taskResolver from "./taskResolver";
import { sprintResolvers } from "./sprintResolver";
import documentResolvers from "./documentResolver";
import WhiteboardResolvers from "./WhiteboardResolver";
import promptResolvers from "./promptResolver";
import promptVariableResolver from "./promptVariableResolver";
import lookupResolvers from "./lookupResolvers";
import { projectDashboardResolvers } from "./projectDashboardResolver";

// Personal/User-specific resolvers
import personalResolver from "./personal/personalResolver";
import personalSectionResolver from "./personal/personalSectionResolver";
import personalTaskResolver from "./personal/personalTaskResolver";
import personalDocumentResolvers from "./personal/personalDocumentResolver";
import personalWhiteboardResolvers from "./personal/personalWhiteboardResolver";
import personalPromptResolvers from "./personal/personalPromptResolver";

// Messaging and Ticketing resolvers
import { messagingResolvers } from "./messagingResolver";

// Member management resolvers
import { memberManagementResolvers } from "./memberManagementResolver";

import promptResolversAi from "./promptResolverAi";

// Model Profile Resolvers
import modelProfileResolvers from "./modelProfilesResolver";

// Admin management resolvers
import { adminSupportResolvers } from "./adminSupportResolvers";
import { adminResolvers } from "./admi";



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
    


  },
  Subscription: {
    // Real-time Messaging & Tickets
    ...messagingResolvers.Subscription,
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
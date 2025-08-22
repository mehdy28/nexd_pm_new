import { userResolvers } from "./user"
import { workspaceResolvers } from "./workspace"
import { projectResolvers } from "./project"
import { taskResolvers } from "./task"
import { documentResolvers } from "./document"
import { wireframeResolvers } from "./wireframe"
import { commentResolvers } from "./comment"
import { activityResolvers } from "./activity"
import { authResolvers } from "./auth"

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...workspaceResolvers.Query,
    ...projectResolvers.Query,
    ...taskResolvers.Query,
    ...documentResolvers.Query,
    ...wireframeResolvers.Query,
    ...activityResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...workspaceResolvers.Mutation,
    ...projectResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...documentResolvers.Mutation,
    ...wireframeResolvers.Mutation,
    ...commentResolvers.Mutation,
  },
  User: userResolvers.User,
  Workspace: workspaceResolvers.Workspace,
  Project: projectResolvers.Project,
  Task: taskResolvers.Task,
  Document: documentResolvers.Document,
  Wireframe: wireframeResolvers.Wireframe,
  Comment: commentResolvers.Comment,
  Activity: activityResolvers.Activity,
}

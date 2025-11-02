import { userResolver } from "./userResolver"
import setupResolver from "./setupResolver"
import workspaceResolver from "./workspaceResolver"
import projectResolver from "./projectResolver"
import projectSectionResolver from "./projectSectionResolver"
import taskResolver from "./taskResolver"
import { sprintResolvers } from "./sprintResolver"
import documentResolvers from "./documentResolver"
import wireframeResolvers from "./wireframeResolver"
import promptResolvers from "./promptResolver"
import promptVariableResolver from "./promptVariableResolver"
import lookupResolvers from "./lookupResolvers"

export const resolvers = {
  Query: {
    ...taskResolver.Query, // ADD THIS LINE
    ...workspaceResolver.Query,
    ...userResolver.Query,
    ...projectResolver.Query,
    ...documentResolvers.Query,
    ...wireframeResolvers.Query,
    ...promptResolvers.Query,
    ...promptVariableResolver.Query,
    ...lookupResolvers.Query,
  },
  Mutation: {
    ...setupResolver.Mutation,
    ...userResolver.Mutation,
    ...projectResolver.Mutation,
    ...projectSectionResolver.Mutation,
    ...taskResolver.Mutation,
    ...sprintResolvers.Mutation,
    ...documentResolvers.Mutation,
    ...wireframeResolvers.Mutation,
    ...promptResolvers.Mutation,
  },
  // You may also need to add the Task field resolvers from taskResolver
  Task: taskResolver.Task,
  TaskListView: taskResolver.TaskListView,
  Document: documentResolvers.Document,
}
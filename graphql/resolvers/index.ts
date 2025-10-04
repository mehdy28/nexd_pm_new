import { userResolver } from "./userResolver"
import setupResolver from "./setupResolver"
import workspaceResolver from "./workspaceResolver"
import projectResolver from "./projectResolver"
import projectSectionResolver from "./projectSectionResolver"
import taskResolver from "./taskResolver"

export const resolvers = {
  Query: {
    ...workspaceResolver.Query,
    ...userResolver.Query,
    ...projectResolver.Query,

  },
  Mutation: {
    ...setupResolver.Mutation,
    ...userResolver.Mutation,
    ...projectResolver.Mutation,
    ...projectSectionResolver.Mutation,
    ...taskResolver.Mutation,

  },
}

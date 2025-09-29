import { userResolver } from "./userResolver"
import setupResolver from "./setupResolver"
import workspaceResolver from "./workspaceResolver"
import projectResolver from "./projectResolver"

export const resolvers = {
  Query: {
    ...workspaceResolver.Query,
    ...userResolver.Query,
  },
  Mutation: {
    ...setupResolver.Mutation,
    ...userResolver.Mutation,
    ...projectResolver.Mutation,
  },
}

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



export const resolvers = {
  Query: {
    ...workspaceResolver.Query,
    ...userResolver.Query,
    ...projectResolver.Query,
    ...documentResolvers.Query, // NEW
    ...wireframeResolvers.Query,
    ...promptResolvers.Query,



  },
  Mutation: {
    ...setupResolver.Mutation,
    ...userResolver.Mutation,
    ...projectResolver.Mutation,
    ...projectSectionResolver.Mutation,
    ...taskResolver.Mutation,
    ...sprintResolvers.Mutation,
    ...documentResolvers.Mutation, // NEW
    ...wireframeResolvers.Mutation,
    ...promptResolvers.Mutation,



  },
  Document: documentResolvers.Document, // NEW: Include the Document type resolver

}

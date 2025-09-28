import { userResolver } from "./userResolver"
import setupResolver from "./setupResolver"



export const resolvers = {
  Query: {
    ...userResolver.Query,
  },
  Mutation: {
    ...setupResolver.Mutation,
    ...userResolver.Mutation,
  },
}

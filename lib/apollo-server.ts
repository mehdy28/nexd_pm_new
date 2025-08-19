import { ApolloServer } from "@apollo/server"
import { startServerAndCreateNextHandler } from "@apollo/server/integrations/next"
import { makeExecutableSchema } from "@graphql-tools/schema"
import { typeDefs } from "@/graphql/schema"
import { resolvers } from "@/graphql/resolvers"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface Context {
  prisma: typeof prisma
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

const server = new ApolloServer<Context>({
  schema,
})

export default startServerAndCreateNextHandler(server, {
  context: async (req, res) => {
    const session = await getServerSession(req, res, authOptions)

    return {
      prisma,
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.name,
            role: session.user.role,
          }
        : undefined,
    }
  },
})

//graphql/resolvers/modelProfilesResolver.ts
import { prisma } from "@/lib/prisma";

// -----------------------------------
// Interfaces
// -----------------------------------

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

interface ModelProfileCreateInput {
  name: string;
  provider?: string;
  enhancementInstructions: string;
}

interface ModelProfileUpdateInput {
  name?: string;
  provider?: string;
  enhancementInstructions?: string;
}

// -----------------------------------
// Resolvers
// -----------------------------------

const modelProfileResolvers = {
  Query: {


    modelProfile: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      return await context.prisma.modelProfile.findUnique({
        where: { id },
      });
    },
    modelProfiles: async (
      _parent: any,
      _args: {},
      context: GraphQLContext
    ) => {
      return await context.prisma.modelProfile.findMany({
        orderBy: { name: 'asc' }
      });
    },
  },
  Mutation: {
    createModelProfile: async (
      _parent: any,
      { data }: { data: ModelProfileCreateInput },
      context: GraphQLContext
    ) => {
      return await context.prisma.modelProfile.create({
        data,
      });
    },

    createManyModelProfiles: async (
        _parent: any,
        { data }: { data: ModelProfileCreateInput[] },
        context: GraphQLContext
      ) => {
        const result = await context.prisma.modelProfile.createMany({
          data,
          skipDuplicates: true,
        });
        return { count: result.count };
    },

    updateModelProfile: async (
      _parent: any,
      { id, data }: { id: string; data: ModelProfileUpdateInput },
      context: GraphQLContext
    ) => {
      return await context.prisma.modelProfile.update({
        where: { id },
        data,
      });
    },

    updateManyModelProfiles: async (
        _parent: any,
        { ids, data }: { ids: string[]; data: ModelProfileUpdateInput },
        context: GraphQLContext
      ) => {
        const result = await context.prisma.modelProfile.updateMany({
          where: {
            id: { in: ids },
          },
          data,
        });
        return { count: result.count };
    },

    deleteModelProfile: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      return await context.prisma.modelProfile.delete({
        where: { id },
      });
    },

    deleteManyModelProfiles: async (
      _parent: any,
      { ids }: { ids: string[] },
      context: GraphQLContext
    ) => {
      const result = await context.prisma.modelProfile.deleteMany({
        where: {
          id: { in: ids },
        },
      });
      return { count: result.count };
    },
  },
};

export default modelProfileResolvers;
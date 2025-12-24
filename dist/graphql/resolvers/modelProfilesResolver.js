// -----------------------------------
// Resolvers
// -----------------------------------
const modelProfileResolvers = {
    Query: {
        modelProfile: async (_parent, { id }, context) => {
            return await context.prisma.modelProfile.findUnique({
                where: { id },
            });
        },
        modelProfiles: async (_parent, _args, context) => {
            return await context.prisma.modelProfile.findMany({
                orderBy: { name: 'asc' }
            });
        },
    },
    Mutation: {
        createModelProfile: async (_parent, { data }, context) => {
            return await context.prisma.modelProfile.create({
                data,
            });
        },
        createManyModelProfiles: async (_parent, { data }, context) => {
            const result = await context.prisma.modelProfile.createMany({
                data,
                skipDuplicates: true,
            });
            return { count: result.count };
        },
        updateModelProfile: async (_parent, { id, data }, context) => {
            return await context.prisma.modelProfile.update({
                where: { id },
                data,
            });
        },
        updateManyModelProfiles: async (_parent, { ids, data }, context) => {
            const result = await context.prisma.modelProfile.updateMany({
                where: {
                    id: { in: ids },
                },
                data,
            });
            return { count: result.count };
        },
        deleteModelProfile: async (_parent, { id }, context) => {
            return await context.prisma.modelProfile.delete({
                where: { id },
            });
        },
        deleteManyModelProfiles: async (_parent, { ids }, context) => {
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

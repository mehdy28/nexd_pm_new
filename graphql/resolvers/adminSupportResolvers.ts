import { GraphQLError } from 'graphql';
import { prisma } from '@/lib/prisma';
import { pubsub, Topics } from '@/graphql/pubsub';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

// A helper function to make logs easier to read
const log = (source: string, message: string, data?: any) => {
  console.log(`\n--- [${source}] ---`);
  console.log(`${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log('Data:');
    console.dir(data, { depth: null });
  }
  console.log('--- End Log ---\n');
};

// Helper to check for admin privileges
const checkAdmin = (context: GraphQLContext) => {
  if (context.user?.role !== 'ADMIN') {
    throw new GraphQLError('You are not authorized to perform this action.');
  }
  return context.user.id;
};

export const adminSupportResolvers = {
  // --- QUERIES ---
  Query: {
    adminGetSupportTickets: async (_: any, __: any, context: GraphQLContext) => {
      const source = 'Query: adminGetSupportTickets';
      try {
        checkAdmin(context);
        log(source, 'Fired');

        const tickets = await prisma.ticket.findMany({
          include: {
            creator: {
              select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true },
            },
            workspace: {
              select: { id: true, name: true, plan: true },
            },
            _count: {
              select: {
                messages: {
                  where: {
                    sender: {
                      role: { not: 'ADMIN' }
                    }
                  }
                }
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
        });
        
        // Map the result to match the GraphQL type, including the unread count
        const result = tickets.map(ticket => ({
            ...ticket,
            unreadCount: ticket._count.messages
        }));

        log(source, 'Successfully fetched all support tickets', { count: result.length });
        return result;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred fetching support tickets.');
      }
    },

    adminGetTicketDetails: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const source = 'Query: adminGetTicketDetails';
      try {
        checkAdmin(context);
        log(source, 'Fired', { id });

        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            creator: {
              select: { id: true, firstName: true, lastName: true, email: true, avatar: true, avatarColor: true },
            },
            workspace: {
              include: {
                _count: { select: { members: true } },
              },
            },
            messages: {
              include: {
                sender: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true, role: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        if (!ticket) {
          throw new GraphQLError('Ticket not found.');
        }

        // Shape the data to match the GraphQL type
        const result = {
          ...ticket,
          workspace: {
            ...ticket.workspace,
            memberCount: ticket.workspace._count.members,
          },
          messages: ticket.messages.map(msg => ({
            ...msg,
            isSupport: msg.sender.role === 'ADMIN',
          })),
        };

        log(source, 'Successfully fetched ticket details');
        return result;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred fetching ticket details.');
      }
    },
  },

  // --- MUTATIONS ---
  Mutation: {
    adminSendTicketMessage: async (_: any, { ticketId, content }: { ticketId: string; content: string }, context: GraphQLContext) => {
      const source = 'Mutation: adminSendTicketMessage';
      try {
        const adminId = checkAdmin(context);
        log(source, 'Fired', { ticketId });

        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
          throw new GraphQLError('Ticket not found.');
        }

        const [newMessage] = await prisma.$transaction([
          prisma.ticketMessage.create({
            data: {
              ticketId,
              content,
              senderId: adminId,
            },
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true, role: true } },
            },
          }),
          prisma.ticket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() },
          }),
        ]);

        const messageWithSupportFlag = { ...newMessage, isSupport: true };

        // Publish to subscription for the original ticket creator
        const payloadToPublish = {
            ticketAuthorizer: { ticketCreatorId: ticket.creatorId },
            ticketMessageAdded: messageWithSupportFlag,
        };
        await pubsub.publish(Topics.TICKET_MESSAGE_ADDED, payloadToPublish);

        log(source, 'Successfully sent message and published event');
        return messageWithSupportFlag;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred sending the ticket message.');
      }
    },

    adminUpdateTicketStatus: async (_: any, { ticketId, status }: { ticketId: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }, context: GraphQLContext) => {
      const source = 'Mutation: adminUpdateTicketStatus';
      try {
        checkAdmin(context);
        log(source, 'Fired', { ticketId, status });

        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: { status },
          select: { id: true, status: true },
        });

        log(source, 'Successfully updated ticket status');
        return updatedTicket;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'Failed to update ticket status.');
      }
    },
    
    adminUpdateTicketPriority: async (_: any, { ticketId, priority }: { ticketId: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }, context: GraphQLContext) => {
        const source = 'Mutation: adminUpdateTicketPriority';
        try {
          checkAdmin(context);
          log(source, 'Fired', { ticketId, priority });
  
          const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { priority },
            select: { id: true, priority: true },
          });
  
          log(source, 'Successfully updated ticket priority');
          return updatedTicket;
        } catch (error: any) {
          log(source, 'ERROR', { error: error.message });
          throw new GraphQLError(error.message || 'Failed to update ticket priority.');
        }
    },
  },
};

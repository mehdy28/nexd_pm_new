import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { prisma } from '@/lib/prisma';
import { pubsub, Topics } from '@/graphql/pubsub';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

const MESSAGES_PAGE_SIZE = 30;


// Helper to check for admin privileges
const checkAdmin = (context: GraphQLContext) => {
  if (context.user?.role !== 'ADMIN') {
    throw new GraphQLError('You are not authorized to perform this action.');
  }
  return context.user.id;
};

// Helper to fetch the data structure needed for list item subscriptions
const getAdminTicketListItemPayload = async (ticketId: string) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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
                NOT: { sender: { role: 'ADMIN' } },
                isReadByAdmin: false,
              },
            },
          },
        },
      },
    });
  
    if (!ticket) return null;
  
    return {
      ...ticket,
      unreadCount: ticket._count.messages,
    };
};


export const adminSupportResolvers = {
  // --- QUERIES ---
  Query: {
    adminGetSupportTickets: async (_: any, __: any, context: GraphQLContext) => {
      const source = 'Query: adminGetSupportTickets';
      try {
        checkAdmin(context);

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
                    NOT: { sender: { role: 'ADMIN' } },
                    isReadByAdmin: false
                  }
                }
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
        });
        
        const result = tickets.map(ticket => ({
            ...ticket,
            unreadCount: ticket._count.messages
        }));

        return result;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred fetching support tickets.');
      }
    },

    adminGetTicketDetails: async (_: any, { id, cursor, limit = MESSAGES_PAGE_SIZE }: { id: string, cursor?: string, limit?: number }, context: GraphQLContext) => {
      const source = 'Query: adminGetTicketDetails';
      try {
        checkAdmin(context);

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
          },
        });

        if (!ticket) {
          throw new GraphQLError('Ticket not found.');
        }

        const messagesRaw = await prisma.ticketMessage.findMany({
            where: { ticketId: id },
            take: limit + 1,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true, role: true } } },
        });
        
        const hasMoreMessages = messagesRaw.length > limit;
        const messages = hasMoreMessages ? messagesRaw.slice(0, limit) : messagesRaw;

        const result = {
          ...ticket,
          workspace: {
            ...ticket.workspace,
            memberCount: ticket.workspace._count.members,
          },
          messages: messages.reverse().map(msg => ({
            ...msg,
            isSupport: msg.sender.role === 'ADMIN',
          })),
          hasMoreMessages,
        };

        return result;
      } catch (error: any) {
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

        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new GraphQLError('Ticket not found.');

        const [newMessage] = await prisma.$transaction([
          prisma.ticketMessage.create({
            data: { ticketId, content, senderId: adminId },
            include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true, role: true } } },
          }),
          prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }),
        ]);

        const messageWithSupportFlag = { 
          ...newMessage, 
          ticketId: ticket.id,
          isSupport: true 
        };

        await pubsub.publish(Topics.TICKET_MESSAGE_ADDED, {
            ticketAuthorizer: { ticketCreatorId: ticket.creatorId, workspaceId: ticket.workspaceId },
            ticketMessageAdded: messageWithSupportFlag,
        });

        const updatedTicketPayload = await getAdminTicketListItemPayload(ticketId);
        if (updatedTicketPayload) {
            await pubsub.publish(Topics.ADMIN_TICKET_UPDATED, { adminTicketUpdated: updatedTicketPayload });
        }

        return messageWithSupportFlag;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred sending the ticket message.');
      }
    },

    adminUpdateTicketStatus: async (_: any, { ticketId, status }: { ticketId: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }, context: GraphQLContext) => {
      const source = 'Mutation: adminUpdateTicketStatus';
      try {
        checkAdmin(context);

        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: { status, updatedAt: new Date() },
          select: { id: true, status: true },
        });

        const updatedTicketPayload = await getAdminTicketListItemPayload(ticketId);
        if (updatedTicketPayload) {
            await pubsub.publish(Topics.ADMIN_TICKET_UPDATED, { adminTicketUpdated: updatedTicketPayload });
        }

        return updatedTicket;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'Failed to update ticket status.');
      }
    },
    
    adminUpdateTicketPriority: async (_: any, { ticketId, priority }: { ticketId: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }, context: GraphQLContext) => {
        const source = 'Mutation: adminUpdateTicketPriority';
        try {
  
          const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { priority, updatedAt: new Date() },
            select: { id: true, priority: true },
          });

          const updatedTicketPayload = await getAdminTicketListItemPayload(ticketId);
          if (updatedTicketPayload) {
              await pubsub.publish(Topics.ADMIN_TICKET_UPDATED, { adminTicketUpdated: updatedTicketPayload });
          }
  
          return updatedTicket;
        } catch (error: any) {
          throw new GraphQLError(error.message || 'Failed to update ticket priority.');
        }
    },

    adminMarkTicketAsRead: async (_: any, { ticketId }: { ticketId: string }, context: GraphQLContext) => {
        const source = 'Mutation: adminMarkTicketAsRead';
        try {
          checkAdmin(context);
          
          await prisma.ticketMessage.updateMany({
            where: {
                ticketId: ticketId,
                NOT: { sender: { role: 'ADMIN' } },
                isReadByAdmin: false,
            },
            data: {
                isReadByAdmin: true,
            },
          });

          const updatedTicketPayload = await getAdminTicketListItemPayload(ticketId);
          if (updatedTicketPayload) {
              await pubsub.publish(Topics.ADMIN_TICKET_UPDATED, { adminTicketUpdated: updatedTicketPayload });
          }

          return { id: ticketId, unreadCount: 0 };

        } catch (error: any) {
          throw new GraphQLError(error.message || 'Failed to mark ticket as read.');
        }
    },
  },

  // --- SUBSCRIPTIONS ---
  Subscription: {
    adminTicketAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.ADMIN_TICKET_ADDED]),
        (payload, variables, context) => {
          return true;
        }
      ),
    },
    adminTicketUpdated: {
        subscribe: withFilter(
          () => pubsub.asyncIterableIterator([Topics.ADMIN_TICKET_UPDATED]),
          (payload, variables, context) => {
            return true;
          }
        ),
    },
  }
};
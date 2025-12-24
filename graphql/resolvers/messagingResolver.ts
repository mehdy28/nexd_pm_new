import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { prisma } from '../../lib/prisma.js';
import { pubsub, Topics } from '../../graphql/pubsub.js';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

const MESSAGES_PAGE_SIZE = 30;



// Helper to fetch the data structure needed for list item subscriptions for ADMIN
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

// Helper to create a consistent payload for the communication list
const createCommunicationListItemPayload = async (item: any, type: 'conversation' | 'ticket', userId: string) => {
  if (type === 'conversation') {
    // Filter out users who have left for the participant info string
    const activeParticipants = item.participants.filter((p: any) => !p.hasLeft);
    
    const participantInfo = item.type === 'DIRECT' 
      ? `${item.participants.find((p: any) => p.userId !== userId)?.user.firstName} ${item.participants.find((p: any) => p.userId !== userId)?.user.lastName}`.trim()
      : `${activeParticipants.length} members`;
      
    const title = item.type === 'DIRECT' ? participantInfo : item.name;

    return {
      id: item.id,
      type: 'conversation',
      title,
      lastMessage: 'Conversation started.',
      participantInfo,
      updatedAt: item.updatedAt,
      unreadCount: 0,
      conversationType: item.type,
      workspaceId: item.workspaceId, 
      // Only show avatars of active participants
      participants: activeParticipants.map((p: any) => p.user)
    };
  } else { 
    return {
      id: item.id,
      type: 'ticket',
      title: item.subject,
      lastMessage: item.messages[0]?.content || 'Ticket created.',
      participantInfo: 'Support Team',
      updatedAt: item.updatedAt,
      unreadCount: 0, 
      priority: item.priority,
      workspaceId: item.workspaceId,
      participants: [item.creator] 
    };
  }
};


export const messagingResolvers = {
  // --- QUERIES ---
  Query: {
    getWorkspaceMembers: async (_: any, { workspaceId }: { workspaceId: string }, context: GraphQLContext) => {
      const source = 'Query: getWorkspaceMembers';
      try {
        const userId = context?.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        
        const member = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
        if (!member) throw new GraphQLError('Access denied');
        
        const members = await prisma.workspaceMember.findMany({
          where: { workspaceId },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true , avatarColor : true } } },
          orderBy: { user: { firstName: 'asc' } },
        });

        return members;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred fetching workspace members.');
      }
    },
    
    getCommunicationList: async (_: any, { workspaceId }: { workspaceId: string }, context: GraphQLContext) => {
      const source = 'Query: getCommunicationList';
      try {
        const userId = context?.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');

        const member = await prisma.workspaceMember.findFirst({ where: { userId, workspaceId } });
        if (!member) throw new GraphQLError('Access denied to workspace resources');
        
        // Fetch conversations even if the user has left (hasLeft=true) so they can see the history in the list
        const conversations = await prisma.conversation.findMany({
          where: { workspaceId, participants: { some: { userId } } },
          include: {
            participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: { updatedAt: 'desc' },
        });
        
        const isSaasAdmin = context.user?.role === 'ADMIN';
        const tickets = await prisma.ticket.findMany({
          where: { workspaceId, ...(isSaasAdmin ? {} : { creatorId: userId }) },
          include: {
            creator: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            readStatus: { where: { userId } } 
          },
          orderBy: { updatedAt: 'desc' },
        });

        const conversationItems = await Promise.all(
          conversations.map(async (c) => {
            const currentUserParticipant = c.participants.find((p) => p.userId === userId);
            
            // Logic: If user has left, they have 0 unread messages (they don't see new ones)
            let unreadCount = 0;
            if (currentUserParticipant && !currentUserParticipant.hasLeft) {
                unreadCount = await prisma.message.count({
                    where: {
                        conversationId: c.id,
                        createdAt: { gt: currentUserParticipant.lastReadAt || new Date(0) },
                        senderId: { not: userId },
                    },
                });
            }

            let title = c.name;
            
            // For group info, only count/show ACTIVE participants
            const activeParticipants = c.participants.filter(p => !p.hasLeft);
            let participantInfo = `${activeParticipants.length} members`;

            if (c.type === 'DIRECT') {
              const otherParticipant = c.participants.find((p) => p.userId !== userId);
              title = `${otherParticipant?.user.firstName || ''} ${otherParticipant?.user.lastName || ''}`.trim();
              participantInfo = title;
            }

            return { 
                id: c.id, 
                type: 'conversation', 
                title, 
                lastMessage: c.messages[0]?.content || 'Conversation started.', 
                participantInfo, 
                updatedAt: c.updatedAt, 
                unreadCount, 
                conversationType: c.type,
                // Only return active participants for the avatar stack
                participants: activeParticipants.map(p => p.user) 
            };
          })
        );

        const ticketItems = await Promise.all(
          tickets.map(async (t) => {
              const lastReadAt = t.readStatus[0]?.lastReadAt || new Date(0);
              let unreadCount = 0;
      
              if (isSaasAdmin) {
                  unreadCount = await prisma.ticketMessage.count({
                      where: {
                          ticketId: t.id,
                          createdAt: { gt: lastReadAt },
                          senderId: { not: userId } 
                      }
                  });
              } else {
                  unreadCount = await prisma.ticketMessage.count({
                      where: {
                          ticketId: t.id,
                          createdAt: { gt: lastReadAt },
                          sender: { role: 'ADMIN' }
                      }
                  });
              }
              
              return {
                  id: t.id,
                  type: 'ticket',
                  title: t.subject,
                  lastMessage: t.messages[0]?.content || 'Ticket created.',
                  participantInfo: 'Support Team',
                  updatedAt: t.updatedAt,
                  unreadCount: unreadCount,
                  priority: t.priority,
                  participants: [t.creator]
              };
          })
        );
        
        const result = [...conversationItems, ...ticketItems].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return result;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred fetching communication list.');
      }
    },

    getConversation: async (_: any, { id, cursor, limit = MESSAGES_PAGE_SIZE }: { id: string; cursor?: string; limit?: number }, context: GraphQLContext) => {
      const source = 'Query: getConversation';
      try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        
        const currentUserParticipant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: id, userId }
        });
        if (!currentUserParticipant) throw new GraphQLError('Access denied');

        const conversation = await prisma.conversation.findFirst({
          where: { id },
          include: {
            participants: { 
                where: { hasLeft: false }, 
                include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true } } } 
            },
          },
        });
        if (!conversation) throw new GraphQLError('Conversation not found.');

        // Fetch paginated messages
        const messagesRaw = await prisma.message.findMany({
            where: { conversationId: id },
            take: limit + 1, // Fetch one extra to check if there are more
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
        });

        const hasMoreMessages = messagesRaw.length > limit;
        let messages = hasMoreMessages ? messagesRaw.slice(0, limit) : messagesRaw;

        if (currentUserParticipant.hasLeft && currentUserParticipant.leftAt) {
            const kickDate = new Date(currentUserParticipant.leftAt);
            messages = messages.filter(m => new Date(m.createdAt) <= kickDate);
        }

        const flattenedConversation = {
            ...conversation,
            messages: messages.reverse(),
            participants: conversation.participants.map(p => p.user),
            hasMoreMessages,
        };

        return flattenedConversation;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred fetching the conversation.');
      }
    },

    getTicket: async (_: any, { id, cursor, limit = MESSAGES_PAGE_SIZE }: { id: string, cursor?: string; limit?: number }, context: GraphQLContext) => {
      const source = 'Query: getTicket';
       try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            creator: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true } },
          },
        });
        if (!ticket) throw new GraphQLError('Ticket not found.');
        const isSaasAdmin = context.user?.role === 'ADMIN';
        if (ticket.creatorId !== userId && !isSaasAdmin) throw new GraphQLError('Access denied');
        
        // Fetch paginated messages
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
        
        return { 
          ...ticket, 
          messages: messages.reverse().map(msg => ({ 
            ...msg, 
            ticketId: ticket.id,
            isSupport: msg.sender.role === 'ADMIN' 
          })),
          hasMoreMessages
        };
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred fetching the ticket.');
      }
    },
  },

  // --- MUTATIONS ---
  Mutation: {
     userIsTyping: async (_: any, { conversationId }: { conversationId: string }, context: GraphQLContext) => {
      const source = 'Mutation: userIsTyping';
      try {
        const userId = context.user?.id;
        if (!userId) return false;

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true } });
        if (!user) return false;

        const payload = {
          typingUser: { ...user, conversationId }
        };
        
        await pubsub.publish(Topics.USER_IS_TYPING, payload);

        return true;
      } catch (error: any) {
        return false;
      }
    },

    createDirectConversation: async (_: any, { input }: { input: { workspaceId: string, participantId: string } }, context: GraphQLContext) => {
      const source = 'Mutation: createDirectConversation';
      try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const { workspaceId, participantId } = input;
        if (userId === participantId) throw new GraphQLError('Cannot create a direct conversation with yourself.');
        
        const existingConversation = await prisma.conversation.findFirst({
            where: { workspaceId, type: 'DIRECT', participants: { every: { userId: { in: [userId, participantId] } } } }
        });

        if (existingConversation) {
             const count = await prisma.conversationParticipant.count({ where: { conversationId: existingConversation.id }});
             if (count === 2) {
                 const fullExisting = await prisma.conversation.findUnique({
                    where: { id: existingConversation.id },
                    include: { participants: { include: { user: true } } }
                 });
                 if(fullExisting) {
                    return { ...fullExisting, participants: fullExisting.participants.map(p => p.user) };
                 }
             }
        }

        const conversation = await prisma.conversation.create({
            data: { 
                workspaceId, 
                type: 'DIRECT', 
                participants: { create: [{ userId }, { userId: participantId }] },
            },
            include: { participants: { include: { user: true } } } 
        });

        const payload = await createCommunicationListItemPayload(conversation, 'conversation', userId);
        await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });

        return { ...conversation, participants: conversation.participants.map(p => p.user) };
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred creating a direct conversation.');
      }
    },
    
    createGroupConversation: async (_: any, { input }: { input: { workspaceId: string; name: string; participantIds: string[] } }, context: GraphQLContext) => {
      const source = 'Mutation: createGroupConversation';
      try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const { workspaceId, name, participantIds } = input;
        const allParticipantIds = [...new Set([...participantIds, userId])];
        if (allParticipantIds.length < 2) throw new GraphQLError('Group conversations require at least two participants.');
        
        const conversation = await prisma.conversation.create({
          data: { 
              workspaceId, 
              name, 
              type: 'GROUP', 
              creatorId: userId, // Track Creator
              participants: { create: allParticipantIds.map((id) => ({ userId: id })) } 
          },
          include: { participants: { include: { user: true } } } 
        });

        const payload = await createCommunicationListItemPayload(conversation, 'conversation', userId);
        await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });

        return { ...conversation, participants: conversation.participants.map(p => p.user) };
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred creating a group conversation.');
      }
    },

    createTicket: async (_: any, { input }: { input: { workspaceId: string; subject: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; message: string } }, context: GraphQLContext) => {
        const source = 'Mutation: createTicket';
        try {
          const userId = context.user?.id;
          if (!userId) throw new GraphQLError('Not authenticated');
      
          const [ticket, workspace] = await prisma.$transaction([
            prisma.ticket.create({
              data: {
                workspaceId: input.workspaceId,
                subject: input.subject,
                priority: input.priority,
                creatorId: userId,
                messages: {
                  create: {
                    senderId: userId,
                    content: input.message,
                  },
                },
              },
              include: { 
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }, 
                creator: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } }
              }, 
            }),
            prisma.workspace.findUnique({
                where: { id: input.workspaceId },
                select: { id: true, name: true, plan: true }
            })
          ]);
      
          await prisma.ticketReadStatus.create({
              data: {
                  ticketId: ticket.id,
                  userId: userId,
                  lastReadAt: new Date()
              }
          });
      
          // Publish to user's communication list
          const userPayload = await createCommunicationListItemPayload(ticket, 'ticket', userId);
          await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: userPayload });
          
          // Publish to admin's support ticket list
          if (workspace) {
              const adminPayload = {
                  id: ticket.id,
                  subject: ticket.subject,
                  status: ticket.status, // Default is OPEN
                  priority: ticket.priority,
                  updatedAt: ticket.updatedAt,
                  unreadCount: 1, // The first message is unread for admins
                  creator: ticket.creator,
                  workspace: workspace,
              };
              await pubsub.publish(Topics.ADMIN_TICKET_ADDED, { adminTicketAdded: adminPayload });
          } else {
          }
          
          return ticket;
        } catch (error: any) {
          throw new GraphQLError(error.message || 'An error occurred creating the ticket.');
        }
      },
    
    sendMessage: async (_: any, { input }: { input: { conversationId: string; content: string } }, context: GraphQLContext) => {
      const source = 'Mutation: sendMessage';
      try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const { conversationId, content } = input;
        
        // Ensure user is an ACTIVE participant
        const participant = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
        if (!participant || participant.hasLeft) throw new GraphQLError('You are not a member of this conversation.');
        
        const [newMessage] = await prisma.$transaction([
            prisma.message.create({
                data: { conversationId, senderId: userId, content },
                include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true } } },
            }),
            prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
        ]);
        
        const payload = { messageAdded: newMessage };
        await pubsub.publish(Topics.MESSAGE_ADDED, payload);
        return newMessage;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred sending the message.');
      }
    },

    sendTicketMessage: async (_: any, { input }: { input: { ticketId: string; content: string } }, context: GraphQLContext) => {
      const source = 'Mutation: sendTicketMessage';
      try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');

        const isSaasAdmin = context.user?.role === 'ADMIN';
        const ticket = await prisma.ticket.findUnique({ where: { id: input.ticketId } });
        if (!ticket) throw new GraphQLError('Ticket not found.');
        if (ticket.creatorId !== userId && !isSaasAdmin) throw new GraphQLError('Access denied');

        const [newTicketMessage] = await prisma.$transaction([
            prisma.ticketMessage.create({
                data: { ticketId: input.ticketId, senderId: userId, content: input.content },
                include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true, role: true } } },
            }),
            prisma.ticket.update({ where: { id: input.ticketId }, data: { updatedAt: new Date() } }),
        ]);

        const messageWithSupportFlag = { 
          ...newTicketMessage, 
          ticketId: input.ticketId,
          isSupport: newTicketMessage.sender.role === 'ADMIN' 
        };
        
        const payloadToPublish = {
            ticketAuthorizer: { ticketCreatorId: ticket.creatorId, workspaceId: ticket.workspaceId },
            ticketMessageAdded: messageWithSupportFlag,
        };
        await pubsub.publish(Topics.TICKET_MESSAGE_ADDED, payloadToPublish);
        
        const updatedTicketPayload = await getAdminTicketListItemPayload(input.ticketId);
        if (updatedTicketPayload) {
            await pubsub.publish(Topics.ADMIN_TICKET_UPDATED, { adminTicketUpdated: updatedTicketPayload });
        }
        
        return messageWithSupportFlag;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred sending the ticket message.');
      }
    },
    
    markConversationAsRead: async (_: any, { conversationId }: { conversationId: string }, context: GraphQLContext) => {
      const source = 'Mutation: markConversationAsRead';
      try {
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        await prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { lastReadAt: new Date() },
        });
        return true;
      } catch (error: any) {
        throw new GraphQLError(error.message || 'An error occurred marking as read.');
      }
    },

    markTicketAsRead: async (_: any, { ticketId }: { ticketId: string }, context: GraphQLContext) => {
        const source = 'Mutation: markTicketAsRead';
        try {
            const userId = context.user?.id;
            if (!userId) throw new GraphQLError('Not authenticated');
    
            const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
            if (!ticket) throw new GraphQLError('Ticket not found.');
            const isSaasAdmin = context.user?.role === 'ADMIN';
            if (ticket.creatorId !== userId && !isSaasAdmin) throw new GraphQLError('Access denied');
    
            await prisma.ticketReadStatus.upsert({
                where: { ticketId_userId: { ticketId, userId } },
                update: { lastReadAt: new Date() },
                create: { ticketId, userId, lastReadAt: new Date() },
            });
            return true;
        } catch (error: any) {
            throw new GraphQLError('An error occurred marking ticket as read.');
        }
    },

    addParticipants: async (_: any, { conversationId, participantIds }: { conversationId: string, participantIds: string[] }, context: GraphQLContext) => {
        const source = 'Mutation: addParticipants';
        try {
            const userId = context.user?.id;
            if (!userId) throw new GraphQLError('Not authenticated');

            const participant = await prisma.conversationParticipant.findFirst({
                where: { conversationId, userId, hasLeft: false }
            });
            if (!participant) throw new GraphQLError('You are not a participant of this conversation.');

            await prisma.$transaction(
                participantIds.map(id => 
                    prisma.conversationParticipant.upsert({
                        where: { conversationId_userId: { conversationId, userId: id } },
                        update: { hasLeft: false, leftAt: null, joinedAt: new Date() },
                        create: { conversationId, userId: id, hasLeft: false }
                    })
                )
            );

            const conversation = await prisma.conversation.findUnique({ 
                where: { id: conversationId }, 
                include: { participants: { include: { user: true } } }
            });
            
            if(conversation) {
                const payload = await createCommunicationListItemPayload(conversation, 'conversation', userId);
                await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });
            }

            return true;
        } catch (error: any) {
            throw new GraphQLError('Failed to add participants');
        }
    },

    leaveConversation: async (_: any, { conversationId }: { conversationId: string }, context: GraphQLContext) => {
        const source = 'Mutation: leaveConversation';
        try {
            const userId = context.user?.id;
            if (!userId) throw new GraphQLError('Not authenticated');
            
            await prisma.conversationParticipant.update({
                where: { conversationId_userId: { conversationId, userId } },
                data: { hasLeft: true, leftAt: new Date() }
            });
            return true;
        } catch (error: any) {
            throw new GraphQLError('Could not leave conversation.');
        }
    },

    removeParticipant: async (_: any, { conversationId, userId }: { conversationId: string, userId: string }, context: GraphQLContext) => {
        const source = 'Mutation: removeParticipant';
        try {
            const currentUserId = context.user?.id;
            if (!currentUserId) throw new GraphQLError('Not authenticated');

            const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
            if (!conversation) throw new GraphQLError('Conversation not found');
            
            if (conversation.creatorId !== currentUserId) throw new GraphQLError('Only the group creator can remove participants.');

            await prisma.conversationParticipant.update({
                where: { conversationId_userId: { conversationId, userId } },
                data: { hasLeft: true, leftAt: new Date() }
            });

            await pubsub.publish('PARTICIPANT_REMOVED', { 
                participantRemoved: { conversationId, userId } 
            });

            return true;
        } catch (error: any) {
            throw new GraphQLError('Could not remove participant.');
        }
    }
  },

  // --- SUBSCRIPTIONS ---
  Subscription: {
    participantRemoved: {
        subscribe: withFilter(
            () => pubsub.asyncIterableIterator(['PARTICIPANT_REMOVED']),
            (_payload, _, context?: GraphQLContext) => {
                if (!context || !context.user) return false;
                const userId = context.user?.id;
                return !!userId;
            }
        )
    },

    communicationItemAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.COMMUNICATION_ITEM_ADDED]),
        async (payload, variables, context?: GraphQLContext) => {
          const userId = context?.user?.id;
          if (!userId) return false;
          
          const item = payload.communicationItemAdded;
          const workspaceId = item.workspaceId;
          
          if (workspaceId !== variables.workspaceId) return false;
          
          const participants = item.participants || [];
          const isParticipant = participants.some((p: any) => p.id === userId);
          const isAdmin = context.user?.role === 'ADMIN';

          if (item.type === 'ticket' && isAdmin) return true;

          return isParticipant;
        }
      )
    },
    
    typingUser: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.USER_IS_TYPING]),
        (payload, variables, context?: GraphQLContext) => {
          const loggedInUserId = context?.user?.id;
          if (!loggedInUserId) return false;
          if (loggedInUserId === payload.typingUser.id) return false;
          if (payload.typingUser.conversationId !== variables.conversationId) return false;
          return true;
        }
      ),
    },

    ticketMessageAdded: {
      resolve: (payload: { ticketMessageAdded: any; }) => payload.ticketMessageAdded,
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.TICKET_MESSAGE_ADDED]),
        (payload, variables, context: GraphQLContext = { prisma }) => {
            const isAdmin = context.user?.role === 'ADMIN';

            if (isAdmin) {
                return true;
            }

            if (variables.workspaceId && payload.ticketAuthorizer.workspaceId !== variables.workspaceId) {
                return false;
            }

            const userId = context.user?.id;
            if (!userId) return false;

            return payload.ticketAuthorizer.ticketCreatorId === userId;
        }
      ),
    },

    messageAdded: {
      resolve: (payload: { messageAdded: any; }) => payload.messageAdded,
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.MESSAGE_ADDED]),
        async (payload, variables, context?: GraphQLContext) => {
          const userId = context?.user?.id;
          if (!userId) return false;

          const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: payload.messageAdded.conversationId, userId }
          });
          
          if (!participant || participant.hasLeft) return false;

          if (variables.conversationId) {
             return payload.messageAdded.conversationId === variables.conversationId;
          }
          if (variables.workspaceId) {
             return true;
          }
          return false;
        }
      ),
    },
  },
};
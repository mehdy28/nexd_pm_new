import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
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

// Helper to create a consistent payload for the communication list
const createCommunicationListItemPayload = async (item: any, type: 'conversation' | 'ticket', userId: string) => {
  if (type === 'conversation') {
    const participantInfo = item.type === 'DIRECT' 
      ? `${item.participants.find((p: any) => p.userId !== userId)?.user.firstName} ${item.participants.find((p: any) => p.userId !== userId)?.user.lastName}`.trim()
      : `${item.participants.length} members`;
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
      workspaceId: item.workspaceId, // For filtering
    };
  } else { // ticket
    return {
      id: item.id,
      type: 'ticket',
      title: item.subject,
      lastMessage: item.messages[0]?.content || 'Ticket created.',
      participantInfo: 'Support Team',
      updatedAt: item.updatedAt,
      unreadCount: 1, // Start as unread for support team
      priority: item.priority,
      workspaceId: item.workspaceId, // For filtering
    };
  }
};


export const messagingResolvers = {
  // --- QUERIES ---
  Query: {
    getWorkspaceMembers: async (_: any, { workspaceId }: { workspaceId: string }, context: GraphQLContext) => {
      const source = 'Query: getWorkspaceMembers';
      try {
        log(source, 'Fired', { workspaceId });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        
        log(source, 'Checking membership for user', { userId, workspaceId });
        const member = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
        if (!member) throw new GraphQLError('Access denied');
        
        log(source, 'Fetching all members');
        const members = await prisma.workspaceMember.findMany({
          where: { workspaceId },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
          orderBy: { user: { firstName: 'asc' } },
        });

        log(source, 'Successfully fetched members', { count: members.length });
        return members;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred fetching workspace members.');
      }
    },
    
    getCommunicationList: async (_: any, { workspaceId }: { workspaceId: string }, context: GraphQLContext) => {
      const source = 'Query: getCommunicationList';
      try {
        log(source, 'Fired', { workspaceId });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');

        const member = await prisma.workspaceMember.findFirst({ where: { userId, workspaceId } });
        if (!member) throw new GraphQLError('Access denied to workspace resources');
        
        const conversations = await prisma.conversation.findMany({
          where: { workspaceId, participants: { some: { userId } } },
          include: {
            participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: { updatedAt: 'desc' },
        });
        
        const isSaasAdmin = context.user?.role === 'ADMIN';
        const tickets = await prisma.ticket.findMany({
          where: { workspaceId, ...(isSaasAdmin ? {} : { creatorId: userId }) },
          include: {
            creator: { select: { id: true, firstName: true, lastName: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const conversationItems = await Promise.all(
          conversations.map(async (c) => {
            const currentUserParticipant = c.participants.find((p) => p.userId === userId);
            const unreadCount = await prisma.message.count({
              where: {
                conversationId: c.id,
                createdAt: { gt: currentUserParticipant?.lastReadAt || new Date(0) },
                senderId: { not: userId },
              },
            });
            let title = c.name;
            let participantInfo = `${c.participants.length} members`;
            if (c.type === 'DIRECT') {
              const otherParticipant = c.participants.find((p) => p.userId !== userId);
              title = `${otherParticipant?.user.firstName || ''} ${otherParticipant?.user.lastName || ''}`.trim();
              participantInfo = title;
            }
            return { id: c.id, type: 'conversation', title, lastMessage: c.messages[0]?.content || 'Conversation started.', participantInfo, updatedAt: c.updatedAt, unreadCount, conversationType: c.type };
          })
        );
        const ticketItems = tickets.map((t) => ({ id: t.id, type: 'ticket', title: t.subject, lastMessage: t.messages[0]?.content || 'Ticket created.', participantInfo: 'Support Team', updatedAt: t.updatedAt, unreadCount: 0, priority: t.priority }));
        
        const result = [...conversationItems, ...ticketItems].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        log(source, 'Successfully fetched communication list', { itemCount: result.length });
        return result;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred fetching communication list.');
      }
    },

    getConversation: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const source = 'Query: getConversation';
      try {
        log(source, 'Fired', { id });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const conversation = await prisma.conversation.findFirst({
          where: { id, participants: { some: { userId } } },
          include: {
            participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
            messages: { include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
          },
        });
        if (!conversation) throw new GraphQLError('Conversation not found or access denied.');
        log(source, 'Successfully fetched conversation');
        return conversation;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred fetching the conversation.');
      }
    },

    getTicket: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const source = 'Query: getTicket';
       try {
        log(source, 'Fired', { id });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            messages: {
              include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (!ticket) throw new GraphQLError('Ticket not found.');
        const isSaasAdmin = context.user?.role === 'ADMIN';
        if (ticket.creatorId !== userId && !isSaasAdmin) throw new GraphQLError('Access denied');
        log(source, 'Successfully fetched ticket');
        return { ...ticket, messages: ticket.messages.map(msg => ({ ...msg, isSupport: msg.sender.role === 'ADMIN' })) };
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
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
        
        // Assumes USER_IS_TYPING is added to Topics enum in pubsub.ts
        await pubsub.publish(Topics.USER_IS_TYPING, payload);

        return true;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        return false;
      }
    },

    createDirectConversation: async (_: any, { input }: { input: { workspaceId: string, participantId: string } }, context: GraphQLContext) => {
      const source = 'Mutation: createDirectConversation';
      try {
        log(source, 'Fired', { input });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const { workspaceId, participantId } = input;
        if (userId === participantId) throw new GraphQLError('Cannot create a direct conversation with yourself.');
        const existingConversation = await prisma.conversation.findFirst({
            where: { workspaceId, type: 'DIRECT', participants: { every: { userId: { in: [userId, participantId] } } } }
        });
        if (existingConversation) {
          log(source, 'Found existing conversation', { id: existingConversation.id });
          return existingConversation;
        }
        log(source, 'Creating new conversation');
        const conversation = await prisma.conversation.create({
            data: { workspaceId, type: 'DIRECT', participants: { create: [{ userId }, { userId: participantId }] } },
            include: { participants: { include: { user: true } } } // Include data for payload
        });

        const payload = await createCommunicationListItemPayload(conversation, 'conversation', userId);
        // Assumes COMMUNICATION_ITEM_ADDED is added to Topics enum in pubsub.ts
        await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });

        return conversation;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred creating a direct conversation.');
      }
    },
    
    createGroupConversation: async (_: any, { input }: { input: { workspaceId: string; name: string; participantIds: string[] } }, context: GraphQLContext) => {
      const source = 'Mutation: createGroupConversation';
      try {
        log(source, 'Fired', { input });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const { workspaceId, name, participantIds } = input;
        const allParticipantIds = [...new Set([...participantIds, userId])];
        if (allParticipantIds.length < 2) throw new GraphQLError('Group conversations require at least two participants.');
        log(source, 'Creating new group conversation');
        const conversation = await prisma.conversation.create({
          data: { workspaceId, name, type: 'GROUP', participants: { create: allParticipantIds.map((id) => ({ userId: id })) } },
          include: { participants: true } // Include data for payload
        });

        const payload = await createCommunicationListItemPayload(conversation, 'conversation', userId);
        // Assumes COMMUNICATION_ITEM_ADDED is added to Topics enum in pubsub.ts
        await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });

        return conversation;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred creating a group conversation.');
      }
    },

    createTicket: async (_: any, { input }: { input: { workspaceId: string; subject: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; message: string } }, context: GraphQLContext) => {
      const source = 'Mutation: createTicket';
      try {
        log(source, 'Fired', { input });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');

        // CORRECTED: Do not spread input. Construct the data object explicitly.
        const ticket = await prisma.ticket.create({
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
          include: { messages: true }, // Include data for payload
        });

        const payload = await createCommunicationListItemPayload(ticket, 'ticket', userId);
        // Assumes COMMUNICATION_ITEM_ADDED is added to Topics enum in pubsub.ts
        await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });
        
        return ticket;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred creating the ticket.');
      }
    },
    
    sendMessage: async (_: any, { input }: { input: { conversationId: string; content: string } }, context: GraphQLContext) => {
      const source = 'Mutation: sendMessage';
      try {
        log(source, 'Fired', { input });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        const { conversationId, content } = input;
        const participant = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
        if (!participant) throw new GraphQLError('You are not a member of this conversation.');
        const [newMessage] = await prisma.$transaction([
            prisma.message.create({
                data: { conversationId, senderId: userId, content },
                include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            }),
            prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
        ]);
        const payload = { messageAdded: newMessage };
        log(source, `Publishing to topic: ${Topics.MESSAGE_ADDED}`, payload);
        await pubsub.publish(Topics.MESSAGE_ADDED, payload);
        return newMessage;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred sending the message.');
      }
    },

    sendTicketMessage: async (_: any, { input }: { input: { ticketId: string; content: string } }, context: GraphQLContext) => {
      const source = 'Mutation: sendTicketMessage';
      try {
        log(source, 'Fired', { input });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');

        log(source, 'Validating user can post to ticket');
        const isSaasAdmin = context.user?.role === 'ADMIN';
        const ticket = await prisma.ticket.findUnique({ where: { id: input.ticketId } });
        if (!ticket) throw new GraphQLError('Ticket not found.');
        if (ticket.creatorId !== userId && !isSaasAdmin) throw new GraphQLError('Access denied');
        log(source, 'Validation successful');

        log(source, 'Starting transaction to create message');
        const [newTicketMessage] = await prisma.$transaction([
            prisma.ticketMessage.create({
                data: { ticketId: input.ticketId, senderId: userId, content: input.content },
                include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
            }),
            prisma.ticket.update({ where: { id: input.ticketId }, data: { updatedAt: new Date() } }),
        ]);
        log(source, 'Transaction successful');

        const messageWithSupportFlag = { ...newTicketMessage, isSupport: newTicketMessage.sender.role === 'ADMIN' };
        
        const payloadToPublish = {
            ticketAuthorizer: { ticketCreatorId: ticket.creatorId },
            ticketMessageAdded: messageWithSupportFlag,
        };
        log(source, `Publishing to topic: ${Topics.TICKET_MESSAGE_ADDED}`, payloadToPublish);
        await pubsub.publish(Topics.TICKET_MESSAGE_ADDED, payloadToPublish);
        
        log(source, 'Publish complete. Returning new message.');
        return messageWithSupportFlag;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred sending the ticket message.');
      }
    },
    
    markConversationAsRead: async (_: any, { conversationId }: { conversationId: string }, context: GraphQLContext) => {
      const source = 'Mutation: markConversationAsRead';
      try {
        log(source, 'Fired', { conversationId });
        const userId = context.user?.id;
        if (!userId) throw new GraphQLError('Not authenticated');
        await prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { lastReadAt: new Date() },
        });
        log(source, 'Successfully updated lastReadAt');
        return true;
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred marking as read.');
      }
    },
    
    updateTicketStatus: async (_: any, { ticketId, status }: { ticketId: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }, context: GraphQLContext) => {
      const source = 'Mutation: updateTicketStatus';
      try {
        log(source, 'Fired', { ticketId, status });
        if (context.user?.role !== 'ADMIN') throw new GraphQLError('Only administrators can update ticket status.');
        return prisma.ticket.update({ where: { id: ticketId }, data: { status, ...(status === 'RESOLVED' && { resolvedAt: new Date() }) } });
      } catch (error: any) {
        log(source, 'ERROR', { error: error.message });
        throw new GraphQLError(error.message || 'An error occurred updating ticket status.');
      }
    },
  },

  // --- SUBSCRIPTIONS ---
  Subscription: {
    communicationItemAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.COMMUNICATION_ITEM_ADDED]),
        async (payload, variables, context: GraphQLContext) => {
          const userId = context.user?.id;
          if (!userId) return false;

          const workspaceId = payload.communicationItemAdded.workspaceId;
          if (workspaceId !== variables.workspaceId) {
            return false;
          }
          
          // Check if user is a member of the workspace
          const memberCount = await prisma.workspaceMember.count({
            where: { userId, workspaceId }
          });
          
          return memberCount > 0;
        }
      )
    },
    
    typingUser: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.USER_IS_TYPING]),
        (payload, variables, context: GraphQLContext) => {
          const loggedInUserId = context.user?.id;
          if (!loggedInUserId) return false;

          const typingUserId = payload.typingUser.id;
          const conversationId = payload.typingUser.conversationId;

          // Don't send event to the user who is typing
          if (loggedInUserId === typingUserId) {
            return false;
          }
          // Only send to users in the correct conversation
          if (conversationId !== variables.conversationId) {
            return false;
          }
          return true;
        }
      ),
    },

    ticketMessageAdded: {
      resolve: (payload) => payload.ticketMessageAdded,
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.TICKET_MESSAGE_ADDED]),
        (payload, variables, context: GraphQLContext) => {
            const userId = context.user?.id;
            if (!userId) return false;
            if (payload.ticketMessageAdded.ticketId !== variables.ticketId) return false;
            
            const isCreator = payload.ticketAuthorizer.ticketCreatorId === userId;
            const isAdmin = context.user?.role === 'ADMIN';
            return isCreator || isAdmin;
        }
      ),
    },

    messageAdded: {
      resolve: (payload) => payload.messageAdded,
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.MESSAGE_ADDED]),
        async (payload, variables, context: GraphQLContext) => {
          const userId = context.user?.id;
          if (!userId) return false;

          if (payload.messageAdded.conversationId !== variables.conversationId) {
            return false;
          }
          
          const participant = await prisma.conversationParticipant.count({
            where: { conversationId: payload.messageAdded.conversationId, userId },
          });

          return participant > 0;
        }
      ),
    },
  },
};

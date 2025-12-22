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
        log(source, 'Fired', { workspaceId });
        const userId = context.user?.id;
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
        
        // 1. Check if user is associated with this conversation at all
        const currentUserParticipant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: id, userId }
        });
        if (!currentUserParticipant) throw new GraphQLError('Access denied');

        // 2. Fetch conversation with ALL participants (to calculate active ones later if needed)
        // or just fetch active ones using 'where' inside include
        const conversation = await prisma.conversation.findFirst({
          where: { id },
          include: {
            // Only include ACTIVE participants in the details list so kicked users don't show up in the "Members" list
            participants: { 
                where: { hasLeft: false }, 
                include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true } } } 
            },
            messages: { 
                include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true } } }, 
                orderBy: { createdAt: 'asc' } 
            },
          },
        });
        if (!conversation) throw new GraphQLError('Conversation not found.');
        
        // 3. Logic for Kicked Users:
        // If the current user has left, filter messages. They only see history up to the point they left.
        let messages = conversation.messages;
        if (currentUserParticipant.hasLeft && currentUserParticipant.leftAt) {
            const kickDate = new Date(currentUserParticipant.leftAt);
            messages = messages.filter(m => new Date(m.createdAt) <= kickDate);
        }

        const flattenedConversation = {
            ...conversation,
            messages,
            participants: conversation.participants.map(p => p.user)
        };

        log(source, 'Successfully fetched conversation');
        return flattenedConversation;
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
            creator: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true } },
            messages: {
              include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true , avatarColor : true, role: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (!ticket) throw new GraphQLError('Ticket not found.');
        const isSaasAdmin = context.user?.role === 'ADMIN';
        if (ticket.creatorId !== userId && !isSaasAdmin) throw new GraphQLError('Access denied');
        log(source, 'Successfully fetched ticket');
        return { 
          ...ticket, 
          messages: ticket.messages.map(msg => ({ 
            ...msg, 
            ticketId: ticket.id,
            isSupport: msg.sender.role === 'ADMIN' 
          })) 
        };
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
        
        // This subscription should also theoretically check if the user is kicked, 
        // but typing indicators are less critical security-wise.
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
              log(source, 'Published ADMIN_TICKET_ADDED event', { ticketId: ticket.id });
          } else {
              log(source, 'WARN', { warning: 'Workspace not found, could not publish ADMIN_TICKET_ADDED event', workspaceId: input.workspaceId });
          }
          
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
        log(source, 'ERROR', { error: error.message });
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
        log(source, 'ERROR', { error: error.message });
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
            log(source, 'ERROR', { error: error.message });
            throw new GraphQLError('An error occurred marking ticket as read.');
        }
    },

    addParticipants: async (_: any, { conversationId, participantIds }: { conversationId: string, participantIds: string[] }, context: GraphQLContext) => {
        const source = 'Mutation: addParticipants';
        try {
            const userId = context.user?.id;
            if (!userId) throw new GraphQLError('Not authenticated');

            // 1. Verify access: User must be an ACTIVE participant
            const participant = await prisma.conversationParticipant.findFirst({
                where: { conversationId, userId, hasLeft: false }
            });
            if (!participant) throw new GraphQLError('You are not a participant of this conversation.');

            // 2. Add new members
            // We use upsert to handle re-adding previously kicked members by resetting hasLeft to false
            await prisma.$transaction(
                participantIds.map(id => 
                    prisma.conversationParticipant.upsert({
                        where: { conversationId_userId: { conversationId, userId: id } },
                        update: { hasLeft: false, leftAt: null, joinedAt: new Date() },
                        create: { conversationId, userId: id, hasLeft: false }
                    })
                )
            );

            // 3. Notify clients. This ensures the new user sees the chat in their list immediately.
            const conversation = await prisma.conversation.findUnique({ 
                where: { id: conversationId }, 
                include: { participants: { include: { user: true } } }
            });
            
            if(conversation) {
                // Hacky way to trigger list refresh for relevant users. 
                // We fake a "new item" event payload.
                const payload = await createCommunicationListItemPayload(conversation, 'conversation', userId);
                await pubsub.publish(Topics.COMMUNICATION_ITEM_ADDED, { communicationItemAdded: payload });
            }

            return true;
        } catch (error: any) {
            log(source, 'ERROR', { error: error.message });
            throw new GraphQLError('Failed to add participants');
        }
    },

    leaveConversation: async (_: any, { conversationId }: { conversationId: string }, context: GraphQLContext) => {
        const source = 'Mutation: leaveConversation';
        try {
            const userId = context.user?.id;
            if (!userId) throw new GraphQLError('Not authenticated');
            
            // Soft delete: User marks themselves as 'hasLeft'
            await prisma.conversationParticipant.update({
                where: { conversationId_userId: { conversationId, userId } },
                data: { hasLeft: true, leftAt: new Date() }
            });
            return true;
        } catch (error: any) {
            log(source, 'ERROR', { error: error.message });
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

            // Soft delete: Mark target as 'hasLeft'
            await prisma.conversationParticipant.update({
                where: { conversationId_userId: { conversationId, userId } },
                data: { hasLeft: true, leftAt: new Date() }
            });

            // PUBLISH KICK EVENT
            // We use a custom topic string "PARTICIPANT_REMOVED" 
            await pubsub.publish('PARTICIPANT_REMOVED', { 
                participantRemoved: { conversationId, userId } 
            });

            return true;
        } catch (error: any) {
            log(source, 'ERROR', { error: error.message });
            throw new GraphQLError('Could not remove participant.');
        }
    }
  },

  // --- SUBSCRIPTIONS ---
  Subscription: {
    participantRemoved: {
        subscribe: withFilter(
            () => pubsub.asyncIterableIterator(['PARTICIPANT_REMOVED']),
            (payload, _, context: GraphQLContext) => {
                const userId = context.user?.id;
                // Only fire if the removed user is the current user (so they know they were kicked)
                // OR if the current user is a participant of that conversation (to update their member list)
                // For now, simpler: Just fire if authenticated. Frontend handles what to do.
                return !!userId;
            }
        )
    },

    communicationItemAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.COMMUNICATION_ITEM_ADDED]),
        async (payload, variables, context: GraphQLContext) => {
          const userId = context.user?.id;
          if (!userId) return false;
          
          const item = payload.communicationItemAdded;
          const workspaceId = item.workspaceId;
          
          if (workspaceId !== variables.workspaceId) return false;
          
          // GOAL 2: Strict visibility check
          // The payload 'participants' includes the creator for tickets, and members for convos.
          // We check if the current userId is in that list.
          // Admin can see all tickets, so we check role too.
          const participants = item.participants || [];
          const isParticipant = participants.some((p: any) => p.id === userId);
          const isAdmin = context.user?.role === 'ADMIN';

          // If it's a ticket and user is admin, allow it.
          if (item.type === 'ticket' && isAdmin) return true;

          return isParticipant;
        }
      )
    },
    
    typingUser: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.USER_IS_TYPING]),
        (payload, variables, context: GraphQLContext) => {
          const loggedInUserId = context.user?.id;
          if (!loggedInUserId) return false;
          if (loggedInUserId === payload.typingUser.id) return false;
          if (payload.typingUser.conversationId !== variables.conversationId) return false;
          return true;
        }
      ),
    },

    ticketMessageAdded: {
      resolve: (payload) => payload.ticketMessageAdded,
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([Topics.TICKET_MESSAGE_ADDED]),
        (payload, variables, context: GraphQLContext) => {
            const isAdmin = context.user?.role === 'ADMIN';

            // Admins receive all ticket messages, no filtering needed.
            if (isAdmin) {
                return true;
            }

            // For regular users, filter by workspaceId
            if (variables.workspaceId && payload.ticketAuthorizer.workspaceId !== variables.workspaceId) {
                return false;
            }

            const userId = context.user?.id;
            if (!userId) return false;

            // And ensure they are the creator of the ticket
            return payload.ticketAuthorizer.ticketCreatorId === userId;
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

          // Check if user is a valid participant AND hasn't been kicked/left
          const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: payload.messageAdded.conversationId, userId }
          });
          
          // If participant doesn't exist OR hasLeft is true, DO NOT send the message
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

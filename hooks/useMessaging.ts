import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useLazyQuery, useMutation, useSubscription, useApolloClient, gql } from '@apollo/client';
import { 
  CREATE_TICKET, 
  CREATE_GROUP_CONVERSATION, 
  SEND_MESSAGE, 
  SEND_TICKET_MESSAGE, 
  CREATE_DIRECT_CONVERSATION, 
  USER_IS_TYPING, 
  MARK_CONVERSATION_AS_READ,
  LEAVE_CONVERSATION,
  REMOVE_PARTICIPANT,
  ADD_PARTICIPANTS
} from '@/graphql/mutations/messagingMutations';
import { 
  MESSAGE_ADDED_SUBSCRIPTION, 
  TICKET_MESSAGE_ADDED_SUBSCRIPTION, 
  TYPING_USER_SUBSCRIPTION, 
  COMMUNICATION_ITEM_ADDED_SUBSCRIPTION,
  PARTICIPANT_REMOVED_SUBSCRIPTION
} from '@/graphql/subscriptions/messagingSubscription';
import { GET_MESSAGING_DATA, GET_CONVERSATION_DETAILS, GET_TICKET_DETAILS } from '@/graphql/queries/messagingQuerries';
import { debounce } from 'lodash';
import { useUser } from '@/hooks/useUser';

// ---------------------------------------------------------------- //
//                          TYPE DEFINITIONS                        //
// ---------------------------------------------------------------- //
export interface TypingUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface UserAvatarPartial {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  avatarColor?: string | null; 
  __typename?: 'UserAvatarPartial';
}

export interface CommunicationItem {
  id: string;
  type: 'conversation' | 'ticket';
  title: string;
  lastMessage: string | null;
  participantInfo: string;
  updatedAt: string; // ISO Date String
  unreadCount: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  conversationType?: 'DIRECT' | 'GROUP';
  participants?: UserAvatarPartial[];
  __typename?: 'CommunicationListItem';
}

export interface WorkspaceMember {
  id: string; // ID of the WorkspaceMember record
  role: string;
  user: UserAvatarPartial & { email: string };
}

export interface Message {
  id: string;
  content: string;
  createdAt: string; // ISO Date String
  sender: UserAvatarPartial;
  __typename?: 'Message';
}

export interface TicketMessage extends Message {
  isSupport: boolean;
  __typename?: 'TicketMessage';
}

export interface ConversationDetails {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  creatorId?: string;
  participants: UserAvatarPartial[]; 
  messages: Message[];
}

export interface TicketDetails {
  id: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  creator: UserAvatarPartial;
  messages: TicketMessage[];
  createdAt: string; // ISO Date String
}

// ---------------------------------------------------------------- //
//                         THE CUSTOM HOOK                          //
// ---------------------------------------------------------------- //

interface UseMessagingParams {
  workspaceId: string;
}

export const useMessaging = ({ workspaceId }: UseMessagingParams) => {
  const client = useApolloClient();
  const { user: currentUser } = useUser();
  const [selectedItem, setSelectedItem] = useState<CommunicationItem | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const { data, loading, error, refetch } = useQuery<{ getCommunicationList: CommunicationItem[], getWorkspaceMembers: WorkspaceMember[] }>(GET_MESSAGING_DATA, {
    variables: { workspaceId },
    skip: !workspaceId,
    fetchPolicy: 'cache-and-network',
  });

  const [getConversation, { data: conversationData, loading: conversationLoading }] = useLazyQuery<{ getConversation: ConversationDetails }>(GET_CONVERSATION_DETAILS);
  const [getTicket, { data: ticketData, loading: ticketLoading }] = useLazyQuery<{ getTicket: TicketDetails }>(GET_TICKET_DETAILS);

  const [sendMessageMutation, { loading: sendingMessage }] = useMutation(SEND_MESSAGE);
  const [sendTicketMessageMutation, { loading: sendingTicketMessage }] = useMutation(SEND_TICKET_MESSAGE);
  const [createTicketMutation] = useMutation(CREATE_TICKET);
  const [createDirectConversationMutation] = useMutation(CREATE_DIRECT_CONVERSATION);
  const [createGroupConversationMutation] = useMutation(CREATE_GROUP_CONVERSATION);
  const [userIsTypingMutation] = useMutation(USER_IS_TYPING);
  const [markAsReadMutation] = useMutation(MARK_CONVERSATION_AS_READ);
  const [leaveConversationMutation] = useMutation(LEAVE_CONVERSATION);
  const [removeParticipantMutation] = useMutation(REMOVE_PARTICIPANT);
  const [addParticipantsMutation] = useMutation(ADD_PARTICIPANTS);

  // Subscription for newly created tickets and conversations
  useSubscription(COMMUNICATION_ITEM_ADDED_SUBSCRIPTION, {
    variables: { workspaceId },
    skip: !workspaceId,
    onData: ({ client, data }) => {
      const newItem = data.data?.communicationItemAdded as CommunicationItem;
      if (!newItem) return;

      const query = GET_MESSAGING_DATA;
      try {
        const cachedData = client.readQuery<{ getCommunicationList: CommunicationItem[] }>({ query, variables: { workspaceId } });
        if (cachedData?.getCommunicationList) {
          if (cachedData.getCommunicationList.some(item => item.id === newItem.id)) return;
          
          const newList = [newItem, ...cachedData.getCommunicationList];
          client.writeQuery({ 
            query, 
            variables: { workspaceId }, 
            data: { ...cachedData, getCommunicationList: newList } 
          });
        }
      } catch (e) {
        console.warn("Could not update communication list cache with new item.", e);
      }
    }
  });

  // GOAL 1: Handle Instant Kick/Removal Updates
  useSubscription(PARTICIPANT_REMOVED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
        const removedInfo = data.data?.participantRemoved;
        if (!removedInfo) return;

        // If I am the one removed and I am looking at that chat
        if (removedInfo.userId === currentUser?.id) {
             if (selectedItem?.id === removedInfo.conversationId) {
                // Refresh details immediately. The backend will return the conversation, 
                // but since the user hasLeft=true, the 'isParticipant' check in UI will fail 
                // and the input box will disappear.
                getConversation({ 
                    variables: { id: removedInfo.conversationId }, 
                    fetchPolicy: 'network-only' 
                });
             }
        } else {
             // Someone else was removed. If I'm looking at that chat, refresh to update member list.
             if (selectedItem?.id === removedInfo.conversationId) {
                 getConversation({ 
                    variables: { id: removedInfo.conversationId }, 
                    fetchPolicy: 'network-only' 
                });
             }
        }
    }
  });

  // Main Message Subscription
  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { workspaceId },
    onData: ({ client, data }) => {
      const newMessage = data.data?.messageAdded;
      if (!newMessage) return;
      
      const isForCurrentChat = selectedItem?.id === newMessage.conversationId;

      if (isForCurrentChat && selectedItem?.type === 'conversation') {
        const queryOptions = { query: GET_CONVERSATION_DETAILS, variables: { id: selectedItem.id } };
        try {
          const cachedData = client.readQuery<{ getConversation: ConversationDetails }>(queryOptions);
          if (cachedData?.getConversation) {
            if (cachedData.getConversation.messages.some(m => m.id === newMessage.id)) return;

            client.writeQuery({ 
              ...queryOptions, 
              data: { getConversation: { ...cachedData.getConversation, messages: [...cachedData.getConversation.messages, newMessage] } } 
            });
          }
        } catch (e) {
          console.warn("Cache update failed for messageAdded (Details)", e);
        }
      } 
      
      const listQuery = GET_MESSAGING_DATA;
      try {
        const cachedList = client.readQuery<{ getCommunicationList: CommunicationItem[] }>({ query: listQuery, variables: { workspaceId } });
        if (cachedList?.getCommunicationList) {
           const updatedList = cachedList.getCommunicationList.map(item => {
              if (item.id === newMessage.conversationId) {
                 return {
                    ...item,
                    lastMessage: newMessage.content,
                    updatedAt: newMessage.createdAt,
                    unreadCount: !isForCurrentChat ? item.unreadCount + 1 : 0
                 };
              }
              return item;
           }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

           client.writeQuery({
              query: listQuery,
              variables: { workspaceId },
              data: { ...cachedList, getCommunicationList: updatedList }
           });
        }
      } catch (e) {
        console.warn("Cache update failed for messageAdded (List)", e);
      }
    },
  });

  useSubscription(TICKET_MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { ticketId: selectedItem?.id },
    skip: !selectedItem || selectedItem.type !== 'ticket',
    onData: ({ client, data }) => {
      const newMessage = data.data?.ticketMessageAdded;
      if (!newMessage || !selectedItem) return;
      
      const queryOptions = { query: GET_TICKET_DETAILS, variables: { id: selectedItem.id } };
      try {
        const cachedData = client.readQuery<{ getTicket: TicketDetails }>(queryOptions);
        if (cachedData?.getTicket) {
          client.writeQuery({ 
            ...queryOptions, 
            data: { getTicket: { ...cachedData.getTicket, messages: [...cachedData.getTicket.messages, newMessage] } } 
          });
        }
      } catch (e) {
        console.warn("Cache update failed for ticketMessageAdded", e);
      }
    },
  });

  useSubscription(TYPING_USER_SUBSCRIPTION, {
    variables: { conversationId: selectedItem?.id },
    skip: !selectedItem || selectedItem.type !== 'conversation',
    onData: ({ data }) => {
      const typingUser = data.data?.typingUser as TypingUser;
      if (!typingUser) return;

      if (typingTimeoutRef.current[typingUser.id]) {
        clearTimeout(typingTimeoutRef.current[typingUser.id]);
      }

      setTypingUsers(current => current.some(u => u.id === typingUser.id) ? current : [...current, typingUser]);

      typingTimeoutRef.current[typingUser.id] = setTimeout(() => {
        setTypingUsers(current => current.filter(u => u.id !== typingUser.id));
        delete typingTimeoutRef.current[typingUser.id];
      }, 3000);
    },
  });

  useEffect(() => {
    if (!selectedItem) return;
    setTypingUsers([]);
    if (selectedItem.type === 'conversation') {
      getConversation({ variables: { id: selectedItem.id } });
    } else if (selectedItem.type === 'ticket') {
      getTicket({ variables: { id: selectedItem.id } });
    }
  }, [selectedItem, getConversation, getTicket]);

  const handleSelectItem = useCallback((item: CommunicationItem | null) => {
    setSelectedItem(item);

    if (!item || item.unreadCount <= 0) {
      return;
    }

    const query = GET_MESSAGING_DATA;
    try {
      const cachedData = client.readQuery<{ getCommunicationList: CommunicationItem[] }>({ query, variables: { workspaceId } });
      if (cachedData?.getCommunicationList) {
        const newList = cachedData.getCommunicationList.map(cachedItem => 
          cachedItem.id === item.id ? { ...cachedItem, unreadCount: 0 } : cachedItem
        );
        client.writeQuery({
          query,
          variables: { workspaceId },
          data: { ...cachedData, getCommunicationList: newList }
        });
      }
    } catch (e) {
      console.error("Failed to optimistically update unread count in cache:", e);
    }
    
    if (item.type === 'conversation') {
      markAsReadMutation({ variables: { conversationId: item.id } });
    }
  }, [workspaceId, client, markAsReadMutation]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedItem || content.trim() === '') return;
    if (selectedItem.type === 'conversation') {
      await sendMessageMutation({ variables: { conversationId: selectedItem.id, content } });
    } else {
      await sendTicketMessageMutation({ variables: { ticketId: selectedItem.id, content } });
    }
  }, [selectedItem, sendMessageMutation, sendTicketMessageMutation]);

  const notifyTyping = useCallback(
    debounce(() => {
      if (selectedItem?.type === 'conversation') {
        userIsTypingMutation({ variables: { conversationId: selectedItem.id } });
      }
    }, 500),
    [selectedItem, userIsTypingMutation]
  );

  const handleCreateTicket = useCallback(async (data: { subject: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }) => {
    const response = await createTicketMutation({
      variables: { workspaceId, ...data },
    });
    return response.data?.createTicket;
  }, [workspaceId, createTicketMutation]);

  const handleLeaveConversation = useCallback(async (conversationId: string) => {
      await leaveConversationMutation({ variables: { conversationId }});
      // We do NOT remove the item from the list because the user can still see old messages
      // We just refresh the conversation details to update permissions
      getConversation({ variables: { id: conversationId }, fetchPolicy: 'network-only' });
  }, [leaveConversationMutation, getConversation]);

  const handleRemoveParticipant = useCallback(async (conversationId: string, userId: string) => {
      await removeParticipantMutation({ variables: { conversationId, userId }});
      // Refreshing happens via subscription now, but we can double check
      getConversation({ variables: { id: conversationId }, fetchPolicy: 'network-only' });
  }, [removeParticipantMutation, getConversation]);

  const handleAddParticipants = useCallback(async (conversationId: string, participantIds: string[]) => {
      await addParticipantsMutation({ variables: { conversationId, participantIds }});
      getConversation({ variables: { id: conversationId }, fetchPolicy: 'network-only' });
  }, [addParticipantsMutation, getConversation]);


  // Determine correct active details based on selected type
  let activeItemDetails: ConversationDetails | TicketDetails | undefined | null = null;
  if (selectedItem?.type === 'conversation') {
      activeItemDetails = conversationData?.getConversation;
  } else if (selectedItem?.type === 'ticket') {
      activeItemDetails = ticketData?.getTicket;
  }

  return {
    communicationList: data?.getCommunicationList || [],
    workspaceMembers: data?.getWorkspaceMembers || [],
    listLoading: loading,
    error, // Exposing the error object from useQuery
    refetch, // Exposing the refetch function from useQuery
    selectedItem,
    setSelectedItem: handleSelectItem,
    activeItemDetails,
    itemLoading: conversationLoading || ticketLoading,
    sendMessage: handleSendMessage,
    sendingMessage: sendingMessage || sendingTicketMessage,
    createTicket: handleCreateTicket,
    createDirectConversation: createDirectConversationMutation,
    createGroupConversation: createGroupConversationMutation,
    leaveConversation: handleLeaveConversation,
    removeParticipant: handleRemoveParticipant,
    addParticipants: handleAddParticipants,
    typingUsers,
    notifyTyping,
  };
};
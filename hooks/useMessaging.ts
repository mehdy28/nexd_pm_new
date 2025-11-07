// // hooks/useMessaging.ts
// import { useState, useEffect, useCallback, useRef } from 'react';
// import { useQuery, useLazyQuery, useMutation, useSubscription, ApolloClient, NormalizedCacheObject } from '@apollo/client';
// import { CREATE_TICKET, CREATE_GROUP_CONVERSATION, SEND_MESSAGE, SEND_TICKET_MESSAGE, CREATE_DIRECT_CONVERSATION, USER_IS_TYPING } from '@/graphql/mutations/messagingMutations';
// import { GET_MESSAGING_DATA, GET_CONVERSATION_DETAILS, GET_TICKET_DETAILS } from '@/graphql/queries/messagingQuerries';
// import { MESSAGE_ADDED_SUBSCRIPTION, TICKET_MESSAGE_ADDED_SUBSCRIPTION, TYPING_USER_SUBSCRIPTION } from '@/graphql/subscriptions/messagingSubscription';
// import { debounce } from 'lodash';

// // ---------------------------------------------------------------- //
// //                          TYPE DEFINITIONS                        //
// // ---------------------------------------------------------------- //
// export interface TypingUser {
//   id: string;
//   firstName: string | null;
//   lastName: string | null;
// }

// export interface CommunicationItem {
//   id: string;
//   type: 'conversation' | 'ticket';
//   title: string;
//   lastMessage: string | null;
//   participantInfo: string;
//   updatedAt: string; // ISO Date String
//   unreadCount: number;
// }

// export interface UserAvatarPartial {
//   id: string;
//   firstName: string | null;
//   lastName: string | null;
//   avatar: string | null;
// }

// export interface WorkspaceMember {
//   id: string; // ID of the WorkspaceMember record
//   role: string;
//   user: UserAvatarPartial & { email: string };
// }

// export interface Message {
//   id: string;
//   content: string;
//   createdAt: string; // ISO Date String
//   sender: UserAvatarPartial;
//   __typename?: string;
// }

// export interface TicketMessage extends Message {
//   isSupport: boolean;
// }

// export interface ConversationDetails {
//   id: string;
//   type: 'DIRECT' | 'GROUP';
//   name: string | null;
//   participants: { user: UserAvatarPartial }[];
//   messages: Message[];
// }

// export interface TicketDetails {
//   id: string;
//   subject: string;
//   priority: 'LOW' | 'MEDIUM' | 'HIGH';
//   status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
//   creator: UserAvatarPartial;
//   messages: TicketMessage[];
//   createdAt: string; // ISO Date String
// }

// // ---------------------------------------------------------------- //
// //                         HELPER FUNCTION                          //
// // ---------------------------------------------------------------- //

// const updateCommunicationListCache = (
//   client: ApolloClient<NormalizedCacheObject>, 
//   workspaceId: string, 
//   itemId: string, 
//   newMessage: Message | TicketMessage
// ) => {
//   const query = GET_MESSAGING_DATA;
//   const variables = { workspaceId };
//   try {
//     const cachedData = client.readQuery<{ getCommunicationList: CommunicationItem[], getWorkspaceMembers: WorkspaceMember[] }>({ query, variables });
//     if (cachedData?.getCommunicationList) {
//       const newList = cachedData.getCommunicationList.map(item => 
//           item.id === itemId 
//               ? { ...item, lastMessage: newMessage.content, updatedAt: newMessage.createdAt } 
//               : item
//       ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
//       client.writeQuery({
//           query,
//           variables,
//           data: { ...cachedData, getCommunicationList: newList },
//       });
//     }
//   } catch (e) {
//     console.warn("Could not find GET_MESSAGING_DATA in cache.", e);
//   }
// };

// // ---------------------------------------------------------------- //
// //                         THE CUSTOM HOOK                          //
// // ---------------------------------------------------------------- //

// interface UseMessagingParams {
//   workspaceId: string;
// }

// export const useMessaging = ({ workspaceId }: UseMessagingParams) => {
//   const [selectedItem, setSelectedItem] = useState<CommunicationItem | null>(null);
//   const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
//   const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

//   const { data, loading, error, refetch } = useQuery(GET_MESSAGING_DATA, {
//     variables: { workspaceId },
//     skip: !workspaceId,
//     fetchPolicy: 'cache-and-network',
//   });

//   const [getConversation, { data: conversationData, loading: conversationLoading }] = useLazyQuery(GET_CONVERSATION_DETAILS);
//   const [getTicket, { data: ticketData, loading: ticketLoading }] = useLazyQuery(GET_TICKET_DETAILS);

//   const [sendMessageMutation, { loading: sendingMessage }] = useMutation(SEND_MESSAGE);
//   const [sendTicketMessageMutation, { loading: sendingTicketMessage }] = useMutation(SEND_TICKET_MESSAGE);
//   const [createTicketMutation] = useMutation(CREATE_TICKET);
//   const [createDirectConversationMutation] = useMutation(CREATE_DIRECT_CONVERSATION);
//   const [createGroupConversationMutation] = useMutation(CREATE_GROUP_CONVERSATION);
//   const [userIsTypingMutation] = useMutation(USER_IS_TYPING);

//   useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
//     variables: { conversationId: selectedItem?.id },
//     skip: !selectedItem || selectedItem.type !== 'conversation',
//     onData: ({ client, data }) => {
//       const newMessage = data.data?.messageAdded;
//       if (!newMessage || !selectedItem) return;
      
//       updateCommunicationListCache(client, workspaceId, selectedItem.id, newMessage);

//       const queryOptions = { query: GET_CONVERSATION_DETAILS, variables: { id: selectedItem.id } };
//       const cachedData = client.readQuery<{ getConversation: ConversationDetails }>(queryOptions);
//       if (cachedData?.getConversation) {
//         client.writeQuery({ ...queryOptions, data: { getConversation: { ...cachedData.getConversation, messages: [...cachedData.getConversation.messages, newMessage] } } });
//       }
//     },
//   });

//   useSubscription(TICKET_MESSAGE_ADDED_SUBSCRIPTION, {
//     variables: { ticketId: selectedItem?.id },
//     skip: !selectedItem || selectedItem.type !== 'ticket',
//     onData: ({ client, data }) => {
//       const newMessage = data.data?.ticketMessageAdded;
//       if (!newMessage || !selectedItem) return;

//       updateCommunicationListCache(client, workspaceId, selectedItem.id, newMessage);
      
//       const queryOptions = { query: GET_TICKET_DETAILS, variables: { id: selectedItem.id } };
//       const cachedData = client.cache.readQuery<{ getTicket: TicketDetails }>(queryOptions);
//       if (cachedData?.getTicket) {
//         client.writeQuery({ ...queryOptions, data: { getTicket: { ...cachedData.getTicket, messages: [...cachedData.getTicket.messages, newMessage] } } });
//       }
//     },
//   });

//   useSubscription(TYPING_USER_SUBSCRIPTION, {
//     variables: { conversationId: selectedItem?.id },
//     skip: !selectedItem || selectedItem.type !== 'conversation',
//     onData: ({ data }) => {
//       const typingUser = data.data?.typingUser as TypingUser;
//       if (!typingUser) return;

//       // Clear any existing timeout for this user
//       if (typingTimeoutRef.current[typingUser.id]) {
//         clearTimeout(typingTimeoutRef.current[typingUser.id]);
//       }

//       // Add user to typing list if not already there
//       setTypingUsers(current => current.some(u => u.id === typingUser.id) ? current : [...current, typingUser]);

//       // Set a timeout to remove the user after 3 seconds
//       typingTimeoutRef.current[typingUser.id] = setTimeout(() => {
//         setTypingUsers(current => current.filter(u => u.id !== typingUser.id));
//         delete typingTimeoutRef.current[typingUser.id];
//       }, 3000);
//     },
//   });

//   useEffect(() => {
//     if (!selectedItem) return;
//     setTypingUsers([]); // Clear typing users when switching conversations
//     if (selectedItem.type === 'conversation') {
//       getConversation({ variables: { id: selectedItem.id } });
//     } else if (selectedItem.type === 'ticket') {
//       getTicket({ variables: { id: selectedItem.id } });
//     }
//   }, [selectedItem, getConversation, getTicket]);

//   const handleSendMessage = useCallback(async (content: string) => {
//     if (!selectedItem || content.trim() === '') return;
//     if (selectedItem.type === 'conversation') {
//       await sendMessageMutation({ variables: { conversationId: selectedItem.id, content } });
//     } else {
//       await sendTicketMessageMutation({ variables: { ticketId: selectedItem.id, content } });
//     }
//   }, [selectedItem, sendMessageMutation, sendTicketMessageMutation]);

//   const notifyTyping = useCallback(
//     debounce(() => {
//       if (selectedItem?.type === 'conversation') {
//         userIsTypingMutation({ variables: { conversationId: selectedItem.id } });
//       }
//     }, 500),
//     [selectedItem, userIsTypingMutation]
//   );

//   const handleCreateTicket = useCallback(async (data: { subject: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }) => {
//     const response = await createTicketMutation({
//       variables: { workspaceId, ...data },
//       refetchQueries: [{ query: GET_MESSAGING_DATA, variables: { workspaceId } }]
//     });
//     return response.data?.createTicket;
//   }, [workspaceId, createTicketMutation]);

//   return {
//     communicationList: data?.getCommunicationList || [],
//     workspaceMembers: data?.getWorkspaceMembers || [],
//     listLoading: loading,
//     listError: error,
//     refetchList: refetch,
//     selectedItem,
//     setSelectedItem,
//     activeItemDetails: conversationData?.getConversation || ticketData?.getTicket,
//     itemLoading: conversationLoading || ticketLoading,
//     sendMessage: handleSendMessage,
//     sendingMessage: sendingMessage || sendingTicketMessage,
//     createTicket: handleCreateTicket,
//     createDirectConversation: createDirectConversationMutation,
//     createGroupConversation: createGroupConversationMutation,
//     typingUsers,
//     notifyTyping,
//   };
// };






import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useLazyQuery, useMutation, useSubscription, useApolloClient } from '@apollo/client';
import { CREATE_TICKET, CREATE_GROUP_CONVERSATION, SEND_MESSAGE, SEND_TICKET_MESSAGE, CREATE_DIRECT_CONVERSATION, USER_IS_TYPING, MARK_CONVERSATION_AS_READ } from '@/graphql/mutations/messagingMutations';
import { GET_MESSAGING_DATA, GET_CONVERSATION_DETAILS, GET_TICKET_DETAILS } from '@/graphql/queries/messagingQuerries';
import { MESSAGE_ADDED_SUBSCRIPTION, TICKET_MESSAGE_ADDED_SUBSCRIPTION, TYPING_USER_SUBSCRIPTION, COMMUNICATION_ITEM_ADDED_SUBSCRIPTION } from '@/graphql/subscriptions/messagingSubscription';
import { debounce } from 'lodash';

// ---------------------------------------------------------------- //
//                          TYPE DEFINITIONS                        //
// ---------------------------------------------------------------- //
export interface TypingUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
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
  __typename?: 'CommunicationListItem';
}

export interface UserAvatarPartial {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  __typename?: 'UserAvatarPartial';
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
  participants: { user: UserAvatarPartial }[];
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
          client.writeQuery({ query, variables: { workspaceId }, data: { ...cachedData, getCommunicationList: newList } });
        }
      } catch (e) {
        console.warn("Could not update communication list cache with new item.", e);
      }
    }
  });

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId: selectedItem?.id },
    skip: !selectedItem || selectedItem.type !== 'conversation',
    onData: ({ client, data }) => {
      const newMessage = data.data?.messageAdded;
      if (!newMessage || !selectedItem) return;

      const queryOptions = { query: GET_CONVERSATION_DETAILS, variables: { id: selectedItem.id } };
      const cachedData = client.readQuery<{ getConversation: ConversationDetails }>(queryOptions);
      if (cachedData?.getConversation) {
        client.writeQuery({ ...queryOptions, data: { getConversation: { ...cachedData.getConversation, messages: [...cachedData.getConversation.messages, newMessage] } } });
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
      const cachedData = client.cache.readQuery<{ getTicket: TicketDetails }>(queryOptions);
      if (cachedData?.getTicket) {
        client.writeQuery({ ...queryOptions, data: { getTicket: { ...cachedData.getTicket, messages: [...cachedData.getTicket.messages, newMessage] } } });
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

    // CORRECTED: Add a guard clause to handle null input
    if (!item || item.unreadCount <= 0) {
      return;
    }

    // This code will now only run if `item` is valid and has unread messages
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

  return {
    communicationList: data?.getCommunicationList || [],
    workspaceMembers: data?.getWorkspaceMembers || [],
    listLoading: loading,
    listError: error,
    refetchList: refetch,
    selectedItem,
    setSelectedItem: handleSelectItem, // Export the safe wrapper function
    activeItemDetails: conversationData?.getConversation || ticketData?.getTicket,
    itemLoading: conversationLoading || ticketLoading,
    sendMessage: handleSendMessage,
    sendingMessage: sendingMessage || sendingTicketMessage,
    createTicket: handleCreateTicket,
    createDirectConversation: createDirectConversationMutation,
    createGroupConversation: createGroupConversationMutation,
    typingUsers,
    notifyTyping,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useLazyQuery, useMutation, useSubscription, ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { CREATE_TICKET, CREATE_GROUP_CONVERSATION, SEND_MESSAGE, SEND_TICKET_MESSAGE, CREATE_DIRECT_CONVERSATION } from '@/graphql/mutations/messagingMutations';
import { GET_MESSAGING_DATA, GET_CONVERSATION_DETAILS, GET_TICKET_DETAILS } from '@/graphql/queries/messagingQuerries'; // Corrected typo from "Querries" to "Queries"
import { MESSAGE_ADDED_SUBSCRIPTION, TICKET_MESSAGE_ADDED_SUBSCRIPTION } from '@/graphql/subscriptions/messagingSubscription';

// ---------------------------------------------------------------- //
//                          TYPE DEFINITIONS                        //
// ---------------------------------------------------------------- //

export interface CommunicationItem {
  id: string;
  type: 'conversation' | 'ticket';
  title: string;
  lastMessage: string | null;
  participantInfo: string;
  updatedAt: string; // ISO Date String
  unreadCount: number;
}

export interface UserAvatarPartial {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
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
  __typename?: string;
}

export interface TicketMessage extends Message {
  isSupport: boolean;
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
//                         HELPER FUNCTION                          //
// ---------------------------------------------------------------- //

/**
 * Updates the GET_MESSAGING_DATA query in the Apollo cache when a new message arrives.
 * This ensures the communication list on the left panel updates its "last message" and order.
 */
const updateCommunicationListCache = (
  client: ApolloClient<NormalizedCacheObject>, 
  workspaceId: string, 
  itemId: string, 
  newMessage: Message | TicketMessage
) => {
  const query = GET_MESSAGING_DATA;
  const variables = { workspaceId };

  try {
    const cachedData = client.readQuery<{ getCommunicationList: CommunicationItem[], getWorkspaceMembers: WorkspaceMember[] }>({ query, variables });

    if (cachedData?.getCommunicationList) {
      const newList = cachedData.getCommunicationList.map(item => 
          item.id === itemId 
              ? { ...item, lastMessage: newMessage.content, updatedAt: newMessage.createdAt } 
              : item
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      client.writeQuery({
          query,
          variables,
          data: {
              ...cachedData, // Preserve getWorkspaceMembers from the original cache read
              getCommunicationList: newList,
          },
      });
      console.log(`[Subscription] Successfully updated communication list in cache for item ID: ${itemId}`);
    }
  } catch (e) {
    console.warn("[Subscription] Could not find GET_MESSAGING_DATA in cache. It might not have been fetched yet.", e);
  }
};

// ---------------------------------------------------------------- //
//                         THE CUSTOM HOOK                          //
// ---------------------------------------------------------------- //

interface UseMessagingParams {
  workspaceId: string;
}

export const useMessaging = ({ workspaceId }: UseMessagingParams) => {
  const [selectedItem, setSelectedItem] = useState<CommunicationItem | null>(null);

  const { 
    data, 
    loading, 
    error, 
    refetch 
  } = useQuery<{ getCommunicationList: CommunicationItem[], getWorkspaceMembers: WorkspaceMember[] }>(GET_MESSAGING_DATA, {
    variables: { workspaceId },
    skip: !workspaceId,
    fetchPolicy: 'cache-and-network',
  });

  const [
    getConversation, { data: conversationData, loading: conversationLoading, error: conversationError }
  ] = useLazyQuery<{ getConversation: ConversationDetails }>(GET_CONVERSATION_DETAILS);

  const [
    getTicket, { data: ticketData, loading: ticketLoading, error: ticketError }
  ] = useLazyQuery<{ getTicket: TicketDetails }>(GET_TICKET_DETAILS);

  const [sendMessageMutation, { loading: sendingMessage }] = useMutation(SEND_MESSAGE);
  const [sendTicketMessageMutation, { loading: sendingTicketMessage }] = useMutation(SEND_TICKET_MESSAGE);
  const [createTicketMutation] = useMutation(CREATE_TICKET);
  const [createDirectConversationMutation] = useMutation(CREATE_DIRECT_CONVERSATION);
  const [createGroupConversationMutation] = useMutation(CREATE_GROUP_CONVERSATION);

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId: selectedItem?.id },
    skip: !selectedItem || selectedItem.type !== 'conversation',
    onData: ({ client, data }) => {
      console.log('[Subscription] MESSAGE_ADDED onData fired.', { data });
      const newMessage = data.data?.messageAdded as Message;
      if (!newMessage || !selectedItem) {
        console.warn('[Subscription] onData callback for MESSAGE_ADDED received no message or no item is selected.');
        return;
      }
      
      console.log('[Subscription] New conversation message received:', newMessage);
      updateCommunicationListCache(client, workspaceId, selectedItem.id, newMessage);

      const queryOptions = { query: GET_CONVERSATION_DETAILS, variables: { id: selectedItem.id } };
      try {
        const cachedData = client.readQuery<{ getConversation: ConversationDetails }>(queryOptions);
        console.log('[Subscription] Read conversation details from cache:', cachedData);
        if (cachedData?.getConversation) {
          client.writeQuery({ ...queryOptions, data: { getConversation: { ...cachedData.getConversation, messages: [...cachedData.getConversation.messages, newMessage] } } });
          console.log('[Subscription] Successfully wrote new message to conversation cache.');
        } else {
            console.warn('[Subscription] Could not find conversation in cache to update.');
        }
      } catch (error) {
        console.error('[Subscription] Error reading/writing conversation cache:', error);
      }
    },
    onError: (error) => console.error('[Subscription] MESSAGE_ADDED subscription error:', error),
  });

  useSubscription(TICKET_MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { ticketId: selectedItem?.id },
    skip: !selectedItem || selectedItem.type !== 'ticket',
    onData: ({ client, data }) => {
        console.log('[Subscription] TICKET_MESSAGE_ADDED onData fired.', { data });
        const newMessage = data.data?.ticketMessageAdded as TicketMessage;
        if (!newMessage || !selectedItem) {
            console.warn('[Subscription] onData callback for TICKET_MESSAGE_ADDED received no message or no item is selected.');
            return;
        }

        console.log('[Subscription] New ticket message received:', newMessage);
        updateCommunicationListCache(client, workspaceId, selectedItem.id, newMessage);
        
        const queryOptions = { query: GET_TICKET_DETAILS, variables: { id: selectedItem.id } };
        try {
            const cachedData = client.cache.readQuery<{ getTicket: TicketDetails }>(queryOptions);
            console.log('[Subscription] Read ticket details from cache:', cachedData);
            if (cachedData?.getTicket) {
              client.writeQuery({ ...queryOptions, data: { getTicket: { ...cachedData.getTicket, messages: [...cachedData.getTicket.messages, newMessage] } } });
              console.log('[Subscription] Successfully wrote new message to ticket cache.');
            } else {
                console.warn('[Subscription] Could not find ticket in cache to update.');
            }
        } catch (error) {
            console.error('[Subscription] Error reading/writing ticket cache:', error);
        }
    },
    onError: (error) => console.error('[Subscription] TICKET_MESSAGE_ADDED subscription error:', error),
  });

  useEffect(() => {
    if (!selectedItem) return;
    if (selectedItem.type === 'conversation') {
      getConversation({ variables: { id: selectedItem.id } });
    } else if (selectedItem.type === 'ticket') {
      getTicket({ variables: { id: selectedItem.id } });
    }
  }, [selectedItem, getConversation, getTicket]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedItem || content.trim() === '') return;
    console.log(`[Messaging Hook] Firing sendMessage for item ${selectedItem.id} of type ${selectedItem.type}`);
    if (selectedItem.type === 'conversation') {
      await sendMessageMutation({ variables: { conversationId: selectedItem.id, content } });
    } else {
      await sendTicketMessageMutation({ variables: { ticketId: selectedItem.id, content } });
    }
    console.log(`[Messaging Hook] sendMessage mutation call completed for item ${selectedItem.id}`);
    // Note: We don't need to refetch here because the subscription's onData handles the cache update.
  }, [selectedItem, sendMessageMutation, sendTicketMessageMutation]);

  const handleCreateTicket = useCallback(async (data: { subject: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }) => {
    const response = await createTicketMutation({
      variables: { workspaceId, ...data },
      refetchQueries: [{ query: GET_MESSAGING_DATA, variables: { workspaceId } }] // Refetch the list after creation
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
    setSelectedItem,
    activeItemDetails: conversationData?.getConversation || ticketData?.getTicket,
    itemLoading: conversationLoading || ticketLoading,
    itemError: conversationError || ticketError,
    sendMessage: handleSendMessage,
    sendingMessage: sendingMessage || sendingTicketMessage,
    createTicket: handleCreateTicket,
    createDirectConversation: createDirectConversationMutation,
    createGroupConversation: createGroupConversationMutation,
  };
};
import { useState, useCallback } from 'react';
import { useQuery, useLazyQuery, useMutation, useSubscription, useApolloClient } from '@apollo/client';
import { 
    ADMIN_SEND_TICKET_MESSAGE, 
    ADMIN_UPDATE_TICKET_STATUS,
    ADMIN_UPDATE_TICKET_PRIORITY , 
    ADMIN_MARK_TICKET_AS_READ
} from '@/graphql/mutations/adminSupportMutations';
import { TICKET_MESSAGE_ADDED_SUBSCRIPTION ,  ADMIN_TICKET_UPDATED_SUBSCRIPTION ,
   ADMIN_TICKET_ADDED_SUBSCRIPTION  } from '@/graphql/subscriptions/messagingSubscription';
import { GET_ADMIN_SUPPORT_TICKETS, GET_ADMIN_TICKET_DETAILS } from '@/graphql/queries/adminSupportQueries';
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------- //
//                          TYPE DEFINITIONS                        //
// ---------------------------------------------------------------- //

export interface UserPartial {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  avatar: string | null;
  avatarColor?: string | null;
}

export interface TicketMessage {
  id: string;
  content: string;
  createdAt: string; // ISO Date String
  isSupport: boolean;
  sender: UserPartial;
  ticketId: string;
}

export interface AdminTicketListItem {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  updatedAt: string; // ISO Date String
  unreadCount: number;
  creator: UserPartial;
  workspace: {
    id: string;
    name: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  };
}

export interface AdminTicketDetails {
  id: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string; // ISO Date String
  creator: UserPartial;
  workspace: {
    id: string;
    name: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    memberCount: number;
  };
  messages: TicketMessage[];
  hasMoreMessages: boolean;
}

const MESSAGES_PAGE_SIZE = 6;

// ---------------------------------------------------------------- //
//                         THE CUSTOM HOOK                          //
// ---------------------------------------------------------------- //

export const useAdminSupport = () => {
  const { currentUser: adminUser } = useAuth();
  const client = useApolloClient();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Query for the main list of tickets
  const { data: listData, loading: listLoading, error: listError } = useQuery<{ adminGetSupportTickets: AdminTicketListItem[] }>(GET_ADMIN_SUPPORT_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });

  // Lazy query for a single ticket's details
  const [getTicketDetails, { data: detailsData, loading: detailsLoading, error: detailsError, fetchMore }] = useLazyQuery<{ adminGetTicketDetails: AdminTicketDetails }>(GET_ADMIN_TICKET_DETAILS);

  // Mutations
  const [sendMessageMutation, { loading: sendingMessage }] = useMutation(ADMIN_SEND_TICKET_MESSAGE);
  const [updateStatusMutation] = useMutation(ADMIN_UPDATE_TICKET_STATUS);
  const [updatePriorityMutation] = useMutation(ADMIN_UPDATE_TICKET_PRIORITY);
  const [markAsReadMutation] = useMutation(ADMIN_MARK_TICKET_AS_READ);

  const selectedTicketId = detailsData?.adminGetTicketDetails?.id;

  // Subscription for new tickets being created
  useSubscription(ADMIN_TICKET_ADDED_SUBSCRIPTION, {
      onData: ({ client, data }) => {
          const newTicket = data.data?.adminTicketAdded as AdminTicketListItem;
          if (!newTicket) return;

          const query = GET_ADMIN_SUPPORT_TICKETS;
          try {
              const cachedData = client.readQuery<{ adminGetSupportTickets: AdminTicketListItem[] }>({ query });
              if (cachedData?.adminGetSupportTickets) {
                  if (cachedData.adminGetSupportTickets.some(t => t.id === newTicket.id)) return;
                  
                  const newList = [newTicket, ...cachedData.adminGetSupportTickets];
                  client.writeQuery({ 
                      query, 
                      data: { adminGetSupportTickets: newList } 
                  });
              }
          } catch (e) {
              console.warn("Could not update admin ticket list cache with new ticket.", e);
          }
      }
  });
  
  // This subscription is the single source of truth for LIST UPDATES.
  useSubscription(ADMIN_TICKET_UPDATED_SUBSCRIPTION, {
      onData: ({ client, data }) => {
          const updatedTicket = data.data?.adminTicketUpdated as AdminTicketListItem;
          if (!updatedTicket) return;

          const query = GET_ADMIN_SUPPORT_TICKETS;
          try {
              const cachedData = client.readQuery<{ adminGetSupportTickets: AdminTicketListItem[] }>({ query });
              if (cachedData?.adminGetSupportTickets) {
                  const updatedList = cachedData.adminGetSupportTickets
                      .map(ticket => ticket.id === updatedTicket.id ? updatedTicket : ticket)
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                  client.writeQuery({
                      query,
                      data: { adminGetSupportTickets: updatedList }
                  });
              }
          } catch (e) {
              console.warn("Could not update admin ticket list cache with updated ticket.", e);
          }
      }
  });

  // This subscription ONLY updates the DETAILS of the currently viewed ticket.
  useSubscription(TICKET_MESSAGE_ADDED_SUBSCRIPTION, {
      skip: !adminUser,
      onData: ({ client, data }) => {
        const newMessage = data.data?.ticketMessageAdded as TicketMessage;
        if (!newMessage || newMessage.ticketId !== selectedTicketId) {
          return;
        }

        const detailsQueryOptions = { query: GET_ADMIN_TICKET_DETAILS, variables: { id: newMessage.ticketId, limit: MESSAGES_PAGE_SIZE } };
        try {
            const cachedDetails = client.readQuery<{ adminGetTicketDetails: AdminTicketDetails }>(detailsQueryOptions);
            if (cachedDetails?.adminGetTicketDetails && !cachedDetails.adminGetTicketDetails.messages.some(m => m.id === newMessage.id)) {
                 client.writeQuery({
                    query: GET_ADMIN_TICKET_DETAILS,
                    variables: { id: newMessage.ticketId },
                    data: { adminGetTicketDetails: { ...cachedDetails.adminGetTicketDetails, messages: [...cachedDetails.adminGetTicketDetails.messages, newMessage] } }
                });
            }
        } catch (e) { 
        }
      }
  });

  // Callback to fetch details for a selected ticket and mark as read
  const fetchTicketDetails = useCallback((ticketId: string) => {
    const listQuery = GET_ADMIN_SUPPORT_TICKETS;
    
    try {
        const cachedList = client.readQuery<{ adminGetSupportTickets: AdminTicketListItem[] }>({ query: listQuery });
        if (cachedList?.adminGetSupportTickets) {
            const ticketInList = cachedList.adminGetSupportTickets.find(t => t.id === ticketId);
            if (ticketInList && ticketInList.unreadCount > 0) {
                const updatedList = cachedList.adminGetSupportTickets.map(t => 
                    t.id === ticketId ? { ...t, unreadCount: 0 } : t
                );
                client.writeQuery({
                    query: listQuery,
                    data: { adminGetSupportTickets: updatedList }
                });
                markAsReadMutation({ variables: { ticketId } });
            }
        }
    } catch (e) {
        console.error("Failed to optimistically update unread count.", e);
    }

    getTicketDetails({ variables: { id: ticketId, limit: MESSAGES_PAGE_SIZE } });
  }, [client, getTicketDetails, markAsReadMutation]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !fetchMore) return;
    
    const currentData = detailsData?.adminGetTicketDetails;
    if (!currentData || !currentData.hasMoreMessages || currentData.messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: { cursor: currentData.messages[0].id },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            adminGetTicketDetails: {
              ...prev.adminGetTicketDetails,
              messages: [...fetchMoreResult.adminGetTicketDetails.messages, ...prev.adminGetTicketDetails.messages],
              hasMoreMessages: fetchMoreResult.adminGetTicketDetails.hasMoreMessages,
            },
          };
        },
      });
    } catch (e) {
      console.error("Failed to fetch more messages:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, fetchMore, detailsData]);


  // Callback for sending a message as an admin
  const sendMessage = useCallback(async (ticketId: string, content: string) => {
    if (!ticketId || content.trim() === '') return;
    await sendMessageMutation({ variables: { ticketId, content } });
  }, [sendMessageMutation]);

  // Callback for updating ticket status
  const updateTicketStatus = useCallback(async (ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    await updateStatusMutation({ 
      variables: { ticketId, status },
      update: (cache, { data }) => {
        if (!data?.adminUpdateTicketStatus) return;
        cache.modify({
          id: cache.identify({ __typename: 'AdminTicketListItem', id: ticketId }),
          fields: {
            status: () => data.adminUpdateTicketStatus.status,
          },
        });
        cache.modify({
            id: cache.identify({ __typename: 'AdminTicketDetails', id: ticketId }),
            fields: {
              status: () => data.adminUpdateTicketStatus.status,
            },
        });
      }
    });
  }, [updateStatusMutation]);

  // Callback for updating ticket priority
  const updateTicketPriority = useCallback(async (ticketId: string, priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    await updatePriorityMutation({ 
      variables: { ticketId, priority },
      update: (cache, { data }) => {
        if (!data?.adminUpdateTicketPriority) return;
        cache.modify({
            id: cache.identify({ __typename: 'AdminTicketListItem', id: ticketId }),
            fields: {
              priority: () => data.adminUpdateTicketPriority.priority,
            },
        });
        cache.modify({
            id: cache.identify({ __typename: 'AdminTicketDetails', id: ticketId }),
            fields: {
              priority: () => data.adminUpdateTicketPriority.priority,
            },
        });
      }
    });
  }, [updatePriorityMutation]);


  return {
    tickets: listData?.adminGetSupportTickets || [],
    listLoading,
    listError,

    ticketDetails: detailsData?.adminGetTicketDetails,
    detailsLoading,
    detailsError,
    fetchTicketDetails,

    isLoadingMore,
    loadMoreMessages,

    sendMessage,
    sendingMessage,
    updateTicketStatus,
    updateTicketPriority,

    adminUser
  };
};
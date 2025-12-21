import { useState, useEffect, useCallback } from 'react';
import { useQuery, useLazyQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { 
    ADMIN_SEND_TICKET_MESSAGE, 
    ADMIN_UPDATE_TICKET_STATUS,
    ADMIN_UPDATE_TICKET_PRIORITY , 
    ADMIN_MARK_TICKET_AS_READ
} from '@/graphql/mutations/adminSupportMutations';
import { TICKET_MESSAGE_ADDED_SUBSCRIPTION ,  ADMIN_TICKET_UPDATED_SUBSCRIPTION ,
   ADMIN_TICKET_ADDED_SUBSCRIPTION  } from '@/graphql/subscriptions/messagingSubscription';
import { GET_ADMIN_SUPPORT_TICKETS, GET_ADMIN_TICKET_DETAILS } from '@/graphql/queries/adminSupportQueries';
import { useUser } from './useUser';

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
}

// ---------------------------------------------------------------- //
//                         THE CUSTOM HOOK                          //
// ---------------------------------------------------------------- //

export const useAdminSupport = () => {
  const { user: adminUser } = useUser(); // Assuming the admin is also a 'User'

  // Query for the main list of tickets
  const { data: listData, loading: listLoading, error: listError } = useQuery<{ adminGetSupportTickets: AdminTicketListItem[] }>(GET_ADMIN_SUPPORT_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });

  // Lazy query for a single ticket's details
  const [getTicketDetails, { data: detailsData, loading: detailsLoading, error: detailsError }] = useLazyQuery<{ adminGetTicketDetails: AdminTicketDetails }>(GET_ADMIN_TICKET_DETAILS);

  // Mutations
  const [sendMessageMutation, { loading: sendingMessage }] = useMutation(ADMIN_SEND_TICKET_MESSAGE);
  const [updateStatusMutation] = useMutation(ADMIN_UPDATE_TICKET_STATUS);
  const [updatePriorityMutation] = useMutation(ADMIN_UPDATE_TICKET_PRIORITY);
  const [markAsReadMutation] = useMutation(ADMIN_MARK_TICKET_AS_READ);

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

  // Subscription for updates to existing tickets (e.g., new message, status change)
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


  // Subscription for new messages on a specific ticket
  const subscribeToTicketMessages = (ticketId: string) => {
     useSubscription(TICKET_MESSAGE_ADDED_SUBSCRIPTION, {
        variables: { ticketId },
        skip: !ticketId,
        onData: ({ client, data }) => {
            const newMessage = data.data?.ticketMessageAdded;
            if (!newMessage) return;

            const queryOptions = { query: GET_ADMIN_TICKET_DETAILS, variables: { id: ticketId } };
            try {
                const cachedData = client.readQuery<{ adminGetTicketDetails: AdminTicketDetails }>(queryOptions);
                if (cachedData?.adminGetTicketDetails) {
                    if (cachedData.adminGetTicketDetails.messages.some(m => m.id === newMessage.id)) return;

                    client.writeQuery({
                        ...queryOptions,
                        data: {
                            adminGetTicketDetails: {
                                ...cachedData.adminGetTicketDetails,
                                messages: [...cachedData.adminGetTicketDetails.messages, newMessage]
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn("Cache update failed for ticketMessageAdded", e);
            }
        }
    });
  };

  // Callback to fetch details for a selected ticket and mark as read
  const fetchTicketDetails = useCallback((ticketId: string) => {
    const listQuery = GET_ADMIN_SUPPORT_TICKETS;
    const client = getTicketDetails.client;
    if (client) {
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
    }

    getTicketDetails({ variables: { id: ticketId } });
  }, [getTicketDetails, markAsReadMutation]);


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
        // Update ticket list cache
        cache.modify({
          id: cache.identify({ __typename: 'AdminTicketListItem', id: ticketId }),
          fields: {
            status: () => data.adminUpdateTicketStatus.status,
          },
        });
        // Update details cache
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
    // List properties
    tickets: listData?.adminGetSupportTickets || [],
    listLoading,
    listError,

    // Details properties
    ticketDetails: detailsData?.adminGetTicketDetails,
    detailsLoading,
    detailsError,
    fetchTicketDetails,
    subscribeToTicketMessages,

    // Actions
    sendMessage,
    sendingMessage,
    updateTicketStatus,
    updateTicketPriority,

    // Context
    adminUser
  };
};
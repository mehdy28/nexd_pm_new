import { gql } from '@apollo/client';

export const ADMIN_SEND_TICKET_MESSAGE = gql`
  mutation AdminSendTicketMessage($ticketId: ID!, $content: String!) {
    adminSendTicketMessage(ticketId: $ticketId, content: $content) {
      id
      content
      createdAt
      isSupport
      sender {
        id
        firstName
        lastName
        avatar
        avatarColor
      }
    }
  }
`;

export const ADMIN_UPDATE_TICKET_STATUS = gql`
  mutation AdminUpdateTicketStatus($ticketId: ID!, $status: TicketStatus!) {
    adminUpdateTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
    }
  }
`;

export const ADMIN_UPDATE_TICKET_PRIORITY = gql`
    mutation AdminUpdateTicketPriority($ticketId: ID!, $priority: Priority!) {
        adminUpdateTicketPriority(ticketId: $ticketId, priority: $priority) {
            id
            priority
        }
    }
`;
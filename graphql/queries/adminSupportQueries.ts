import { gql } from '@apollo/client';

export const GET_ADMIN_SUPPORT_TICKETS = gql`
  query GetAdminSupportTickets {
    adminGetSupportTickets {
      id
      subject
      status
      priority
      updatedAt
      unreadCount
      creator {
        id
        firstName
        lastName
        avatar
        avatarColor
      }
      workspace {
        id
        name
        plan
      }
    }
  }
`;

export const GET_ADMIN_TICKET_DETAILS = gql`
  query GetAdminTicketDetails($id: ID!) {
    adminGetTicketDetails(id: $id) {
      id
      subject
      priority
      status
      createdAt
      creator {
        id
        firstName
        lastName
        email
        avatar
        avatarColor
      }
      workspace {
        id
        name
        plan
        memberCount
      }
      messages {
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
  }
`;
import { gql } from '@apollo/client';

// SUBSCRIPTIONS

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($conversationId: ID, $workspaceId: ID) {
    messageAdded(conversationId: $conversationId, workspaceId: $workspaceId) {
      id
      content
      createdAt
      conversationId
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

export const TICKET_MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription TicketMessageAdded($workspaceId: ID) {
    ticketMessageAdded(workspaceId: $workspaceId) {
      id
      content
      createdAt
      isSupport
      ticketId
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

export const TYPING_USER_SUBSCRIPTION = gql`
  subscription TypingUser($conversationId: ID!) {
    typingUser(conversationId: $conversationId) {
      id
      firstName
      lastName
    }
  }
`;

export const COMMUNICATION_ITEM_ADDED_SUBSCRIPTION = gql`
  subscription CommunicationItemAdded($workspaceId: ID!) {
    communicationItemAdded(workspaceId: $workspaceId) {
      id
      type
      title
      lastMessage
      participantInfo
      updatedAt
      unreadCount
      priority
      conversationType
      participants {
        id
        firstName
        lastName
        avatar
        avatarColor
      }
    }
  }
`;

export const PARTICIPANT_REMOVED_SUBSCRIPTION = gql`
  subscription ParticipantRemoved {
    participantRemoved {
      conversationId
      userId
    }
  }
`;




export const ADMIN_TICKET_ADDED_SUBSCRIPTION = gql`
  subscription OnAdminTicketAdded {
    adminTicketAdded {
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

export const ADMIN_TICKET_UPDATED_SUBSCRIPTION = gql`
  subscription OnAdminTicketUpdated {
    adminTicketUpdated {
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
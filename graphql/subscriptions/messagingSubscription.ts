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
  subscription TicketMessageAdded($ticketId: ID!) {
    ticketMessageAdded(ticketId: $ticketId) {
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
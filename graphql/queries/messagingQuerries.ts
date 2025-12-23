import { gql } from '@apollo/client';


// QUERIES
export const GET_COMMUNICATION_LIST = gql`
  query GetCommunicationList($workspaceId: ID!) {
    getCommunicationList(workspaceId: $workspaceId) {
      id
      type
      title
      lastMessage
      participantInfo
      updatedAt
      unreadCount
    }
  }
`;


export const GET_MESSAGING_DATA = gql`
  query GetMessagingData($workspaceId: ID!) {
    getCommunicationList(workspaceId: $workspaceId) {
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
    getWorkspaceMembers(workspaceId: $workspaceId) {
      id
      role
      user {
        id
        email
        firstName
        lastName
        avatar
        avatarColor
      }
    }
  }
`;

export const GET_CONVERSATION_DETAILS = gql`
  query GetConversation($id: ID!, $cursor: ID, $limit: Int) {
    getConversation(id: $id, cursor: $cursor, limit: $limit) {
      id
      type
      name
      creatorId
      hasMoreMessages
      participants {
        id
        firstName
        lastName
        avatar
        avatarColor
      }
      messages {
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
  }
`;

export const GET_TICKET_DETAILS = gql`
  query GetTicket($id: ID!, $cursor: ID, $limit: Int) {
    getTicket(id: $id, cursor: $cursor, limit: $limit) {
      id
      subject
      priority
      status
      createdAt
      hasMoreMessages
      creator {
        id
        firstName
        lastName
        avatar
        avatarColor
      }
      messages {
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
  }
`;
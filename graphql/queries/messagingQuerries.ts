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
    }
    getWorkspaceMembers(workspaceId: $workspaceId) {
      id
      role
      user {
        id
        firstName
        lastName
        email
        avatar
      }
    }
  }
`;

export const GET_CONVERSATION_DETAILS = gql`
  query GetConversation($id: ID!) {
    getConversation(id: $id) {
      id
      type
      name
      participants {
        id
        firstName
        lastName
        avatar
      }
      messages {
        id
        content
        createdAt
        sender {
          id
          firstName
          lastName
          avatar
        }
      }
    }
  }
`;

export const GET_TICKET_DETAILS = gql`
  query GetTicket($id: ID!) {
    getTicket(id: $id) {
      id
      subject
      priority
      status
      createdAt
      creator {
        id
        firstName
        lastName
        avatar
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
        }
      }
    }
  }
`;
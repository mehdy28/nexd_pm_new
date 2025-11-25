import { gql } from '@apollo/client';

// MUTATIONS
export const CREATE_TICKET = gql`
  mutation CreateTicket($workspaceId: ID!, $subject: String!, $priority: Priority!, $message: String!) {
    createTicket(input: { workspaceId: $workspaceId, subject: $subject, priority: $priority, message: $message }) {
      id
      subject
    }
  }
`;

export const CREATE_DIRECT_CONVERSATION = gql`
  mutation CreateDirectConversation($workspaceId: ID!, $participantId: ID!) {
    createDirectConversation(input: { workspaceId: $workspaceId, participantId: $participantId }) {
      id
      type
    }
  }
`;

export const CREATE_GROUP_CONVERSATION = gql`
  mutation CreateGroupConversation($workspaceId: ID!, $name: String!, $participantIds: [ID!]!) {
    createGroupConversation(input: { workspaceId: $workspaceId, name: $name, participantIds: $participantIds }) {
      id
      type
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $content: String!) {
    sendMessage(input: { conversationId: $conversationId, content: $content }) {
      id
      content
      createdAt
      conversationId
      sender {
        id
        firstName
        lastName
        avatar
      }
    }
  }
`;

export const SEND_TICKET_MESSAGE = gql`
  mutation SendTicketMessage($ticketId: ID!, $content: String!) {
    sendTicketMessage(input: { ticketId: $ticketId, content: $content }) {
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
`;

export const USER_IS_TYPING = gql`
  mutation UserIsTyping($conversationId: ID!) {
    userIsTyping(conversationId: $conversationId)
  }
`;

export const MARK_CONVERSATION_AS_READ = gql`
  mutation MarkConversationAsRead($conversationId: ID!) {
    markConversationAsRead(conversationId: $conversationId)
  }
`;

export const LEAVE_CONVERSATION = gql`
  mutation LeaveConversation($conversationId: ID!) {
    leaveConversation(conversationId: $conversationId)
  }
`;

export const REMOVE_PARTICIPANT = gql`
  mutation RemoveParticipant($conversationId: ID!, $userId: ID!) {
    removeParticipant(conversationId: $conversationId, userId: $userId)
  }
`;

export const ADD_PARTICIPANTS = gql`
  mutation AddParticipants($conversationId: ID!, $participantIds: [ID!]!) {
    addParticipants(conversationId: $conversationId, participantIds: $participantIds)
  }
`;
import { gql } from '@apollo/client';

// MUTATIONS

export const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $content: String!) {
    sendMessage(input: { conversationId: $conversationId, content: $content }) {
      id
      content
      createdAt
      sender { id firstName lastName avatar }
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
      sender { id firstName lastName avatar }
    }
  }
`;

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
        }
    }
`;

export const CREATE_GROUP_CONVERSATION = gql`
    mutation CreateGroupConversation($workspaceId: ID!, $name: String!, $participantIds: [ID!]!) {
        createGroupConversation(input: { workspaceId: $workspaceId, name: $name, participantIds: $participantIds }) {
            id
        }
    }
`;


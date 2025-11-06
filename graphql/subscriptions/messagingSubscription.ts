import { gql } from '@apollo/client';


// SUBSCRIPTIONS

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($conversationId: ID!) {
    messageAdded(conversationId: $conversationId) {
      id
      content
      createdAt
      sender { id firstName lastName avatar }
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
      sender { id firstName lastName avatar }
    }
  }
`;

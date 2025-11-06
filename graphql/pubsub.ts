import { PubSub } from 'graphql-subscriptions';

// This instance will be used across your resolvers to publish events.
export const pubsub = new PubSub();

// Define a simple enum for topic names to avoid magic strings.
export const Topics = {
  MESSAGE_ADDED: 'MESSAGE_ADDED',
  TICKET_MESSAGE_ADDED: 'TICKET_MESSAGE_ADDED',
  COMMUNICATION_ITEM_UPDATED: 'COMMUNICATION_ITEM_UPDATED',
};
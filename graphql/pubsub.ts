import { PubSub } from 'graphql-subscriptions';

declare global {
  var pubsub: PubSub | undefined;
}

export const pubsub = global.pubsub || new PubSub();

if (process.env.NODE_ENV !== 'production') {
  global.pubsub = pubsub;
}

export const Topics = {
  // Messaging
  USER_IS_TYPING: 'USER_IS_TYPING',
  COMMUNICATION_ITEM_ADDED: 'COMMUNICATION_ITEM_ADDED',
  MESSAGE_ADDED: 'MESSAGE_ADDED',
  TICKET_MESSAGE_ADDED: 'TICKET_MESSAGE_ADDED',
  COMMUNICATION_ITEM_UPDATED: 'COMMUNICATION_ITEM_UPDATED',
  PARTICIPANT_REMOVED: 'PARTICIPANT_REMOVED',

  // Admin Support
  ADMIN_TICKET_ADDED: 'ADMIN_TICKET_ADDED',
  ADMIN_TICKET_UPDATED: 'ADMIN_TICKET_UPDATED',
};
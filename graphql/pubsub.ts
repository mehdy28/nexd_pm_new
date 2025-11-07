import { PubSub } from 'graphql-subscriptions';

declare global {
  var pubsub: PubSub | undefined;
}

export const pubsub = global.pubsub || new PubSub();

if (process.env.NODE_ENV !== 'production') {
  global.pubsub = pubsub;
}

export const Topics = {
  MESSAGE_ADDED: 'MESSAGE_ADDED',
  TICKET_MESSAGE_ADDED: 'TICKET_MESSAGE_ADDED',
  COMMUNICATION_ITEM_UPDATED: 'COMMUNICATION_ITEM_UPDATED',
};
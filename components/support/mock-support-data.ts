export interface MockMessage {
  id: number;
  sender: 'user' | 'support';
  text: string;
  timestamp: string;
  imageUrl?: string;
}

export const mockChatHistory = [
  {
    id: 1,
    sender: 'support',
    text: 'Hello! How can I help you today?',
    timestamp: new Date().toISOString(), // Example timestamp
  },
  {
    id: 2,
    sender: 'user',
    text: 'I\'m having trouble with feature X.',
    timestamp: new Date().toISOString(), // Example timestamp
  },
  {
    id: 3,
    sender: 'support',
    text: 'Could you please provide more details or a screenshot?',
    timestamp: new Date().toISOString(), // Example timestamp
  },
  {
    id: 4,
    sender: 'user',
    text: 'Here is a screenshot of the issue:',
    timestamp: new Date().toISOString(), // Example timestamp
    imageUrl: '/placeholder.jpg', // Placeholder image URL
  },
];
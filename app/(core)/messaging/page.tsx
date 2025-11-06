"use client";
import React from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';

const MessaginPage: React.FC = () => {
  return (
    // Reverting to h-full. The height constraint is now handled by calc() within UserCommunication.
    <div className="w-full h-full bg-gray-100">
      <UserCommunication />
    </div>
  );
};

export default MessaginPage;

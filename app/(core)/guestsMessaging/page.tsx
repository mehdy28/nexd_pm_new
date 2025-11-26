// app/(core)/messaging/page.tsx
"use client";
import React from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';

const MessaginPage: React.FC = () => {
  // Removed hooks, passing a mock workspace ID
  return (
    <div className="w-full h-full bg-muted/30">
      <UserCommunication workspaceId="workspace_123" />
    </div>
  );
};

export default MessaginPage;
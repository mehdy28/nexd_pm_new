"use client";
import React from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';
import { useWorkspace } from '@/hooks/useWorkspace';

const MessaginPage: React.FC = () => {
  // Assuming a hook that provides the current workspace context, including its ID.
  const { currentWorkspace, isLoading } = useWorkspace(); 

  if (isLoading || !currentWorkspace) {
    // You can render a loading skeleton or spinner here
    return <div>Loading workspace...</div>;
  }

  return (
    <div className="w-full h-full  bg-muted/30">
      <UserCommunication workspaceId={currentWorkspace.id} />
    </div>
  );
};

export default MessaginPage;
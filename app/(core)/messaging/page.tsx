"use client";
import React from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';
import { useWorkspace } from '@/hooks/useWorkspace';

const MessaginPage: React.FC = () => {
  // Assuming a hook that provides the current workspace context, including its ID.
  const { currentWorkspace } = useWorkspace(); 

  return (
    <div className="w-full h-full bg-muted/30">
      {/* 
        This is a conditional render. 
        The UserCommunication component will only be rendered if currentWorkspace is not null or undefined.
      */}
      {currentWorkspace && (
        <UserCommunication workspaceId={currentWorkspace.id} />
      )}
    </div>
  );
};

export default MessaginPage;
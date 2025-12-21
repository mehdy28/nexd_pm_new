"use client";
import React, { useMemo } from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useTopbarSetup } from "@/components/layout/topbar-store";
import { MessageSquare } from "lucide-react";

const MessaginPage: React.FC = () => {
  // Assuming a hook that provides the current workspace context, including its ID.
  const { currentWorkspace } = useWorkspace(); 

  const tabs = useMemo(() => [
    { key: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  ], []);

  useTopbarSetup({
    title: "Messaging",
    tabs: tabs,
    activeKey: "messages",
    showShare: false,
    showSprint: false,
    showAddSection: false,
  });

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
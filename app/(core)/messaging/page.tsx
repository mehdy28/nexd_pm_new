//app/(core)/messaging/page.tsx
"use client";
import React, { useMemo } from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';
import { useTopbarSetup } from "@/components/layout/topbar-store";
import { MessageSquare } from "lucide-react";

const MessaginPage: React.FC = () => {

  const tabs = useMemo(() => {
    const tabConfig = [
      { key: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
    ];
    return tabConfig;
  }, []);

  const topbarConfig = {
    title: "Messaging",
    tabs: tabs,
    activeKey: "messages",
    showShare: false,
    showSprint: false,
    showAddSection: false,
  };
  
  useTopbarSetup(topbarConfig);

  return (
    <div className="w-full h-full bg-muted/30">
      <UserCommunication />
    </div>
  );
};

export default MessaginPage;
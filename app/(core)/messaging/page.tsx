//app/(core)/messaging/page.tsx
"use client";
import React, { useMemo } from 'react';
import { UserCommunication } from '@/components/messaging/user-communication';
import { useTopbarSetup } from "@/components/layout/topbar-store";
import { MessageSquare } from "lucide-react";

const MessaginPage: React.FC = () => {
  console.log("MessaginPage: Component rendering or re-rendering.");

  const tabs = useMemo(() => {
    console.log("MessaginPage: useMemo for tabs is executing.");
    const tabConfig = [
      { key: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
    ];
    console.log("MessaginPage: Tabs created:", tabConfig);
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
  
  console.log("MessaginPage: Calling useTopbarSetup with config:", topbarConfig);
  useTopbarSetup(topbarConfig);
  console.log("MessaginPage: useTopbarSetup has been called.");

  console.log("MessaginPage: Rendering UserCommunication component.");
  return (
    <div className="w-full h-full bg-muted/30">
      <UserCommunication />
    </div>
  );
};

export default MessaginPage;
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, LifeBuoy, Search, Users, User, Loader2 } from "lucide-react";
import { CommunicationList } from "./conversation-list";
import { CommunicationWindow } from "./communication-window";
import { NewTicketForm } from "./new-ticket-form";
import { DirectChatCreation } from "./direct-chat-creation";
import { GroupChatCreation } from "./group-chat-creation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessaging, CommunicationItem } from "@/hooks/useMessaging";
import { useUser } from "@/hooks/useUser";


type ViewState = 'list' | 'new_ticket' | 'new_group_chat' | 'new_direct_chat';

interface UserCommunicationProps {
  workspaceId: string;
}

export function UserCommunication({ workspaceId }: UserCommunicationProps) {
  const [currentView, setCurrentView] = useState<ViewState>('list');
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser } = useUser();

  const {
    communicationList,
    workspaceMembers,
    listLoading,
    selectedItem,
    setSelectedItem,
    activeItemDetails,
    itemLoading,
    sendMessage,
    sendingMessage,
    createTicket,
    createDirectConversation,
    createGroupConversation,
    typingUsers,
    notifyTyping,
  } = useMessaging({ workspaceId });

  const handleCreateNewTicket = () => {
    setCurrentView('new_ticket');
    // We set to null directly here, no need for the wrapper
    setSelectedItem(null as any);
  };

  const handleCreateNewGroupChat = () => {
    setCurrentView('new_group_chat');
    setSelectedItem(null as any);
  };

  const handleCreateNewDirectChat = () => {
    setCurrentView('new_direct_chat');
    setSelectedItem(null as any);
  };

  const handleChatCreated = (newItem: CommunicationItem) => {
    setSelectedItem(newItem);
    setCurrentView('list');
  };

  const handleTicketSubmission = async (data: { subject: string; priority: any; message: string }) => {
    const newTicket = await createTicket(data);
    if (newTicket) {
      // The subscription will add the ticket to the list in real-time.
      // We can optimistically create a temporary item to select, or wait for the subscription to add it.
      // For simplicity, we'll just switch the view. The user can then click on the new item.
      setCurrentView('list');
    }
  };

  const renderRightPanel = () => {
    if (currentView === 'new_ticket') {
      return (
        <NewTicketForm
          onBack={() => setCurrentView('list')}
          onSubmit={handleTicketSubmission}
        />
      );
    }

    if (currentView === 'new_group_chat') {
        return (
            <GroupChatCreation
                workspaceId={workspaceId}
                members={workspaceMembers}
                onBack={() => setCurrentView('list')}
                onChatCreated={handleChatCreated}
                createGroupConversation={createGroupConversation}
            />
        );
    }

    if (currentView === 'new_direct_chat') {
        return (
            <DirectChatCreation
                workspaceId={workspaceId}
                members={workspaceMembers}
                onBack={() => setCurrentView('list')}
                onChatSelected={handleChatCreated}
                createDirectConversation={createDirectConversation}
            />
        );
    }

    if (itemLoading) {
      return (
        <Card className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </Card>
      );
    }

    if (selectedItem && activeItemDetails) {
      return (
        <CommunicationWindow
          key={selectedItem.id}
          communicationItem={selectedItem}
          details={activeItemDetails}
          onSendMessage={sendMessage}
          isSending={sendingMessage}
          currentUserId={currentUser?.id}
          typingUsers={typingUsers}
          onUserIsTyping={notifyTyping}
        />
      );
    }

    return (
      <Card className="h-full flex items-center justify-center bg-gray-50/50">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            Select a Conversation or Ticket
          </h3>
          <p>
            Choose an item from the list to view messages or start a new interaction.
          </p>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full overflow-hidden flex pt-6 ">
      <div className="h-full flex flex-col justify-center px-6 w-full">
        <div className="space-y-6 pb-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex flex-col h-[80vh]">
              <Card className="flex flex-col h-full">
                  <CardHeader className="flex-shrink-0 space-y-3 p-4">
                      <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                              placeholder="Search chats or tickets..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8"
                          />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          <Button onClick={handleCreateNewDirectChat} variant="secondary" size="sm" className="text-xs">
                              <User className="w-3 h-3 mr-1" /> Direct
                          </Button>
                          <Button onClick={handleCreateNewGroupChat} variant="secondary" size="sm" className="text-xs">
                              <Users className="w-3 h-3 mr-1" /> Group
                          </Button>
                          <Button onClick={handleCreateNewTicket} variant="outline" size="sm" className="text-[hsl(174,70%,54%)] border-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,54%)] hover:text-white text-xs">
                              <LifeBuoy className="w-3 h-3 mr-1" /> Ticket
                          </Button>
                      </div>
                  </CardHeader>
                <CardContent className="p-0 h-full overflow-y-auto">
                  <CommunicationList
                    list={communicationList}
                    loading={listLoading}
                    searchQuery={searchQuery}
                    selectedItem={selectedItem}
                    onSelectItem={setSelectedItem}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 h-[80vh]">
              {renderRightPanel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";

type ViewState = 'list' | 'new_ticket' | 'new_group_chat' | 'new_direct_chat';

export function UserCommunication() {

  const [currentView, setCurrentView] = useState<ViewState>('list');
  const [searchQuery, setSearchQuery] = useState("");

  const { currentUser } = useAuth();

  const { workspaceData, loading, refetchWorkspaceData } = useWorkspaceData();

  const useMessagingPayload = { workspaceId: workspaceData?.id ?? "" };
  
  const {
    communicationList,
    workspaceMembers,
    listLoading,
    error,
    refetch,
    selectedItem,
    setSelectedItem,
    activeItemDetails,
    itemLoading,
    isLoadingMore,
    loadMoreMessages,
    sendMessage,
    sendingMessage,
    createTicket,
    createDirectConversation,
    createGroupConversation,
    leaveConversation,
    removeParticipant,
    addParticipants,
    typingUsers,
    notifyTyping,
    updateTicketPriority,
  } = useMessaging(useMessagingPayload);
  
  // Local state for the list to allow for optimistic updates
  const [optimisticList, setOptimisticList] = useState<CommunicationItem[]>([]);

  useEffect(() => {
    // Sync local state with data from the hook
    setOptimisticList(communicationList);
  }, [communicationList]);

  const handleUpdateTicketPriority = (ticketId: string, priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    updateTicketPriority(ticketId, priority);
    setOptimisticList(currentList =>
        currentList.map(item =>
            item.id === ticketId ? { ...item, priority } : item
        )
    );
    if (selectedItem?.id === ticketId) {
        setSelectedItem(prev =>
            prev ? { ...prev, priority } as CommunicationItem : null
        );
    }
  };




  useEffect(() => {
  }, [selectedItem]);

  if (loading || listLoading) {
    return <LoadingPlaceholder message="Loading your messages & tickets..." />
  }
  
  if (error) {
    console.error("UserCommunication: An error occurred in useMessaging.", error);
    return <ErrorPlaceholder error={error} onRetry={refetch} />
  }

  const handleCreateNewTicket = () => {
    setCurrentView('new_ticket');
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
      setCurrentView('list');
    } else {
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
                workspaceId={workspaceData.id}
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
                workspaceId={workspaceData.id}
                members={workspaceMembers}
                communicationList={communicationList}
                onBack={() => setCurrentView('list')}
                onChatSelected={handleChatCreated}
                createDirectConversation={createDirectConversation}
            />
        );
    }

    if (itemLoading && !activeItemDetails) {
      return (
        <Card className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </Card>
      );
    }

    if (selectedItem && activeItemDetails) {
$      return (
        <CommunicationWindow
          key={selectedItem.id}
          communicationItem={selectedItem}
          details={activeItemDetails}
          workspaceMembers={workspaceMembers}
          onSendMessage={sendMessage}
          isSending={sendingMessage}
          currentUserId={currentUser?.id}
          typingUsers={typingUsers}
          onUserIsTyping={notifyTyping}
          onLeaveConversation={leaveConversation}
          onRemoveParticipant={removeParticipant}
          onAddParticipants={addParticipants}
          onUpdateTicketPriority={handleUpdateTicketPriority}
          onLoadMoreMessages={loadMoreMessages}
          isLoadingMore={isLoadingMore}
        />
      );
    }
    
    return (
      <Card className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
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
                    <div className="relative rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search chats or tickets..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value)
                            }}
                            className="pl-8 bg-white"
                        />
                    </div>
                      <div className="grid grid-cols-3 gap-2">
                          <Button onClick={handleCreateNewDirectChat} size="sm" className="bg-[hsl(174,75%,40%)] text-white text-xs hover:bg-[hsl(174,75%,40%)] hover:text-white">
                              <User className="w-3 h-3 mr-1" /> Direct
                          </Button>
                          <Button onClick={handleCreateNewGroupChat} size="sm" className="bg-[hsl(174,75%,40%)] text-white text-xs hover:bg-[hsl(174,75%,40%)] hover:text-white">
                              <Users className="w-3 h-3 mr-1" /> Group
                          </Button>
                          <Button onClick={handleCreateNewTicket} size="sm" className="bg-[hsl(174,75%,40%)] text-white text-xs border-transparent hover:bg-[hsl(174,75%,40%)] hover:text-white">
                              <LifeBuoy className="w-3 h-3 mr-1" /> Ticket
                          </Button>
                      </div>
                  </CardHeader>
                <CardContent className="p-0 h-full overflow-y-auto">
                  <CommunicationList
                    list={optimisticList}
                    loading={listLoading}
                    searchQuery={searchQuery}
                    selectedItem={selectedItem}
                    onSelectItem={(item) => {
                      setSelectedItem(item);
                    }}
                    currentUserId={currentUser?.id}
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
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
  console.log("UserCommunication: Component rendering or re-rendering.");

  const [currentView, setCurrentView] = useState<ViewState>('list');
  const [searchQuery, setSearchQuery] = useState("");
  console.log(`UserCommunication: State -> currentView: ${currentView}, searchQuery: "${searchQuery}"`);

  const { currentUser } = useAuth();
  console.log("UserCommunication: useAuth hook data:", { currentUser });

  const { workspaceData, loading, refetchWorkspaceData } = useWorkspaceData();
  console.log("UserCommunication: useWorkspaceData hook data:", { workspaceData, loading });

  const useMessagingPayload = { workspaceId: workspaceData?.id ?? "" };
  console.log("UserCommunication: Payload for useMessaging hook:", useMessagingPayload);
  
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


  console.log("UserCommunication: useMessaging hook data:", {
    communicationList,
    workspaceMembers,
    listLoading,
    error,
    selectedItem,
    activeItemDetails,
    itemLoading,
    sendingMessage,
  });

  useEffect(() => {
    console.log("UserCommunication: useEffect triggered by selectedItem change. New value:", selectedItem);
  }, [selectedItem]);

  console.log(`UserCommunication: Checking loading states -> workspace loading: ${loading}, listLoading: ${listLoading}`);
  if (loading || listLoading) {
    console.log("UserCommunication: Render -> LoadingPlaceholder.");
    return <LoadingPlaceholder message="Loading your messages & tickets..." />
  }
  
  console.log("UserCommunication: Checking for error state -> error:", error);
  if (error) {
    console.error("UserCommunication: An error occurred in useMessaging.", error);
    console.log("UserCommunication: Render -> ErrorPlaceholder.");
    return <ErrorPlaceholder error={error} onRetry={refetch} />
  }

  const handleCreateNewTicket = () => {
    console.log("UserCommunication: handleCreateNewTicket called. Changing view to 'new_ticket'.");
    setCurrentView('new_ticket');
    setSelectedItem(null as any);
  };

  const handleCreateNewGroupChat = () => {
    console.log("UserCommunication: handleCreateNewGroupChat called. Changing view to 'new_group_chat'.");
    setCurrentView('new_group_chat');
    setSelectedItem(null as any);
  };

  const handleCreateNewDirectChat = () => {
    console.log("UserCommunication: handleCreateNewDirectChat called. Changing view to 'new_direct_chat'.");
    setCurrentView('new_direct_chat');
    setSelectedItem(null as any);
  };

  const handleChatCreated = (newItem: CommunicationItem) => {
    console.log("UserCommunication: handleChatCreated called with new item:", newItem);
    setSelectedItem(newItem);
    setCurrentView('list');
  };

  const handleTicketSubmission = async (data: { subject: string; priority: any; message: string }) => {
    console.log("UserCommunication: handleTicketSubmission called with data:", data);
    const newTicket = await createTicket(data);
    console.log("UserCommunication: createTicket returned:", newTicket);
    if (newTicket) {
      console.log("UserCommunication: Ticket created successfully. Changing view to 'list'.");
      setCurrentView('list');
    } else {
      console.log("UserCommunication: Ticket creation failed.");
    }
  };

  const renderRightPanel = () => {
    console.log(`UserCommunication: renderRightPanel called. Current view: ${currentView}`);

    if (currentView === 'new_ticket') {
      console.log("UserCommunication: renderRightPanel -> Rendering NewTicketForm.");
      return (
        <NewTicketForm
          onBack={() => setCurrentView('list')}
          onSubmit={handleTicketSubmission}
        />
      );
    }

    if (currentView === 'new_group_chat') {
        console.log("UserCommunication: renderRightPanel -> Rendering GroupChatCreation.");
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
        console.log("UserCommunication: renderRightPanel -> Rendering DirectChatCreation.");
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

    console.log(`UserCommunication: renderRightPanel -> Checking item loading state: ${itemLoading}`);
    if (itemLoading && !activeItemDetails) {
      console.log("UserCommunication: renderRightPanel -> Rendering item loading spinner.");
      return (
        <Card className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </Card>
      );
    }

    console.log("UserCommunication: renderRightPanel -> Checking for selected item and details:", { selectedItem, activeItemDetails });
    if (selectedItem && activeItemDetails) {
      console.log("UserCommunication: renderRightPanel -> Rendering CommunicationWindow for item ID:", selectedItem.id);
      return (
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
    
    console.log("UserCommunication: renderRightPanel -> Rendering default placeholder.");
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

  console.log("UserCommunication: Preparing to render main layout.");
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
                              console.log("UserCommunication: Search query changed to:", e.target.value);
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
                  {console.log("UserCommunication: Rendering CommunicationList with props:", { list: optimisticList, loading: listLoading, searchQuery, selectedItem, currentUserId: currentUser?.id })}
                  <CommunicationList
                    list={optimisticList}
                    loading={listLoading}
                    searchQuery={searchQuery}
                    selectedItem={selectedItem}
                    onSelectItem={(item) => {
                      console.log("UserCommunication: onSelectItem in CommunicationList triggered. Item:", item);
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
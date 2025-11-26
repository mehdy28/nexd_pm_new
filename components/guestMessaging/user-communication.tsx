// components/messaging/user-communication.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, LifeBuoy, Search, Users, User, Loader2 } from "lucide-react";
import { CommunicationList } from "./conversation-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Import Mock Data
import { MOCK_CONVERSATIONS, MOCK_TICKETS, MOCK_USERS } from "@/lib/mock-data";

// Placeholder Components (Defined below in the same file for "Single File" copy/paste ease, 
// or normally in separate files. I will output them as separate blocks if requested, 
// but here I import them from what would be their paths).
import { CommunicationWindow } from "./communication-window";

// --- Mocking Missing Components for Compilation ---
const NewTicketForm = ({ onBack, onSubmit }: any) => (
  <Card className="h-full p-6">
    <h3 className="text-lg font-bold mb-4">Create New Ticket</h3>
    <Input placeholder="Subject" className="mb-4" id="ticket-subject" />
    <Button onClick={() => onSubmit({ 
        subject: (document.getElementById('ticket-subject') as HTMLInputElement).value, 
        priority: 'MEDIUM', 
        message: 'New Ticket' 
    })}>Submit</Button>
    <Button variant="ghost" onClick={onBack} className="ml-2">Cancel</Button>
  </Card>
);

const DirectChatCreation = ({ onBack, onChatSelected }: any) => (
  <Card className="h-full p-6">
    <h3 className="text-lg font-bold mb-4">New Direct Message</h3>
    <p className="text-sm text-muted-foreground mb-4">Select a member to chat with.</p>
    <div className="space-y-2">
        {MOCK_USERS.map(u => (
            <Button key={u.id} variant="outline" className="w-full justify-start" onClick={() => onChatSelected({
                id: `new_direct_${u.id}`,
                type: 'conversation',
                title: `${u.firstName} ${u.lastName}`,
                participantInfo: `${u.firstName} ${u.lastName}`,
                updatedAt: new Date().toISOString(),
                unreadCount: 0,
                lastMessage: '',
                conversationType: 'DIRECT',
                participants: [u]
            })}>
                {u.firstName} {u.lastName} ({u.role})
            </Button>
        ))}
    </div>
    <Button variant="ghost" onClick={onBack} className="mt-4">Cancel</Button>
  </Card>
);

const GroupChatCreation = ({ onBack, onChatCreated }: any) => (
    <Card className="h-full p-6">
      <h3 className="text-lg font-bold mb-4">New Group Chat</h3>
      <Button onClick={() => onChatCreated({
          id: `new_group_${Date.now()}`,
          type: 'conversation',
          title: "New Group",
          participantInfo: "You, Alex, Sarah...",
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
          lastMessage: '',
          conversationType: 'GROUP',
          participants: MOCK_USERS
      })}>Create Mock Group</Button>
      <Button variant="ghost" onClick={onBack} className="ml-2">Cancel</Button>
    </Card>
);

// --- END MOCKS ---

type ViewState = 'list' | 'new_ticket' | 'new_group_chat' | 'new_direct_chat';

interface UserCommunicationProps {
  workspaceId: string;
}

export function UserCommunication({ workspaceId }: UserCommunicationProps) {
  const [currentView, setCurrentView] = useState<ViewState>('list');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Local State replacing the custom hooks
  const currentUser = MOCK_USERS[0];
  const [communicationList, setCommunicationList] = useState<any[]>([...MOCK_TICKETS, ...MOCK_CONVERSATIONS]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Mock Actions
  const sendMessage = async (content: string) => {
    setSendingMessage(true);
    setTimeout(() => {
        setSendingMessage(false);
        // Optimistic update
        if(selectedItem) {
            // Update last message in list
            setCommunicationList(prev => prev.map(item => 
                item.id === selectedItem.id 
                ? { ...item, lastMessage: content, updatedAt: new Date().toISOString() } 
                : item
            ));
        }
    }, 600);
  };

  const createTicket = async (data: any) => {
    const newTicket = {
        id: `t-${Date.now()}`,
        subject: data.subject,
        priority: data.priority,
        status: 'OPEN',
        creator: currentUser,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'ticket',
        participantInfo: 'You',
        lastMessage: data.message,
        unreadCount: 0
    };
    setCommunicationList([newTicket, ...communicationList]);
    return newTicket;
  };

  const handleChatCreated = (newItem: any) => {
    setCommunicationList([newItem, ...communicationList]);
    setSelectedItem(newItem);
    setCurrentView('list');
  };

  const handleCreateNewTicket = () => {
    setCurrentView('new_ticket');
    setSelectedItem(null);
  };

  const handleCreateNewGroupChat = () => {
    setCurrentView('new_group_chat');
    setSelectedItem(null);
  };

  const handleCreateNewDirectChat = () => {
    setCurrentView('new_direct_chat');
    setSelectedItem(null);
  };

  const renderRightPanel = () => {
    if (currentView === 'new_ticket') {
      return (
        <NewTicketForm
          onBack={() => setCurrentView('list')}
          onSubmit={async (data: any) => {
             await createTicket(data);
             setCurrentView('list');
          }}
        />
      );
    }

    if (currentView === 'new_group_chat') {
        return (
            <GroupChatCreation
                workspaceId={workspaceId}
                members={MOCK_USERS}
                onBack={() => setCurrentView('list')}
                onChatCreated={handleChatCreated}
            />
        );
    }

    if (currentView === 'new_direct_chat') {
        return (
            <DirectChatCreation
                workspaceId={workspaceId}
                members={MOCK_USERS}
                communicationList={communicationList}
                onBack={() => setCurrentView('list')}
                onChatSelected={handleChatCreated}
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

    if (selectedItem) {
      return (
        <CommunicationWindow
          key={selectedItem.id}
          communicationItem={selectedItem}
          details={selectedItem} // For mock, item and details are roughly same
          workspaceMembers={MOCK_USERS}
          onSendMessage={sendMessage}
          isSending={sendingMessage}
          currentUserId={currentUser?.id}
          typingUsers={[]}
          onUserIsTyping={() => {}}
          onLeaveConversation={() => {}}
          onRemoveParticipant={() => {}}
          onAddParticipants={() => {}}
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
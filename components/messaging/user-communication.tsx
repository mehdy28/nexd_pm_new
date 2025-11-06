"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { MessageSquare, LifeBuoy, Search, Users, User, ArrowLeft } from "lucide-react"
import { CommunicationList } from "./conversation-list"
import { CommunicationWindow } from "./communication-window"
import { NewTicketForm } from "./new-ticket-form"
import { DirectChatCreation } from "./direct-chat-creation"
import { GroupChatCreation } from "./group-chat-creation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Define and EXPORT types for the communication item
export type CommunicationItemType = {
  id: string
  type: "conversation" | "ticket"
  title: string
  unreadCount: number
}

// Define View States
type ViewState = 'list' | 'new_ticket' | 'new_group_chat' | 'new_direct_chat'

export function UserCommunication() {
  const [selectedItem, setSelectedItem] = useState<CommunicationItemType | null>(null)
  const [currentView, setCurrentView] = useState<ViewState>('list')
  const [searchQuery, setSearchQuery] = useState("")

  const handleCreateNewTicket = () => {
    setCurrentView('new_ticket')
    setSelectedItem(null)
  }

  const handleCreateNewGroupChat = () => {
    setCurrentView('new_group_chat')
    setSelectedItem(null)
  }

  const handleCreateNewDirectChat = () => {
    setCurrentView('new_direct_chat')
    setSelectedItem(null)
  }

  const handleChatCreated = (item: CommunicationItemType) => {
    setCurrentView('list')
    setSelectedItem(item)
  }

  const handleTicketSubmission = (data: { subject: string; priority: string; message: string }) => {
    console.log("New Ticket Submitted:", data)
    alert(`Ticket submitted: ${data.subject}. We will reply shortly.`)

    const newTicket: CommunicationItemType = {
        id: `ticket-${Math.floor(Math.random() * 10000)}`,
        type: "ticket",
        title: data.subject,
        unreadCount: 0,
    };

    setCurrentView('list')
    setSelectedItem(newTicket)
  }

  const handleSelectItem = (item: CommunicationItemType) => {
    setSelectedItem(item)
    setCurrentView('list')
  }

  const renderRightPanel = () => {
    if (currentView === 'new_ticket') {
      return (
        <NewTicketForm
          onBack={() => setCurrentView('list')}
          onSubmit={handleTicketSubmission}
        />
      )
    }

    if (currentView === 'new_group_chat') {
        return (
            <GroupChatCreation
                onBack={() => setCurrentView('list')}
                onChatCreated={handleChatCreated}
            />
        )
    }

    if (currentView === 'new_direct_chat') {
        return (
            <DirectChatCreation
                onBack={() => setCurrentView('list')}
                onChatSelected={handleChatCreated}
            />
        )
    }

    if (selectedItem) {
      return <CommunicationWindow communicationItem={selectedItem} />
    }

    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            Select a Conversation or Ticket
          </h3>
          <p>
            Choose an item from the list to view messages or start a
            new interaction.
          </p>
        </div>
      </Card>
    )
  }

  // NOTE: Using calc(100% - 3.5rem) to forcibly fit the remaining space by minimally subtracting the header height and surrounding padding/spacing.

  return (
    // 1. Root container fills available height and hides overflow
<div className="h-full overflow-hidden flex">

      {/* 2. Main vertical flex container, fixed width padding */}
      <div className="h-full flex flex-col px-6">

        {/* 3. Fixed Header: uses pt-6 (1.5rem) */}
        <div className="flex-shrink-0 pt-2 ">
          <h1 className="text-3xl font-bold text-gray-900">Communication Hub</h1>
        </div>

        {/*
          4. Main Content Area (Grid + Spacing):
          REMOVED the problematic h-[50vh] and bg-red-500/20.
          Added flex-grow to ensure it takes up remaining vertical space.
        */}
        <div
          className="space-y-6 pb-6 flex-grow"
        >

          {/* Grid Layout: h-full makes sure the columns stretch to fill the calculated space */}
          <div className="grid gap-6  lg:grid-cols-3 h-full">

            {/* Left Panel Container */}
            <div className="lg:col-span-1 flex flex-col h-full h-[80vh]">
              <Card className="flex flex-col h-full">
                  {/* CardHeader (fixed height) */}
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
                          <Button
                              onClick={handleCreateNewDirectChat}
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                          >
                              <User className="w-3 h-3 mr-1" /> Direct
                          </Button>
                          <Button
                              onClick={handleCreateNewGroupChat}
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                          >
                              <Users className="w-3 h-3 mr-1" /> Group
                          </Button>
                          <Button
                              onClick={handleCreateNewTicket}
                              variant="outline"
                              size="sm"
                              className="text-[hsl(174,70%,54%)] border-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,54%)] hover:text-white text-xs"
                          >
                              <LifeBuoy className="w-3 h-3 mr-1" /> Ticket
                          </Button>
                      </div>
                  </CardHeader>

                {/* Left Panel Scrolling */}
                {/* Note: Original code used h-[80vh] here, I am using h-full to respect the parent height */}
                <CardContent className="p-0 h-full h-[80vh] overflow-y-auto">
                  <CommunicationList
                    searchQuery={searchQuery}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Panel Container */}
            <div className="lg:col-span-2 h-[80vh] ">
              {renderRightPanel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

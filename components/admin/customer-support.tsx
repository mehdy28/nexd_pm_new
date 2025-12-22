
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, User } from "lucide-react"
import { SupportTicketList } from "./support-ticket-list"
import { SupportChatWindow } from "./support-chat-window"
import { useAdminSupport } from "@/hooks/useAdminSupport"

export function CustomerSupport() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { tickets, listLoading } = useAdminSupport();

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.creator.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.creator.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.workspace.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    // CHANGE 1: Main page container is now a flex column. This is the foundation.
    <div className="h-full flex flex-col p-6">
      
      {/* CHANGE 2: Page header. 'flex-shrink-0' prevents it from shrinking. */}
      <div className="flex-shrink-0 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Customer Support</h1>
        <p className="text-gray-600">Manage customer inquiries and support tickets</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">

        
        {/* Left Panel: Ticket List */}
        <div className="lg:col-span-1 flex flex-col h-[80vh]">
        <Card className="flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Active customer support requests</CardDescription>
              <div className="relative mt-2 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white "
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto"> {/* This now scrolls correctly */}
              <SupportTicketList
                tickets={filteredTickets}
                isLoading={listLoading}
                selectedTicketId={selectedTicketId}
                onSelectTicket={setSelectedTicketId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Chat Window */}
        <div className="lg:col-span-3  h-[80vh]">
          {selectedTicketId ? (
            <SupportChatWindow key={selectedTicketId} ticketId={selectedTicketId} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">Select a Support Ticket</h3>
                <p>Choose a ticket from the list to start or continue the conversation</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

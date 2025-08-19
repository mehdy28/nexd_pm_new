"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, User } from "lucide-react"
import { SupportTicketList } from "./support-ticket-list"
import { SupportChatWindow } from "./support-chat-window"

export function CustomerSupport() {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Customer Support</h1>
        <p className="text-gray-600">Manage customer inquiries and support tickets</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Active customer support requests</CardDescription>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SupportTicketList
                searchQuery={searchQuery}
                selectedTicket={selectedTicket}
                onSelectTicket={setSelectedTicket}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedTicket ? (
            <SupportChatWindow ticketId={selectedTicket} />
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
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

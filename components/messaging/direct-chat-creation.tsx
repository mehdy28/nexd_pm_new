"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { CommunicationItemType } from "./user-communication"
import { Separator } from "@/components/ui/separator"

// Mock User Data
const mockUsers = [
  { id: "u1", name: "Alice Johnson", role: "Design Lead" },
  { id: "u2", name: "Bob Smith", role: "Frontend Engineer" },
  { id: "u3", name: "Charlie Davis", role: "Product Manager" },
  { id: "u4", name: "Dana White", role: "Marketing Specialist" },
  { id: "u5", name: "Ethan Hunt", role: "Project Coordinator" },
  { id: "u6", name: "Fiona Glenn", role: "UX Researcher" },
  { id: "u7", name: "George Miller", role: "Backend Developer" },
]

interface DirectChatCreationProps {
  onBack: () => void
  onChatSelected: (item: CommunicationItemType) => void
}

export function DirectChatCreation({ onBack, onChatSelected }: DirectChatCreationProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUserSelect = (user: typeof mockUsers[0]) => {
    // Simulate checking if chat exists or creating new one
    console.log(`Selecting user: ${user.name}`)

    // Simulate creating or finding the chat item
    const chatItem: CommunicationItemType = {
        id: `chat-d-${user.id}`,
        type: "conversation",
        title: user.name, // Title is the user's name for direct chat
        unreadCount: 0,
    }
    onChatSelected(chatItem)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Start New Direct Chat</CardTitle>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chats
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="p-4 flex-shrink-0">
            <div className="flex items-center space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search users to chat with..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                />
            </div>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-4">
            {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                    <div
                        key={user.id}
                        className="p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => handleUserSelect(user)}
                    >
                        <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                    {user.name.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="text-sm font-medium">{user.name}</h4>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2 text-[hsl(174,70%,54%)]" /> Chat
                        </Button>
                    </div>
                ))
            ) : (
                <div className="p-4 text-center text-muted-foreground">No users found matching your search.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

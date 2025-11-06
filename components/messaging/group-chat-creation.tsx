"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Users, Check, Plus, Send } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { CommunicationItemType } from "./user-communication"

// Mock User Data - Increased to ensure scroll overflow
const mockUsers = [
    { id: "u1", name: "Alice Johnson", role: "Design Lead" },
    { id: "u2", name: "Bob Smith", role: "Frontend Engineer" },
    { id: "u3", name: "Charlie Davis", role: "Product Manager" },
    { id: "u4", name: "Dana White", role: "Marketing Specialist" },
    { id: "u5", name: "Ethan Hunt", role: "Project Coordinator" },
    { id: "u6", name: "Fiona Glenn", role: "UX Researcher" },
    { id: "u7", name: "George Miller", role: "Backend Developer" },
    { id: "u8", name: "Hannah Lee", role: "Data Scientist" },
    { id: "u9", name: "Ian Clark", role: "Cloud Architect" },
    { id: "u10", name: "Jasmine King", role: "Technical Writer" },
    { id: "u11", name: "Kevin Brown", role: "Security Analyst" },
    { id: "u12", name: "Laura Green", role: "HR Partner" },
    { id: "u13", name: "Michael Vance", role: "Sales Manager" },
    { id: "u14", name: "Nora Scott", role: "Financial Analyst" },
    { id: "u15", name: "Oliver Perry", role: "DevOps Engineer" },
    { id: "u16", name: "Pamela Rose", role: "Compliance Officer" },
    { id: "u17", name: "Quentin Ford", role: "System Administrator" },
    { id: "u18", name: "Rachel Adams", role: "Content Strategist" },
    { id: "u19", name: "Steve Baker", role: "Principal Engineer" },
    { id: "u20", name: "Tina Chen", role: "Customer Success" },
]

interface GroupChatCreationProps {
  onBack: () => void
  onChatCreated: (item: CommunicationItemType) => void
}

export function GroupChatCreation({ onBack, onChatCreated }: GroupChatCreationProps) {
  const [groupName, setGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (groupName.trim() && selectedMembers.length > 0) {
        console.log(`Creating group: ${groupName} with members: ${selectedMembers.join(', ')}`)

        // Simulate creating the group chat item
        const chatItem: CommunicationItemType = {
            id: `chat-g-${Math.floor(Math.random() * 10000)}`,
            type: "conversation",
            title: groupName,
            unreadCount: 0,
        }
        onChatCreated(chatItem)
    } else {
        alert("Please provide a group name and select at least one member.")
    }
  }

  // Defensive filtering: Ensure user.name exists before calling toLowerCase()
  const filteredUsers = mockUsers.filter(user => 
    user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedUsers = mockUsers.filter(user => selectedMembers.includes(user.id))

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Start New Group Chat</CardTitle>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chats
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-6 min-h-0">

        <form onSubmit={handleCreateGroup} className="flex flex-col h-full space-y-4">
            {/* Step 1: Group Name */}
            <div className="flex-shrink-0 space-y-2">
                <label className="text-sm font-medium">Group Name</label>
                <div className="flex items-center space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                    <Input
                        placeholder="e.g., Q4 Launch Coordination"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                        className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                </div>
            </div>

            {/* Step 2: Member Selection */}
            {/* This container stretches vertically */}
            <div className="flex flex-col flex-grow min-h-0 space-y-3">
                <div className="flex justify-between items-center flex-shrink-0">
                    <h4 className="text-sm font-medium">Add Members ({selectedMembers.length})</h4>
                    <div className="text-xs text-muted-foreground">
                        Selected: {selectedUsers.map(u => u.name.split(' ')[0]).join(', ')}
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                </div>

                <div className="flex-grow min-h-0 border  rounded-md overflow-y-auto">
                    <div className="p-2 space-y-1">
                        {filteredUsers.map(user => {
                            const isSelected = selectedMembers.includes(user.id)
                            return (
                                <div
                                    key={user.id}
                                    className={cn(
                                        "p-2 rounded-md cursor-pointer flex items-center justify-between transition-colors",
                                        isSelected ? "bg-[hsl(174,70%,54%)]/20" : "hover:bg-gray-50"
                                    )}
                                    onClick={() => toggleMember(user.id)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs">
                                                {user.name.split(" ").map((n) => n[0]).join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="text-sm font-medium">{user.name}</h4>
                                            <p className="text-xs text-muted-foreground">{user.role}</p>
                                        </div>
                                    </div>
                                    {isSelected ? (
                                        <Check className="w-4 h-4 text-[hsl(174,70%,54%)]" />
                                    ) : (
                                        <Plus className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Step 3: Create Button */}
            <Button
                type="submit"
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="w-full flex-shrink-0 text-white bg-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,44%)]"
            >
                <Send className="w-4 h-4 mr-2" /> Create Group Chat
            </Button>
        </form>
      </CardContent>
    </Card>
  )
}

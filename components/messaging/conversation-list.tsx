// components/messaging/conversation-list.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// ScrollArea import removed
import { Clock, MessageSquare, LifeBuoy, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { CommunicationItemType } from "./user-communication"

// Dummy Data combining Project Conversations (Direct/Group) and Support Tickets
const allCommunicationItems = [
  {
    id: "proj-101",
    type: "conversation" as const,
    title: "Project Alpha: Backend Integration",
    participant: "Alice Johnson",
    lastMessage: "I've pushed the latest API changes to the staging environment.",
    status: "active",
    createdAt: "15 minutes ago",
    unreadCount: 2,
    icon: MessageSquare,
  },
  {
    id: "ticket-456",
    type: "ticket" as const,
    title: "Critical Bug: Task dependencies failing",
    participant: "Support Team",
    lastMessage: "Thank you, we are currently investigating this issue. Expect an update shortly.",
    status: "in-progress",
    createdAt: "3 hours ago",
    unreadCount: 1,
    icon: LifeBuoy,
  },
  {
    id: "group-201",
    type: "conversation" as const,
    title: "Marketing Strategy Team Chat",
    participant: "3 members",
    lastMessage: "We need final approval on the budget before Friday.",
    status: "active",
    createdAt: "5 hours ago",
    unreadCount: 5,
    icon: Users,
  },
  {
    id: "proj-102",
    type: "conversation" as const,
    title: "Design Feedback Loop",
    participant: "Bob Smith",
    lastMessage: "Sounds good, let's schedule a follow-up for tomorrow morning.",
    status: "closed",
    createdAt: "1 day ago",
    unreadCount: 0,
    icon: MessageSquare,
  },
  {
    id: "ticket-789",
    type: "ticket" as const,
    title: "Feature Request: Custom Reporting Exports",
    participant: "Support Team",
    lastMessage: "The ticket has been marked as resolved by the support agent.",
    status: "resolved",
    createdAt: "2 days ago",
    unreadCount: 0,
    icon: LifeBuoy,
  },
    {
    id: "group-202",
    type: "conversation" as const,
    title: "Weekly Product Review Sync",
    participant: "5 members",
    lastMessage: "Don't forget to submit your weekly progress report.",
    status: "active",
    createdAt: "3 days ago",
    unreadCount: 0,
    icon: Users,
  },
  {
    id: "proj-103",
    type: "conversation" as const,
    title: "Client X Q4 Launch Discussion",
    participant: "Emily Chen",
    lastMessage: "Confirmed the meeting time for 2 PM EST.",
    status: "active",
    createdAt: "5 days ago",
    unreadCount: 0,
    icon: MessageSquare,
  },
  {
    id: "ticket-999",
    type: "ticket" as const,
    title: "Billing Inquiry - Annual Subscription",
    participant: "Support Team",
    lastMessage: "Please verify the last 4 digits of your payment method.",
    status: "open",
    createdAt: "1 week ago",
    unreadCount: 3,
    icon: LifeBuoy,
  },
  {
    id: "proj-104",
    type: "conversation" as const,
    title: "Urgent Database Hotfix",
    participant: "David Lee",
    lastMessage: "I'm checking the logs now, stand by.",
    status: "active",
    createdAt: "1 hour ago",
    unreadCount: 1,
    icon: MessageSquare,
  },
  {
    id: "proj-105",
    type: "conversation" as const,
    title: "Q1 Retrospective Notes",
    participant: "Sarah Connor",
    lastMessage: "Shared the full document in the drive.",
    status: "closed",
    createdAt: "1 month ago",
    unreadCount: 0,
    icon: MessageSquare,
  },
]

const getTypeColor = (type: "conversation" | "ticket") => {
  return type === "ticket" ? "text-red-500" : "text-[hsl(174,70%,54%)]"
}

interface CommunicationListProps {
  searchQuery: string
  selectedItem: CommunicationItemType | null
  onSelectItem: (item: CommunicationItemType) => void
}

export function CommunicationList({ searchQuery, selectedItem, onSelectItem }: CommunicationListProps) {
  const normalizedQuery = searchQuery.toLowerCase()
  
  const filteredItems = allCommunicationItems.filter(
    (item) =>
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.lastMessage.toLowerCase().includes(normalizedQuery) ||
      item.participant.toLowerCase().includes(normalizedQuery),
  )

  return (
    // Replaced ScrollArea with a simple div, relying on the parent to provide scrolling
    <div className="space-y-1 p-4">
        {filteredItems.map((item) => {
          const IconComponent = item.icon
          const isSelected = selectedItem?.id === item.id
          
          return (
            <div
              key={item.id}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                isSelected && "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20",
              )}
              onClick={() => onSelectItem(item)}
            >
              <div className="flex items-start space-x-3">
                <div className={cn("flex-shrink-0 mt-1", getTypeColor(item.type))}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium truncate">{item.title}</h4>
                    {item.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {item.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                    <span className="font-semibold capitalize">{item.type === 'ticket' ? 'Ticket' : 'Chat'}:</span> {item.lastMessage}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[10px]">P</AvatarFallback>
                      </Avatar>
                      <span>{item.participant}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{item.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, Building } from "lucide-react"
import { cn } from "@/lib/utils"

const supportTickets = [
  {
    id: "1",
    user: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    workspace: {
      name: "Design Team",
      plan: "Pro",
    },
    subject: "Unable to upload wireframes",
    lastMessage: "I'm getting an error when trying to upload my wireframe files...",
    status: "open",
    priority: "high",
    createdAt: "2 hours ago",
    unreadCount: 3,
  },
  {
    id: "2",
    user: {
      name: "Sarah Wilson",
      email: "sarah@company.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    workspace: {
      name: "Product Team",
      plan: "Team",
    },
    subject: "Billing question about team plan",
    lastMessage: "Can you help me understand the pricing for additional team members?",
    status: "pending",
    priority: "medium",
    createdAt: "4 hours ago",
    unreadCount: 1,
  },
  {
    id: "3",
    user: {
      name: "Mike Johnson",
      email: "mike@startup.io",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    workspace: {
      name: "UX Team",
      plan: "Enterprise",
    },
    subject: "Feature request: Gantt chart improvements",
    lastMessage: "Would love to see more advanced dependency management in the Gantt view",
    status: "in-progress",
    priority: "low",
    createdAt: "1 day ago",
    unreadCount: 0,
  },
  {
    id: "4",
    user: {
      name: "Emily Chen",
      email: "emily@techcorp.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    workspace: {
      name: "Development Team",
      plan: "Pro",
    },
    subject: "Integration with external tools",
    lastMessage: "How can I integrate NEXD.PM with our existing project management tools?",
    status: "open",
    priority: "medium",
    createdAt: "2 days ago",
    unreadCount: 2,
  },
  {
    id: "5",
    user: {
      name: "David Brown",
      email: "david@agency.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    workspace: {
      name: "Marketing Team",
      plan: "Free",
    },
    subject: "Account upgrade assistance",
    lastMessage: "I need help upgrading my account and understanding the differences between plans",
    status: "resolved",
    priority: "low",
    createdAt: "3 days ago",
    unreadCount: 0,
  },
]

const getStatusBadge = (status: string) => {
  const variants = {
    open: { variant: "destructive" as const, label: "Open" },
    pending: { variant: "secondary" as const, label: "Pending" },
    "in-progress": { variant: "default" as const, label: "In Progress" },
    resolved: { variant: "outline" as const, label: "Resolved" },
  }
  return variants[status as keyof typeof variants] || variants.open
}

const getPriorityColor = (priority: string) => {
  const colors = {
    high: "text-red-600",
    medium: "text-yellow-600",
    low: "text-green-600",
  }
  return colors[priority as keyof typeof colors] || colors.medium
}

const getPlanColor = (plan: string) => {
  const colors = {
    Free: "bg-gray-500",
    Pro: "bg-[hsl(174,70%,54%)]",
    Team: "bg-[hsl(210,25%,25%)]",
    Enterprise: "bg-blue-500",
  }
  return colors[plan as keyof typeof colors] || colors.Free
}

interface SupportTicketListProps {
  searchQuery: string
  selectedTicket: string | null
  onSelectTicket: (ticketId: string) => void
}

export function SupportTicketList({ searchQuery, selectedTicket, onSelectTicket }: SupportTicketListProps) {
  const filteredTickets = supportTickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.workspace.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-1 p-4">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className={cn(
              "p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
              selectedTicket === ticket.id && "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20",
            )}
            onClick={() => onSelectTicket(ticket.id)}
          >
            <div className="flex items-start space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={ticket.user.avatar || "/placeholder.svg"} alt={ticket.user.name} />
                <AvatarFallback>
                  {ticket.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium truncate">{ticket.user.name}</h4>
                  {ticket.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {ticket.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1 truncate">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.lastMessage}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge {...getStatusBadge(ticket.status)} />
                    <span className={cn("text-xs font-medium", getPriorityColor(ticket.priority))}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{ticket.createdAt}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Building className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{ticket.workspace.name}</span>
                  <div className={cn("w-2 h-2 rounded-full", getPlanColor(ticket.workspace.plan))} />
                  <span className="text-xs text-muted-foreground">{ticket.workspace.plan}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

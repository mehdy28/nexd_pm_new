"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, Building } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdminTicketListItem } from "@/hooks/useAdminSupport"
import { formatDistanceToNow } from 'date-fns'
import { Skeleton } from "@/components/ui/skeleton"

const getStatusBadge = (status: string) => {
  const variants = {
    OPEN: { variant: "destructive" as const, label: "Open" },
    IN_PROGRESS: { variant: "default" as const, label: "In Progress" },
    RESOLVED: { variant: "outline" as const, label: "Resolved" },
    CLOSED: { variant: "secondary" as const, label: "Closed" },
  }
  return variants[status as keyof typeof variants] || variants.OPEN
}

const getPriorityColor = (priority: string) => {
  const colors = {
    HIGH: "text-red-600",
    MEDIUM: "text-yellow-600",
    LOW: "text-green-600",
  }
  return colors[priority as keyof typeof colors] || colors.MEDIUM
}

const getPlanColor = (plan: string) => {
  const colors = {
    FREE: "bg-gray-500",
    PRO: "bg-[hsl(174,70%,54%)]",
    ENTERPRISE: "bg-blue-500",
  }
  return colors[plan as keyof typeof colors] || colors.FREE
}

interface SupportTicketListProps {
  tickets: AdminTicketListItem[];
  isLoading: boolean;
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
}

export function SupportTicketList({ tickets, isLoading, selectedTicketId, onSelectTicket }: SupportTicketListProps) {

  if (isLoading) {
    return (
      <div className="space-y-1 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-1 p-4">
        {tickets.map((ticket) => {
          const creatorName = `${ticket.creator.firstName || ''} ${ticket.creator.lastName || ''}`.trim();
          return (
            <div
              key={ticket.id}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                selectedTicketId === ticket.id && "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20",
              )}
              onClick={() => onSelectTicket(ticket.id)}
            >
              <div className="flex items-start space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={ticket.creator.avatar || undefined} alt={creatorName} />
                  <AvatarFallback style={{ backgroundColor: ticket.creator.avatarColor }}>
                    {creatorName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium truncate">{creatorName}</h4>
                    {ticket.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {ticket.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1 truncate">{ticket.subject}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge {...getStatusBadge(ticket.status)} />
                      <span className={cn("text-xs font-medium", getPriorityColor(ticket.priority))}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
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
          )
        })}
      </div>
    </ScrollArea>
  )
}
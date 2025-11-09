//components/messaging/conversation-list.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { MessageSquare, LifeBuoy, Users, Loader2, Clock, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunicationItem } from "@/hooks/useMessaging";
import { formatDistanceToNow } from 'date-fns';

const priorityColors: Record<string, string> = {
  LOW: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  HIGH: 'bg-red-500',
};

const getTypeDetails = (item: CommunicationItem) => {
  if (item.type === "ticket") {
    return {
      icon: LifeBuoy,
      iconColor: "text-red-500",
    };
  }
  // Conversation
  return {
    icon: item.conversationType === 'GROUP' ? Users : UserIcon,
    iconColor: item.conversationType === 'GROUP' ? "text-purple-500" : "text-blue-500",
  };
};

interface CommunicationListProps {
  list: CommunicationItem[];
  loading: boolean;
  searchQuery: string;
  selectedItem: CommunicationItem | null;
  onSelectItem: (item: CommunicationItem) => void;
}

export function CommunicationList({ list, loading, searchQuery, selectedItem, onSelectItem }: CommunicationListProps) {
  const normalizedQuery = searchQuery.toLowerCase();
  
  const filteredItems = list.filter(
    (item) =>
      item.title.toLowerCase().includes(normalizedQuery) ||
      (item.lastMessage || '').toLowerCase().includes(normalizedQuery) ||
      item.participantInfo.toLowerCase().includes(normalizedQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No conversations or tickets found.</div>
  }

  return (
    <div className="space-y-1 p-4">
        {filteredItems.map((item) => {
          const { iconColor, icon: IconComponent } = getTypeDetails(item);
          const isSelected = selectedItem?.id === item.id;
          
          return (
            <div
              key={item.id}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                isSelected && "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20",
              )}
              onClick={() => onSelectItem(item)}
            >
              <div className="flex items-center space-x-3">
                {item.type === 'ticket' && item.priority && (
                  <span className={cn('flex-shrink-0 w-2 h-2 mt-1.5 rounded-full', priorityColors[item.priority])} />
                )}
                <div className={cn("flex-shrink-0 mt-1", iconColor)}>
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
                    {item.lastMessage}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                       <span>{item.participantInfo}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
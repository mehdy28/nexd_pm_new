//components/messaging/conversation-list.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { MessageSquare, LifeBuoy, Users, Loader2, Clock, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CommunicationItem } from "@/hooks/useMessaging";
import { formatDistanceToNow } from 'date-fns';

const priorityColors: Record<string, string> = {
  LOW: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  HIGH: 'bg-red-500',
};

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName ? firstName.charAt(0) : "";
  const last = lastName ? lastName.charAt(0) : "";
  return `${first}${last}`.toUpperCase() || "?";
};

interface CommunicationListProps {
  list: CommunicationItem[];
  loading: boolean;
  searchQuery: string;
  selectedItem: CommunicationItem | null;
  onSelectItem: (item: CommunicationItem) => void;
  currentUserId?: string;
}

export function CommunicationList({ list, loading, searchQuery, selectedItem, onSelectItem, currentUserId }: CommunicationListProps) {
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
          const isSelected = selectedItem?.id === item.id;
          
          let AvatarComponent;

          if (item.type === 'ticket') {
             AvatarComponent = (
               <div className="flex-shrink-0 mt-1 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                 <LifeBuoy className="w-5 h-5 text-red-500" />
               </div>
             );
          } else {
             // Conversation Logic
             const otherParticipants = item.participants?.filter(p => p.id !== currentUserId) || [];
             // If chatting with self or data missing, fallback to first participant or empty
             const displayParticipants = otherParticipants.length > 0 ? otherParticipants : (item.participants || []);

             if (item.conversationType === 'GROUP') {
                AvatarComponent = (
                  <div className="flex-shrink-0 mt-1 h-10 w-10 relative flex items-center justify-center">
                     {/* If group has participants, show overlap */}
                     {displayParticipants.length > 0 ? (
                        <div className="flex -space-x-4 overflow-hidden">
                           {displayParticipants.slice(0, 2).map((p, i) => (
                              <Avatar key={p.id} className={cn("inline-block h-8 w-8 rounded-full ring-2 ring-white", i === 0 ? "z-10" : "z-0")}>
                                <AvatarImage src={p.avatar || undefined} />
                                <AvatarFallback 
                                  className="text-[10px] text-white"
                                  style={{ backgroundColor: p.avatarColor || "#a855f7" }} // Purple default for group
                                >
                                  {getInitials(p.firstName, p.lastName)}
                                </AvatarFallback>
                              </Avatar>
                           ))}
                        </div>
                     ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                           <Users className="w-5 h-5 text-purple-500" />
                        </div>
                     )}
                  </div>
                )
             } else {
                // Direct Conversation
                const p = displayParticipants[0];
                if (p) {
                    AvatarComponent = (
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={p.avatar || undefined} />
                        <AvatarFallback 
                          className="text-xs text-white"
                          style={{ backgroundColor: p.avatarColor || "#3b82f6" }}
                        >
                          {getInitials(p.firstName, p.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    )
                } else {
                    // Fallback icon if participant data missing
                    AvatarComponent = (
                      <div className="flex-shrink-0 mt-1 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-500" />
                      </div>
                    )
                }
             }
          }
          
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
                
                {AvatarComponent}

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
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground truncate max-w-[120px]">
                       <span className="truncate">{item.participantInfo}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground flex-shrink-0">
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
"use client";

import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Users, Loader2, Clock, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CommunicationItem } from "@/hooks/useMessaging";
import { formatDistanceToNow } from 'date-fns';

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName ? firstName.charAt(0) : "";
  const last = lastName ? lastName.charAt(0) : "";
  return `${first}${last}`.toUpperCase() || "?";
};

// Helper function to get style classes based on item type and priority
const getItemStyles = (item: CommunicationItem, isSelected: boolean) => {
  if (item.type === 'ticket') {
    switch (item.priority) {
      case 'HIGH':
        return isSelected 
          ? "bg-red-50 border-red-200" 
          : "bg-white hover:bg-red-50/50 border-transparent hover:border-red-100";
      case 'MEDIUM':
        return isSelected 
          ? "bg-yellow-50 border-yellow-200" 
          : "bg-white hover:bg-yellow-50/50 border-transparent hover:border-yellow-100";
      case 'LOW':
      default:
        return isSelected 
          ? "bg-green-50 border-green-200" 
          : "bg-white hover:bg-green-50/50 border-transparent hover:border-green-100";
    }
  } else {
    // Conversation
    if (item.conversationType === 'GROUP') {
        return isSelected 
          ? "bg-purple-50 border-purple-200" 
          : "bg-white hover:bg-purple-50/50 border-transparent hover:border-purple-100";
    } else {
        // Direct
        return isSelected 
          ? "bg-blue-50 border-blue-200" 
          : "bg-white hover:bg-blue-50/50 border-transparent hover:border-blue-100";
    }
  }
};

const getIndicatorColor = (item: CommunicationItem) => {
    if (item.type === 'ticket') {
        if(item.priority === 'HIGH') return 'bg-red-500';
        if(item.priority === 'MEDIUM') return 'bg-yellow-500';
        return 'bg-green-500';
    }
    if (item.conversationType === 'GROUP') return 'bg-purple-500';
    return 'bg-blue-500';
}


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
    <div className="space-y-2 p-4">
        {filteredItems.map((item) => {
          const isSelected = selectedItem?.id === item.id;
          const styleClasses = getItemStyles(item, isSelected);
          const indicatorColor = getIndicatorColor(item);
          
          let AvatarComponent;

          if (item.type === 'ticket') {
             // TICKET AVATAR (Based on Priority)
             const priorityColor = item.priority === 'HIGH' ? 'text-red-600 bg-red-100' : 
                                   item.priority === 'MEDIUM' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100';
             
             AvatarComponent = (
               <div className={cn("flex-shrink-0 mt-1 h-10 w-10 rounded-lg flex items-center justify-center", priorityColor)}>
                 <LifeBuoy className="w-5 h-5" />
               </div>
             );
          } else {
             // Conversation Logic
             const otherParticipants = item.participants?.filter(p => p.id !== currentUserId) || [];
             const displayParticipants = otherParticipants.length > 0 ? otherParticipants : (item.participants || []);

             if (item.conversationType === 'GROUP') {
                AvatarComponent = (
                  <div className="flex-shrink-0 mt-1 h-10 w-10 relative flex items-center justify-center">
                     {displayParticipants.length > 0 ? (
                        <div className="flex -space-x-4 overflow-hidden">
                           {displayParticipants.slice(0, 2).map((p, i) => (
                              <Avatar key={p.id} className={cn("inline-block h-8 w-8 rounded-full ring-2 ring-white", i === 0 ? "z-10" : "z-0")}>
                                <AvatarImage src={p.avatar || undefined} />
                                <AvatarFallback 
                                  className="text-[10px] text-white"
                                  style={{ backgroundColor: p.avatarColor || "#a855f7" }} 
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
                "p-3 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm",
                styleClasses
              )}
              onClick={() => onSelectItem(item)}
            >
              <div className="flex items-center space-x-3">
                {/* Status Dot */}
                <div className={cn("w-1.5 h-10 rounded-full opacity-50", indicatorColor)}></div>
                
                {AvatarComponent}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-sm font-semibold truncate text-gray-900">{item.title}</h4>
                    {item.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4 min-w-[1rem] px-1 flex items-center justify-center shadow-sm">
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1 font-medium">
                    {item.lastMessage}
                  </p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100/50">
                    <div className="flex items-center space-x-1 text-[10px] text-muted-foreground truncate max-w-[120px]">
                       <span className="truncate opacity-75">{item.participantInfo}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-muted-foreground flex-shrink-0 opacity-75">
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
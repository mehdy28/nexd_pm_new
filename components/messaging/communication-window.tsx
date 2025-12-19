"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User as UserIcon, Users, LifeBuoy, MoreVertical, X, LogOut, Trash2, UserPlus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunicationItem, ConversationDetails, TicketDetails, TypingUser, WorkspaceMember } from "@/hooks/useMessaging";
import { formatDistanceToNow } from 'date-fns';

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

const priorityBadgeColors: Record<string, string> = {
  LOW: 'border-green-500/50 bg-green-100 text-green-800',
  MEDIUM: 'border-yellow-500/50 bg-yellow-100 text-yellow-800',
  HIGH: 'border-red-500/50 bg-red-100 text-red-800',
};
 
// Define header background styles based on type
const getHeaderStyle = (item: CommunicationItem) => {
    if (item.type === 'ticket') {
        if (item.priority === 'HIGH') return 'bg-red-100/80 border-b-red-200';
        if (item.priority === 'MEDIUM') return 'bg-yellow-100/80 border-b-yellow-200';
        return 'bg-green-100/80 border-b-green-200';
    }
    if (item.conversationType === 'GROUP') return 'bg-purple-100/80 border-b-purple-200';
    return 'bg-blue-100/80 border-b-blue-200';
};


// A simple animated dots component for the typing indicator
const TypingIndicatorDots = () => (
  <div className="flex items-center space-x-1">
    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
  </div>
);

interface CommunicationWindowProps {
  communicationItem: CommunicationItem;
  details: ConversationDetails | TicketDetails;
  workspaceMembers?: WorkspaceMember[];
  onSendMessage: (content: string) => void;
  isSending: boolean;
  currentUserId?: string;
  typingUsers?: TypingUser[];
  onUserIsTyping?: () => void;
  onLeaveConversation?: (id: string) => void;
  onRemoveParticipant?: (conversationId: string, userId: string) => void;
  onAddParticipants?: (conversationId: string, participantIds: string[]) => void;
}

export function CommunicationWindow({ 
    communicationItem, 
    details, 
    workspaceMembers = [],
    onSendMessage, 
    isSending, 
    currentUserId, 
    typingUsers = [], 
    onUserIsTyping,
    onLeaveConversation,
    onRemoveParticipant,
    onAddParticipants
}: CommunicationWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [details.messages, typingUsers]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    onUserIsTyping?.();
  };

  const typingDisplay = useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0].firstName || ''} ${typingUsers[0].lastName || ''} is typing`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].firstName} and ${typingUsers[1].firstName} are typing`;
    }
    return `${typingUsers.length} people are typing`;
  }, [typingUsers]);

  const isTicket = communicationItem.type === "ticket";
  const ticketDetails = isTicket ? (details as TicketDetails) : null;
  const conversationDetails = !isTicket ? (details as ConversationDetails) : null;
  const isGroup = conversationDetails?.type === 'GROUP';

  // Check if kicked - Added optional chaining
  const isParticipant = isTicket || (!!conversationDetails?.participants?.some(p => p.id === currentUserId));

  const { Icon, iconColor } = useMemo(() => {
    if (isTicket) {
        if (ticketDetails?.priority === 'HIGH') return { Icon: LifeBuoy, iconColor: "text-red-600" };
        if (ticketDetails?.priority === 'MEDIUM') return { Icon: LifeBuoy, iconColor: "text-yellow-600" };
        return { Icon: LifeBuoy, iconColor: "text-green-600" };
    }
    if (isGroup) return { Icon: Users, iconColor: "text-purple-600" };
    return { Icon: UserIcon, iconColor: "text-blue-600" };
  }, [isTicket, isGroup, ticketDetails]);

  // Group Management Logic
  const amICreator = conversationDetails?.creatorId === currentUserId;

  // Filter members for adding
  const existingParticipantIds = conversationDetails?.participants?.map(p => p.id) || [];
  const availableMembers = workspaceMembers.filter(
      m => !existingParticipantIds.includes(m.user.id) && 
      (m.user.firstName?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
       m.user.lastName?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
       m.user.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );
  
  const headerStyle = getHeaderStyle(communicationItem);

  return (
    <Card className="h-full flex flex-col relative overflow-hidden border-0 shadow-none">
      <CardHeader className={cn("flex-shrink-0 py-4 px-6 border-b", headerStyle)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
             <div className="p-1.5 bg-white/50 rounded-md backdrop-blur-sm flex-shrink-0">
                 <Icon className={cn("w-5 h-5", iconColor)} />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg text-gray-800" title={communicationItem.title}>
                  {communicationItem.title.length > 30
                    ? `${communicationItem.title.substring(0, 30)}...`
                    : communicationItem.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {isTicket ? `Support Ticket` : `${isGroup ? 'Group' : 'Direct'} Conversation`}
                </p>
              </div>
          </div>
          
          <div className="flex flex-shrink-0 items-center gap-2">
              {isTicket && ticketDetails && (
                <div className="flex items-center space-x-2">
                   <Badge variant="outline" className={cn("capitalize font-semibold border-2", priorityBadgeColors[ticketDetails.priority])}>
                    {ticketDetails.priority.toLowerCase()}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className="capitalize bg-white/60 hover:bg-white/60 text-gray-700 cursor-default"
                  >
                    {ticketDetails.status.toLowerCase().replace('_', ' ')}
                  </Badge>
                </div>
              )}
              
              {isGroup && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-black/5"
                    onClick={() => setIsSettingsOpen(true)}
                >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                </Button>
              )}
          </div>
        </div>
      </CardHeader>
      
      {/* Sliding Settings Modal */}
      <div 
        className={cn(
            "absolute inset-y-0 right-0 w-80 bg-white shadow-2xl z-20 transform transition-transform duration-300 ease-in-out border-l",
            isSettingsOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
         <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold">{isAddingMember ? "Add Members" : "Group Info"}</h3>
                <Button variant="ghost" size="sm" onClick={() => { setIsSettingsOpen(false); setIsAddingMember(false); }}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
            
            {isAddingMember ? (
                <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b">
                         <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setIsAddingMember(false)}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <Input 
                            placeholder="Search people..." 
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {availableMembers.length > 0 ? availableMembers.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                                <div className="flex items-center space-x-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={m.user.avatar || undefined} />
                                        <AvatarFallback>{getInitials(m.user.firstName || '')}</AvatarFallback>
                                     </Avatar>
                                     <div className="text-sm">
                                        <div className="font-medium">{m.user.firstName} {m.user.lastName}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">{m.user.email}</div>
                                     </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        if (conversationDetails) {
                                            onAddParticipants?.(conversationDetails.id, [m.user.id]);
                                            setIsAddingMember(false);
                                            setMemberSearchQuery("");
                                        }
                                    }}
                                >
                                    Add
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center text-muted-foreground text-sm pt-4">No people found.</div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                         <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Users className="w-8 h-8 text-purple-600" />
                            </div>
                            <h4 className="font-bold text-lg">{communicationItem.title}</h4>
                            {amICreator && <Badge variant="secondary" className="mt-1">You created this group</Badge>}
                         </div>
                         
                         <div>
                            <div className="flex items-center justify-between mb-3">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</h5>
                                {isParticipant && (
                                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsAddingMember(true)}>
                                        <UserPlus className="w-3 h-3 mr-1" /> Add
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {conversationDetails?.participants?.map(p => (
                                    <div key={p.id} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                             <Avatar className="h-8 w-8">
                                                <AvatarImage src={p.avatar || undefined} />
                                                <AvatarFallback>{getInitials(p.firstName || '')}</AvatarFallback>
                                             </Avatar>
                                             <div className="text-sm">
                                                <div className="font-medium">
                                                    {p.firstName} {p.lastName} 
                                                    {p.id === currentUserId && " (You)"}
                                                </div>
                                                {p.id === conversationDetails.creatorId && <div className="text-xs text-muted-foreground">Creator</div>}
                                             </div>
                                        </div>
                                        {amICreator && p.id !== currentUserId && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onRemoveParticipant?.(conversationDetails.id, p.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                    {isParticipant && (
                        <div className="p-4 border-t bg-gray-50">
                             <Button 
                                variant="destructive" 
                                className="w-full" 
                                onClick={() => {
                                    if (onLeaveConversation && conversationDetails) {
                                        onLeaveConversation(conversationDetails.id);
                                        setIsSettingsOpen(false);
                                    }
                                }}
                             >
                                <LogOut className="w-4 h-4 mr-2" /> Leave Group
                             </Button>
                        </div>
                    )}
                </>
            )}
         </div>
      </div>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-white">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          <div className="space-y-4">
            {details.messages.map((message) => {
              const isSelf = message.sender.id === currentUserId;
              const senderName = `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim();
              const isSupportAgent = 'isSupport' in message && message.isSupport;

              return (
              <div
                key={message.id}
                className={cn( "flex space-x-3", isSelf ? "flex-row-reverse space-x-reverse" : "flex-row" )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={message.sender.avatar || undefined} alt={senderName} />
                  <AvatarFallback 
                    className="text-xs text-white"
                    style={{ backgroundColor: (message.sender as any).avatarColor   }}
                  >
                    {getInitials(senderName || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("flex-1 space-y-1 max-w-[70%]", isSelf ? "text-right" : "text-left")}>
                  <div className={cn("flex items-center space-x-2", isSelf ? "justify-end" : "justify-start")}>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                    <span className="text-sm font-medium">{senderName}</span>
                    {isSupportAgent && <Badge variant="secondary" className="text-xs">Support</Badge>}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl text-sm inline-block max-w-full text-left whitespace-pre-wrap break-words shadow-sm",
                      isSelf ? "bg-[hsl(174,75%,40%)] text-white rounded-tr-sm" : "bg-white border text-gray-800 rounded-tl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            )})}

            {/* ONLY SHOW TYPING INDICATOR IF USER IS PARTICIPANT */}
            {isParticipant && typingDisplay && (
              <div className="flex items-center space-x-3 h-8">
                <div className="text-xs text-muted-foreground italic flex items-center space-x-2">
                  <span>{typingDisplay}</span>
                  <TypingIndicatorDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="p-4 flex-shrink-0 bg-gray-100 border-t">
            {isParticipant ? (
                <div className="flex items-end space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 bg-white">
                    <Textarea
                        ref={textareaRef}
                        placeholder={isTicket ? "Reply to support..." : "Send a message..."}
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        rows={1}
                        className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 max-h-32"
                    />
                    <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} className="bg-[hsl(174,75%,40%)] hover:bg-[hsl(174,75%,35%)] h-8 w-8 p-0 rounded-full text-white">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center text-red-600 text-sm flex items-center justify-center space-x-2">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">You are no longer part of this group.</span>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
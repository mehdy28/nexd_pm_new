"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, User as UserIcon, Users, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunicationItem, ConversationDetails, TicketDetails, TypingUser } from "@/hooks/useMessaging";
import { formatDistanceToNow } from 'date-fns';

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

const priorityBadgeColors: Record<string, string> = {
  LOW: 'border-green-500/50 bg-green-500/10 text-green-700',
  MEDIUM: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700',
  HIGH: 'border-red-500/50 bg-red-500/10 text-red-700',
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
  onSendMessage: (content: string) => void;
  isSending: boolean;
  currentUserId?: string;
  typingUsers?: TypingUser[];
  onUserIsTyping?: () => void;
}

export function CommunicationWindow({ communicationItem, details, onSendMessage, isSending, currentUserId, typingUsers = [], onUserIsTyping }: CommunicationWindowProps) {
  const [newMessage, setNewMessage] = useState("");
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

  const { Icon, iconColor } = useMemo(() => {
    if (isTicket) return { Icon: LifeBuoy, iconColor: "text-red-500" };
    if (conversationDetails?.type === 'GROUP') return { Icon: Users, iconColor: "text-purple-500" };
    return { Icon: UserIcon, iconColor: "text-blue-500" };
  }, [isTicket, conversationDetails]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Icon className={cn("w-5 h-5", iconColor)} />
              <span>{communicationItem.title}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {isTicket ? `Support Ticket` : `${conversationDetails?.type === 'GROUP' ? 'Group' : 'Direct'} Conversation`}
            </p>
          </div>
          {isTicket && ticketDetails && (
            <div className="flex items-center space-x-2">
               <Badge variant="outline" className={cn("capitalize", priorityBadgeColors[ticketDetails.priority])}>
                {ticketDetails.priority.toLowerCase()}
              </Badge>
              <Badge variant="secondary" className="capitalize">{ticketDetails.status.toLowerCase().replace('_', ' ')}</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
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
                  <AvatarFallback>{getInitials(senderName || 'U')}</AvatarFallback>
                </Avatar>
                <div className={cn("flex-1 space-y-1 max-w-[70%]", isSelf ? "text-right" : "text-left")}>
                  <div className={cn("flex items-center space-x-2", isSelf ? "justify-end" : "justify-start")}>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                    <span className="text-sm font-medium">{senderName}</span>
                    {isSupportAgent && <Badge variant="secondary" className="text-xs">Support</Badge>}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl text-sm inline-block max-w-full text-left whitespace-pre-wrap break-words",
                      isSelf ? "bg-[hsl(174,70%,54%)] text-white rounded-tr-sm" : "bg-gray-100 rounded-tl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            )})}

            {typingDisplay && (
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
        <Separator />
        <div className="p-4 flex-shrink-0">
            <div className="flex items-end space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                <Textarea
                    ref={textareaRef}
                    placeholder={isTicket ? "Reply to support..." : "Send a message..."}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    rows={1}
                    className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 max-h-32"
                />
                <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} className="bg-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,44%)]">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
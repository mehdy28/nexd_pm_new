// components/admin/support-chat-window.tsx
"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Send, Building, Mail, Calendar, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAdminSupport, UserPartial } from "@/hooks/useAdminSupport"
import { format, formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"


const getInitials = (user: UserPartial) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name.split(" ").map((n) => n[0]).join("").toUpperCase() || 'U';
}

interface SupportChatWindowProps {
  ticketId: string
}

export function SupportChatWindow({ ticketId }: SupportChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    ticketDetails, 
    detailsLoading, 
    detailsError,
    fetchTicketDetails,
    subscribeToTicketMessages,
    sendMessage,
    sendingMessage,
    updateTicketStatus,
    updateTicketPriority,
  } = useAdminSupport();

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails(ticketId);
    }
  }, [ticketId, fetchTicketDetails]);
  
  subscribeToTicketMessages(ticketId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketDetails?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);


  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(ticketId, newMessage);
      setNewMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (detailsLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3 h-full">
        <div className="lg:col-span-2">
            <Card className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </Card>
        </div>
        <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (detailsError || !ticketDetails) {
    return (
        <Card className="h-full flex items-center justify-center">
          <div className="text-center text-red-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Could not load ticket</h3>
            <p className="text-sm">Please try selecting the ticket again or contact support.</p>
          </div>
        </Card>
    );
  }

  const { creator, workspace } = ticketDetails;

  return (
    <div className="grid gap-6 lg:grid-cols-3 h-full">
      <div className="lg:col-span-2 min-h-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0 border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-lg" title={ticketDetails.subject}>
                  {ticketDetails.subject.length > 25
                    ? `${ticketDetails.subject.substring(0, 25)}...`
                    : ticketDetails.subject}
                </CardTitle>
                <CardDescription>Ticket #{ticketDetails.id.substring(0, 8)}</CardDescription>
              </div>
              <div className="flex flex-shrink-0 items-center space-x-2">
                <Badge variant={ticketDetails.status === 'OPEN' ? 'destructive' : 'secondary'} className="capitalize">{ticketDetails.status.toLowerCase().replace('_', ' ')}</Badge>
                <Badge variant="outline" className={cn("capitalize", { "text-red-600": ticketDetails.priority === 'HIGH', "text-yellow-600": ticketDetails.priority === 'MEDIUM', "text-green-600": ticketDetails.priority === 'LOW' })}>
                  {ticketDetails.priority} Priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              <div className="space-y-4">
                {ticketDetails.messages.map((message) => {
                  const isSupportMessage = message.isSupport;
                  const senderName = `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim();
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex space-x-3",
                        isSupportMessage ? "flex-row-reverse space-x-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={message.sender.avatar || undefined} alt={senderName} />
                        <AvatarFallback style={{ backgroundColor: message.sender.avatarColor }}>
                          {getInitials(message.sender)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("flex-1 space-y-1 max-w-[70%]", isSupportMessage ? "text-right" : "text-left")}>
                        <div className={cn("flex items-center space-x-2", isSupportMessage ? "justify-end" : "justify-start")}>
                          <span className="text-sm font-medium">{senderName}</span>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                          {isSupportMessage && (
                            <Badge variant="secondary" className="text-xs">
                              Staff
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "p-3 rounded-xl text-sm inline-block max-w-full text-left whitespace-pre-wrap break-words shadow-sm",
                            isSupportMessage
                              ? "bg-[hsl(174,70%,54%)] text-white rounded-tr-sm"
                              : "bg-white border text-gray-800 rounded-tl-sm",
                          )}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  )})}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <Separator />
            <div className="p-4 flex-shrink-0 bg-white">
                <div className="flex items-end space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 bg-gray-50">
                    <Textarea
                        ref={textareaRef}
                        placeholder="Type your response..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 max-h-32"
                        disabled={sendingMessage}
                    />
                    <Button 
                        onClick={handleSendMessage} 
                        disabled={sendingMessage || !newMessage.trim()} 
                        className="bg-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,44%)] h-8 w-8 p-0 rounded-full flex-shrink-0"
                    >
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={creator.avatar || undefined} alt={`${creator.firstName} ${creator.lastName}`} />
                <AvatarFallback style={{backgroundColor: creator.avatarColor}}>{getInitials(creator)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{creator.firstName} {creator.lastName}</h3>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground pl-1">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate" title={creator.email}>
                    {creator.email}
                </span>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <Badge className="capitalize bg-[hsl(174,70%,54%)]">{workspace.plan.toLowerCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Members:</span>
                <span className="text-sm font-medium">{workspace.memberCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="capitalize -mr-2 h-7">{ticketDetails.status.replace('_', ' ').toLowerCase()}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => updateTicketStatus(ticketId, 'OPEN')}>Open</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateTicketStatus(ticketId, 'IN_PROGRESS')}>In Progress</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateTicketStatus(ticketId, 'RESOLVED')}>Resolved</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateTicketStatus(ticketId, 'CLOSED')}>Closed</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Priority:</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="sm" className="capitalize -mr-2 h-7">{ticketDetails.priority.toLowerCase()}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => updateTicketPriority(ticketId, 'LOW')}>Low</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateTicketPriority(ticketId, 'MEDIUM')}>Medium</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateTicketPriority(ticketId, 'HIGH')}>High</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Created:</span>
              <span className="text-sm font-medium">{format(new Date(ticketDetails.createdAt), 'PP')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

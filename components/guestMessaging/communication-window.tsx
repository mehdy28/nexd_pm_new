// components/messaging/communication-window.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MoreVertical, LifeBuoy, Hash, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunicationWindowProps {
  communicationItem: any;
  details: any;
  workspaceMembers: any[];
  onSendMessage: (text: string) => void;
  isSending: boolean;
  currentUserId?: string;
  typingUsers: any[];
  onUserIsTyping: () => void;
  onLeaveConversation: (id: string) => void;
  onRemoveParticipant: (convId: string, userId: string) => void;
  onAddParticipants: (convId: string, ids: string[]) => void;
}

export function CommunicationWindow({
  communicationItem,
  onSendMessage,
  isSending,
  currentUserId
}: CommunicationWindowProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock local messages for demo
  const [localMessages, setLocalMessages] = useState<any[]>([
      { id: 1, content: "Hello there!", senderId: "u2", createdAt: new Date(Date.now() - 100000).toISOString() },
      { id: 2, content: "How is the project going?", senderId: "u2", createdAt: new Date(Date.now() - 90000).toISOString() },
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setLocalMessages([...localMessages, { 
        id: Date.now(), 
        content: inputText, 
        senderId: currentUserId, 
        createdAt: new Date().toISOString() 
    }]);
    setInputText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-600">
               {communicationItem.title[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {communicationItem.title}
              {communicationItem.type === 'ticket' && <LifeBuoy className="w-3 h-3 text-red-500" />}
            </h3>
            <p className="text-xs text-muted-foreground">{communicationItem.participantInfo}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
        </Button>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
         {localMessages.length === 0 && (
             <div className="text-center text-muted-foreground text-sm py-10">
                 No messages yet. Start the conversation!
             </div>
         )}
         {localMessages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
                <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                        isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white border text-gray-800 rounded-bl-none"
                    )}>
                        {msg.content}
                    </div>
                </div>
            )
         })}
         <div ref={messagesEndRef} />
      </CardContent>

      {/* Footer / Input */}
      <CardFooter className="p-3 border-t bg-white">
        <div className="flex w-full items-center gap-2">
            <Input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={communicationItem.type === 'ticket' ? "Reply to ticket..." : "Type a message..."}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
            />
            <Button size="icon" disabled={isSending || !inputText.trim()} onClick={handleSend} className="bg-blue-600">
                <Send className="w-4 h-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Send, Hash, LifeBuoy } from "lucide-react"
import { cn } from "@/lib/utils"
import { CommunicationItemType } from "./user-communication"

// Dummy Chat Data
const genericChatMessages = [
  {
    id: "c1",
    sender: "other",
    message: "We need to finalize the data structure for the user profiles by EOD.",
    timestamp: "2 hours ago",
    user: { name: "Alice Johnson", avatar: "/placeholder.svg?height=32&width=32" },
  },
  {
    id: "c2",
    sender: "self",
    message: "Understood. I will prepare the schema and share it in the #backend channel.",
    timestamp: "1 hour ago",
    user: { name: "Current User", avatar: "/placeholder.svg?height=32&width=32" },
  },
  {
    id: "c3",
    sender: "support-agent",
    message: "Hello! Thank you for reaching out. I've escalated your bug report to the engineering team. This process usually takes 24 hours.",
    timestamp: "30 minutes ago",
    user: { name: "Support Agent", avatar: "/placeholder.svg?height=32&width=32" },
  },
  {
    id: "c4",
    sender: "other",
    message: "I think we should use PostgreSQL for this project instead of MongoDB due to the complex joins we anticipate.",
    timestamp: "25 minutes ago",
    user: { name: "Bob Smith", avatar: "/placeholder.svg?height=32&width=32" },
  },
  {
    id: "c5",
    sender: "self",
    message: "That's a valid point, Bob. Let's discuss the migration plan during the sync up.",
    timestamp: "15 minutes ago",
    user: { name: "Current User", avatar: "/placeholder.svg?height=32&width=32" },
  },
  {
    id: "c6",
    sender: "support-agent",
    message: "Just confirming we received your files. We are reviewing them now.",
    timestamp: "10 minutes ago",
    user: { name: "Support Agent", avatar: "/placeholder.svg?height=32&width=32" },
  },
  {
    id: "c7",
    sender: "self",
    message: "Thanks for the update!",
    timestamp: "5 minutes ago",
    user: { name: "Current User", avatar: "/placeholder.svg?height=32&width=32" },
  },
]

interface CommunicationWindowProps {
  communicationItem: CommunicationItemType
}

export function CommunicationWindow({ communicationItem }: CommunicationWindowProps) {
  const [messages, setMessages] = useState(genericChatMessages)
  const [newMessage, setNewMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
        // Reset height to 'auto' to ensure it can shrink if text is deleted
        textareaRef.current.style.height = 'auto';
        // Set the height to the scroll height to fit the content
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);


  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: `c${messages.length + 1}`,
        sender: "self" as const,
        message: newMessage,
        timestamp: "Just now",
        user: { name: "Current User", avatar: "/placeholder.svg?height=32&width=32" },
      }
      setMessages([...messages, newMsg])
      setNewMessage("")
    }
  }

  const isTicket = communicationItem.type === "ticket"
  const Icon = isTicket ? LifeBuoy : Hash

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Icon className={cn("w-5 h-5", isTicket ? "text-red-500" : "text-gray-900")} />
              <span>{communicationItem.title}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {isTicket ? `Support Ticket ID: ${communicationItem.id}` : `Project Conversation`}
            </p>
          </div>
          {isTicket && (
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">Open</Badge>
              <Button variant="outline" size="sm">
                Close Ticket
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex space-x-3",
                  message.sender === "self" ? "flex-row-reverse space-x-reverse" : "flex-row",
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={message.user.avatar || "/placeholder.svg"} alt={message.user.name} />
                  <AvatarFallback>
                    {message.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("flex-1 space-y-1 max-w-[70%]", message.sender === "self" ? "text-right" : "text-left")}>
                  <div className={cn("flex items-center space-x-2", message.sender === "self" ? "justify-end" : "justify-start")}>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    <span className="text-sm font-medium">{message.user.name}</span>
                    {message.sender === "support-agent" && (
                      <Badge variant="secondary" className="text-xs">
                        Support
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl text-sm inline-block max-w-full text-left whitespace-pre-wrap break-words",
                      message.sender === "self"
                        ? "bg-[hsl(174,70%,54%)] text-white rounded-tr-sm"
                        : "bg-gray-100 rounded-tl-sm",
                    )}
                  >
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div className="p-4 flex-shrink-0">
            <div className="flex items-end space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
                <Textarea
                    ref={textareaRef}
                    placeholder={isTicket ? "Reply to support..." : "Send a message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={1}
                    className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 max-h-32"
                />
                <Button onClick={handleSendMessage} className="bg-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,44%)]">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}

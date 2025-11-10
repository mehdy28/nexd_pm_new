"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Building, Mail, Calendar, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

const chatMessages = [
  {
    id: "1",
    sender: "user",
    message:
      "Hi, I'm having trouble uploading wireframe files to my project. Every time I try to upload, I get an error message.",
    timestamp: "2 hours ago",
    user: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "2",
    sender: "admin",
    message:
      "Hello John! I'm sorry to hear you're experiencing issues with file uploads. Can you tell me what file format you're trying to upload and what the error message says?",
    timestamp: "2 hours ago",
    user: {
      name: "Support Agent",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "3",
    sender: "user",
    message:
      "I'm trying to upload .fig files from Figma. The error says 'File format not supported' but I thought Figma files were supported?",
    timestamp: "1 hour ago",
    user: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "4",
    sender: "admin",
    message:
      "I understand the confusion. Currently, we support .png, .jpg, .svg, and .pdf files for wireframes. For Figma files, you'll need to export them as one of these supported formats first. Would you like me to walk you through the export process?",
    timestamp: "1 hour ago",
    user: {
      name: "Support Agent",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "5",
    sender: "user",
    message: "That would be great! I didn't realize I needed to export them first. Yes, please walk me through it.",
    timestamp: "45 minutes ago",
    user: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  },
]

const ticketInfo = {
  id: "1",
  user: {
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  workspace: {
    name: "Design Team",
    plan: "Pro",
    members: 8,
  },
  subject: "Unable to upload wireframes",
  status: "open",
  priority: "high",
  createdAt: "2024-01-15",
  tags: ["wireframes", "upload", "figma"],
}

interface SupportChatWindowProps {
  ticketId: string
}

export function SupportChatWindow({ ticketId }: SupportChatWindowProps) {
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle sending message
      console.log("Sending message:", newMessage)
      setNewMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{ticketInfo.subject}</CardTitle>
                <CardDescription>Ticket #{ticketInfo.id}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Open</Badge>
                <Badge variant="outline" className="text-red-600">
                  HIGH Priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex space-x-3", message.sender === "admin" ? "justify-start" : "justify-start")}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.user.avatar || "/placeholder.svg"} alt={message.user.name} />
                      <AvatarFallback>
                        {message.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{message.user.name}</span>
                        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                        {message.sender === "admin" && (
                          <Badge variant="secondary" className="text-xs">
                            Staff
                          </Badge>
                        )}
                      </div>
                      <div
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          message.sender === "admin"
                            ? "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20"
                            : "bg-gray-50",
                        )}
                      >
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your response..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} className="bg-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,44%)]">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={ticketInfo.user.avatar || "/placeholder.svg"} alt={ticketInfo.user.name} />
                <AvatarFallback>
                  {ticketInfo.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{ticketInfo.user.name}</h3>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span>{ticketInfo.user.email}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{ticketInfo.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <Badge className="bg-[hsl(174,70%,54%)]">{ticketInfo.workspace.plan}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Members:</span>
                <span className="text-sm font-medium">{ticketInfo.workspace.members}</span>
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
              <Badge variant="destructive">Open</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Priority:</span>
              <Badge variant="outline" className="text-red-600">
                HIGH
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Created:</span>
              <span className="text-sm font-medium">{ticketInfo.createdAt}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {ticketInfo.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              Mark as Resolved
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              Escalate to Manager
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              Add Internal Note
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              Change Priority
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Send } from "lucide-react"
import { useState } from "react"

interface NewTicketFormProps {
  onBack: () => void
  onSubmit: (data: { subject: string; priority: string; message: string }) => void
}

export function NewTicketForm({ onBack, onSubmit }: NewTicketFormProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState("medium")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (subject.trim() && message.trim()) {
      onSubmit({ subject, priority, message })
      // Clear form after submission simulation
      setSubject("")
      setMessage("")
      setPriority("medium")
    }
  }

  const priorityColors: { [key: string]: string } = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Create New Support Ticket</CardTitle>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chats
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-6">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Subject
            </label>
            <div className="flex items-center space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
              <Input
                placeholder="e.g., Unable to access project dashboard"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Priority
            </label>
            <div className="flex items-center border rounded-md has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring has-[button:focus-visible]:ring-offset-2">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full border-0 bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 justify-start gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${priorityColors[priority]}`} />
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      High
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Details
            </label>
            <div className="flex-1 flex items-start space-x-2 border rounded-md p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
              <Textarea
                placeholder="Describe your issue or request in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-[hsl(174,70%,54%)] hover:bg-[hsl(174,70%,44%)]">
            <Send className="w-4 h-4 mr-2" /> Submit Ticket
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

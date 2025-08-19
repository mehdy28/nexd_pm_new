"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const recentActivities = [
  {
    id: 1,
    user: "John Doe",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "created a new project",
    target: "E-commerce Redesign",
    workspace: "Design Team",
    time: "2 minutes ago",
    type: "project",
  },
  {
    id: 2,
    user: "Sarah Wilson",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "completed task",
    target: "User Research Analysis",
    workspace: "Product Team",
    time: "5 minutes ago",
    type: "task",
  },
  {
    id: 3,
    user: "Mike Johnson",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "uploaded wireframe",
    target: "Mobile App Flow",
    workspace: "UX Team",
    time: "12 minutes ago",
    type: "wireframe",
  },
  {
    id: 4,
    user: "Emily Chen",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "created document",
    target: "API Documentation",
    workspace: "Development Team",
    time: "18 minutes ago",
    type: "document",
  },
  {
    id: 5,
    user: "David Brown",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "joined workspace",
    target: "Marketing Team",
    workspace: "Marketing Team",
    time: "25 minutes ago",
    type: "workspace",
  },
  {
    id: 6,
    user: "Lisa Garcia",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "upgraded to Pro plan",
    target: "Subscription",
    workspace: "Personal",
    time: "1 hour ago",
    type: "subscription",
  },
]

const getActivityBadge = (type: string) => {
  const badges = {
    project: { variant: "default" as const, color: "bg-blue-500" },
    task: { variant: "secondary" as const, color: "bg-green-500" },
    wireframe: { variant: "outline" as const, color: "bg-purple-500" },
    document: { variant: "secondary" as const, color: "bg-orange-500" },
    workspace: { variant: "outline" as const, color: "bg-[hsl(174,70%,54%)]" },
    subscription: { variant: "default" as const, color: "bg-yellow-500" },
  }
  return badges[type as keyof typeof badges] || badges.project
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest user actions across all workspaces</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar || "/placeholder.svg"} alt={activity.user} />
                <AvatarFallback>
                  {activity.user
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{activity.user}</span>
                  <Badge {...getActivityBadge(activity.type)}>{activity.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.action} <span className="font-medium">{activity.target}</span>
                </p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>in {activity.workspace}</span>
                  <span>•</span>
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

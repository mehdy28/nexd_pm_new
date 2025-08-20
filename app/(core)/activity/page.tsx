"use client"
import { useTopbarSetup } from "@/components/layout/topbar-store"
import { Activity, Clock, CheckCircle2, AlertCircle, Users, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Mock activity data - in real app this would come from API
const activityData = [
  {
    id: "1",
    type: "task_completed",
    title: "Task Completed",
    description: "Sarah completed 'Design system components' in Mobile App Redesign",
    time: "2 hours ago",
    user: { name: "Sarah Chen", avatar: "/placeholder.svg?height=32&width=32" },
    project: "Mobile App Redesign",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
  {
    id: "2",
    type: "task_created",
    title: "New Task Created",
    description: "Mike created 'API endpoint testing' in Website Migration",
    time: "4 hours ago",
    user: { name: "Mike Johnson", avatar: "/placeholder.svg?height=32&width=32" },
    project: "Website Migration",
    icon: <Clock className="h-4 w-4 text-blue-600" />,
  },
  {
    id: "3",
    type: "comment",
    title: "New Comment",
    description: "Emily commented on 'User authentication flow'",
    time: "6 hours ago",
    user: { name: "Emily Davis", avatar: "/placeholder.svg?height=32&width=32" },
    project: "Mobile App Redesign",
    icon: <MessageSquare className="h-4 w-4 text-purple-600" />,
  },
  {
    id: "4",
    type: "member_added",
    title: "Team Member Added",
    description: "Alex Rodriguez joined the API Documentation project",
    time: "1 day ago",
    user: { name: "Alex Rodriguez", avatar: "/placeholder.svg?height=32&width=32" },
    project: "API Documentation",
    icon: <Users className="h-4 w-4 text-emerald-600" />,
  },
  {
    id: "5",
    type: "deadline_approaching",
    title: "Deadline Approaching",
    description: "Mobile App Redesign milestone due in 3 days",
    time: "1 day ago",
    user: null,
    project: "Mobile App Redesign",
    icon: <AlertCircle className="h-4 w-4 text-orange-600" />,
  },
  {
    id: "6",
    type: "task_completed",
    title: "Task Completed",
    description: "John completed 'Project requirements gathering'",
    time: "2 days ago",
    user: { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32" },
    project: "Website Migration",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
]

const getActivityTypeColor = (type: string) => {
  switch (type) {
    case "task_completed":
      return "bg-green-100 text-green-800"
    case "task_created":
      return "bg-blue-100 text-blue-800"
    case "comment":
      return "bg-purple-100 text-purple-800"
    case "member_added":
      return "bg-emerald-100 text-emerald-800"
    case "deadline_approaching":
      return "bg-orange-100 text-orange-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function ActivityPage() {
  useTopbarSetup({
    title: "Activity Feed",
    tabs: [{ key: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> }],
    activeKey: "activity",
    showShare: false,
  })

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Recent Activity</h2>
        <p className="text-slate-600">Stay up to date with what's happening across your workspace</p>
      </div>

      <div className="space-y-4">
        {activityData.map((activity) => (
          <Card key={activity.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">{activity.icon}</div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm">{activity.title}</h3>
                      <p className="text-sm text-slate-600">{activity.description}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-4">{activity.time}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {activity.user && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
                            <AvatarFallback className="text-xs">
                              {activity.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-600">{activity.user.name}</span>
                        </div>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {activity.project}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${getActivityTypeColor(activity.type)}`}>
                      {activity.type.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

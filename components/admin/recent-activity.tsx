// components/admin/recent-activity.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  action: string
  createdAt: string
  user: {
    firstName?: string | null
    lastName?: string | null
    avatar?: string | null
    avatarColor?: string | null
  }
  data: any
}

interface RecentActivityProps {
  activities?: Activity[]
}

const formatActivity = (action: string, data: any): string => {
  switch (action) {
    case "MEMBER_INVITED":
      return `invited ${data.email} to a workspace`
    case "PROJECT_CREATED":
      return `created project "${data.projectName}"`
    case "SUBSCRIPTION_CHANGED":
      return `changed subscription to ${data.newPlan}`
    default:
      return action.toLowerCase().replace(/_/g, " ")
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Platform Activity</CardTitle>
        <CardDescription>Latest high-level actions across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity) => {
            const userFullName = `${activity.user.firstName || ""} ${activity.user.lastName || ""}`.trim()
            const userInitials =
              (activity.user.firstName?.[0] || "") + (activity.user.lastName?.[0] || "")

            return (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.user.avatar || undefined} alt={userFullName} />
                  <AvatarFallback style={{ backgroundColor: activity.user.avatarColor }}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{userFullName || "A user"}</span>
                    <Badge variant="secondary">{activity.action}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatActivity(activity.action, activity.data)}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
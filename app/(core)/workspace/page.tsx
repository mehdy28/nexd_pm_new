"use client"

import { useEffect } from "react"
import { useTopbar } from "@/components/layout/topbar-store"
import { Users, Settings, Plus, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Mock data - in real app this would come from API/database
const workspaceData = {
  name: "Acme Corp Workspace",
  description:
    "Our main workspace for product development and collaboration. This workspace contains all our active projects, team members, and shared resources.",
  projects: [
    {
      id: "1",
      name: "Mobile App Redesign",
      description: "Complete redesign of our mobile application with new user experience",
      status: "In Progress",
      members: 8,
      tasksCount: 24,
      completedTasks: 12,
      color: "bg-blue-500",
    },
    {
      id: "2",
      name: "Website Migration",
      description: "Migrate existing website to new tech stack and hosting",
      status: "Planning",
      members: 5,
      tasksCount: 18,
      completedTasks: 3,
      color: "bg-green-500",
    },
    {
      id: "3",
      name: "API Documentation",
      description: "Create comprehensive API documentation for external developers",
      status: "Review",
      members: 3,
      tasksCount: 12,
      completedTasks: 10,
      color: "bg-purple-500",
    },
  ],
  teamMembers: [
    {
      id: "1",
      name: "John Doe",
      role: "Product Manager",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "online",
    },
    {
      id: "2",
      name: "Sarah Chen",
      role: "Lead Designer",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "online",
    },
    {
      id: "3",
      name: "Mike Johnson",
      role: "Senior Developer",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "away",
    },
    {
      id: "4",
      name: "Emily Davis",
      role: "QA Engineer",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "offline",
    },
    {
      id: "5",
      name: "Alex Rodriguez",
      role: "DevOps Engineer",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "online",
    },
  ],
}

export default function WorkspacePage() {
  const { setConfig, setActiveKey } = useTopbar()

  useEffect(() => {
    setConfig({
      title: "Workspace Overview",
      tabs: [{ key: "overview", label: "Overview", icon: <Settings className="h-4 w-4" /> }],
      showShare: true,
    })
    setActiveKey("overview")
  }, []) // Fixed infinite render loop by removing setConfig and setActiveKey from dependencies

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-800"
      case "Planning":
        return "bg-yellow-100 text-yellow-800"
      case "Review":
        return "bg-purple-100 text-purple-800"
      case "Completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="p-8 space-y-10 bg-muted/30 min-h-full">
      {/* Workspace Description */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">{workspaceData.name}</h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">{workspaceData.description}</p>
          </div>
          <Button
            variant="outline"
            className="shadow-soft hover:shadow-medium transition-all duration-200 bg-transparent"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-foreground">Projects</h3>
          <Button className="shadow-soft hover:shadow-medium transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workspaceData.projects.map((project) => (
            <Card
              key={project.id}
              className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
            >
              <Link href={`/project/${project.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${project.color} shadow-sm`} />
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`${getStatusColor(project.status)} border-0 font-medium`}>
                      {project.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground font-medium">{project.members} members</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-semibold text-foreground">
                        {project.completedTasks}/{project.tasksCount}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(project.completedTasks / project.tasksCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* Team Members Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-foreground">Team Members</h3>
          <Button
            variant="outline"
            className="shadow-soft hover:shadow-medium transition-all duration-200 bg-transparent"
          >
            <Users className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workspaceData.teamMembers.map((member) => (
            <Card
              key={member.id}
              className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 group"
            >
              <CardContent className="p-5">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 shadow-sm">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${getStatusIndicator(member.status)} shadow-sm`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {member.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

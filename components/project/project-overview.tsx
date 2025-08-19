"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CalendarDays, Users, CheckCircle2, Clock, AlertCircle, Settings, Plus, Trash2 } from "lucide-react"

interface ProjectOverviewProps {
  projectId: string
  projectData: {
    name: string
    description: string
    status: string
    members: number
    color: string
  }
}

type Sprint = {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: "Planning" | "Active" | "Completed"
}

type NewSprintForm = {
  title: string
  description: string
  startDate: string
  endDate: string
}

// Mock data - in real app this would come from API
const getProjectStats = (projectId: string) => ({
  totalTasks: 24,
  completedTasks: 12,
  inProgressTasks: 8,
  overdueTasks: 2,
  upcomingDeadlines: 3,
  recentActivity: [
    {
      id: "1",
      type: "task_completed",
      message: "Sarah completed 'Design system components'",
      time: "2 hours ago",
      user: { name: "Sarah Chen", avatar: "/placeholder.svg?height=32&width=32" },
    },
    {
      id: "2",
      type: "task_created",
      message: "Mike created 'API endpoint testing'",
      time: "4 hours ago",
      user: { name: "Mike Johnson", avatar: "/placeholder.svg?height=32&width=32" },
    },
    {
      id: "3",
      type: "comment",
      message: "Emily commented on 'User authentication flow'",
      time: "6 hours ago",
      user: { name: "Emily Davis", avatar: "/placeholder.svg?height=32&width=32" },
    },
  ],
  teamMembers: [
    { id: "1", name: "John Doe", role: "Product Manager", avatar: "/placeholder.svg?height=32&width=32" },
    { id: "2", name: "Sarah Chen", role: "Lead Designer", avatar: "/placeholder.svg?height=32&width=32" },
    { id: "3", name: "Mike Johnson", role: "Senior Developer", avatar: "/placeholder.svg?height=32&width=32" },
    { id: "4", name: "Emily Davis", role: "QA Engineer", avatar: "/placeholder.svg?height=32&width=32" },
  ],
})

const getProjectSprints = (projectId: string): Sprint[] => [
  {
    id: "1",
    title: "Sprint 1: Foundation",
    description: "Set up project foundation and core components",
    startDate: "2024-01-15",
    endDate: "2024-01-29",
    status: "Completed",
  },
  {
    id: "2",
    title: "Sprint 2: User Interface",
    description: "Build main user interface components and screens",
    startDate: "2024-01-30",
    endDate: "2024-02-13",
    status: "Active",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Progress":
    case "Active":
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

export function ProjectOverview({ projectId, projectData }: ProjectOverviewProps) {
  const stats = getProjectStats(projectId)
  const progressPercentage = (stats.completedTasks / stats.totalTasks) * 100

  const [sprints, setSprints] = useState<Sprint[]>(getProjectSprints(projectId))
  const [newSprintOpen, setNewSprintOpen] = useState(false)
  const [newSprint, setNewSprint] = useState<NewSprintForm>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  })

  const openNewSprint = () => {
    setNewSprintOpen(true)
    setNewSprint({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
    })
  }

  const cancelNewSprint = () => {
    setNewSprintOpen(false)
  }

  const saveNewSprint = () => {
    if (!newSprint.title.trim()) return

    const sprint: Sprint = {
      id: `sprint-${Date.now()}`,
      title: newSprint.title,
      description: newSprint.description,
      startDate: newSprint.startDate,
      endDate: newSprint.endDate,
      status: "Planning",
    }

    setSprints((prev) => [sprint, ...prev])
    setNewSprintOpen(false)
  }

  const deleteSprint = (sprintId: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== sprintId))
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${projectData.color}`} />
              <Badge variant="secondary" className={getStatusColor(projectData.status)}>
                {projectData.status}
              </Badge>
            </div>
            <p className="text-slate-600 max-w-2xl">{projectData.description}</p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Project Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-slate-600">{stats.completedTasks} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
              <p className="text-xs text-slate-600">Active tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
              <p className="text-xs text-slate-600">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectData.members}</div>
              <p className="text-xs text-slate-600">Active contributors</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Progress Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
                <CardDescription>Overall completion status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed Tasks</span>
                    <span className="font-medium">
                      {stats.completedTasks}/{stats.totalTasks}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <p className="text-xs text-slate-600">{Math.round(progressPercentage)}% complete</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sprints</CardTitle>
                    <CardDescription>Manage project sprints and iterations</CardDescription>
                  </div>
                  {!newSprintOpen && (
                    <Button variant="outline" size="sm" onClick={openNewSprint}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sprint
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sprint Creation Form */}
                  {newSprintOpen && (
                    <div className="rounded-md border p-4 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Sprint Title</label>
                          <Input
                            value={newSprint.title}
                            onChange={(e) => setNewSprint((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Sprint title"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Start Date</label>
                          <Input
                            type="date"
                            value={newSprint.startDate}
                            onChange={(e) => setNewSprint((prev) => ({ ...prev, startDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">End Date</label>
                          <Input
                            type="date"
                            value={newSprint.endDate}
                            onChange={(e) => setNewSprint((prev) => ({ ...prev, endDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Description</label>
                          <Textarea
                            value={newSprint.description}
                            onChange={(e) => setNewSprint((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Sprint description"
                            className="resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button onClick={saveNewSprint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          Create
                        </Button>
                        <Button
                          variant="ghost"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={cancelNewSprint}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sprint List */}
                  {sprints.map((sprint) => (
                    <div key={sprint.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{sprint.title}</h4>
                          <Badge variant="secondary" className={getStatusColor(sprint.status)}>
                            {sprint.status}
                          </Badge>
                        </div>
                        {sprint.description && <p className="text-sm text-slate-600">{sprint.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {sprint.startDate && <span>Start: {sprint.startDate}</span>}
                          {sprint.endDate && <span>End: {sprint.endDate}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSprint(sprint.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {sprints.length === 0 && !newSprintOpen && (
                    <div className="text-center py-8 text-slate-500">
                      <p>No sprints created yet</p>
                      <Button variant="outline" size="sm" onClick={openNewSprint} className="mt-2 bg-transparent">
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first sprint
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
                        <AvatarFallback>
                          {activity.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-slate-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members</CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-slate-500 truncate">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-slate-600" />
                  <span>{stats.upcomingDeadlines} tasks due this week</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

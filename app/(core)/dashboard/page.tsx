"use client"

import { useTopbarSetup } from "@/components/layout/topbar-store"
import { useFirebaseAuth } from "@/lib/hooks/useFirebaseAuth"
import { useWorkspaces } from "@/lib/hooks/useWorkspace"
import { Gauge, TrendingUp, Users, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useProjects } from "@/lib/hooks/useProject"
import { useTasks } from "@/lib/hooks/useTask"
import { useActivities } from "@/lib/hooks/useActivity"

const getStatusColor = (status: string) => {
  switch (status) {
    case "On Track":
    case "ACTIVE":
      return "bg-green-100 text-green-800"
    case "In Progress":
      return "bg-blue-100 text-blue-800"
    case "Almost Done":
      return "bg-purple-100 text-purple-800"
    case "Behind":
    case "ARCHIVED":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "HIGH":
    case "High":
      return "bg-red-100 text-red-800"
    case "MEDIUM":
    case "Medium":
      return "bg-yellow-100 text-yellow-800"
    case "LOW":
    case "Low":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function DashboardPage() {
  const { user } = useFirebaseAuth()
  const { workspaces } = useWorkspaces()
  const { projects, loading: projectsLoading } = useProjects(workspaces?.[0]?.id)
  const { tasks, loading: tasksLoading } = useTasks(undefined, user?.uid, false)
  const { activities, loading: activitiesLoading } = useActivities(undefined, user?.uid, 10)

  useTopbarSetup({
    title: "Dashboard",
    tabs: [{ key: "dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> }],
    activeKey: "dashboard",
    showShare: false,
  })

  const activeProjects = projects?.filter((p) => p.status === "ACTIVE") || []
  const completedTasks = tasks?.filter((t) => t.status === "DONE") || []
  const thisWeekStart = new Date()
  thisWeekStart.setDate(thisWeekStart.getDate() - 7)

  const tasksCompletedThisWeek = completedTasks.filter(
    (t) => new Date(t.updatedAt) >= thisWeekStart && t.status === "DONE",
  ).length

  const tasksCreatedThisWeek = tasks?.filter((t) => new Date(t.createdAt) >= thisWeekStart).length || 0

  const upcomingDeadlines =
    tasks
      ?.filter((t) => t.dueDate && new Date(t.dueDate) > new Date() && t.status !== "DONE")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 3) || []

  if (projectsLoading || tasksLoading || activitiesLoading) {
    return (
      <div className="p-8 space-y-8 bg-muted/30 min-h-full">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-soft animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 bg-muted/30 min-h-full">
      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Projects</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Gauge className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{projects?.length || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">{activeProjects.length} active</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Completed Tasks</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{completedTasks.length}</div>
            <p className="text-sm text-muted-foreground mt-1">+{tasksCompletedThisWeek} this week</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Tasks</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{tasks?.length || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Across all projects</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">This Week</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{tasksCreatedThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">Tasks created</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Project Progress</CardTitle>
              <CardDescription className="text-muted-foreground">Current status of active projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeProjects.length > 0 ? (
                activeProjects.map((project) => {
                  const projectTasks = tasks?.filter((t) => t.project?.id === project.id) || []
                  const completedProjectTasks = projectTasks.filter((t) => t.status === "DONE")
                  const progress =
                    projectTasks.length > 0 ? Math.round((completedProjectTasks.length / projectTasks.length) * 100) : 0

                  return (
                    <div key={project.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full shadow-sm`}
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="font-medium text-foreground">{project.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="secondary"
                            className={`${getStatusColor(project.status)} border-0 font-medium`}
                          >
                            {project.status}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">{progress}%</span>
                        </div>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">No active projects found</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
              <CardDescription className="text-muted-foreground">Latest updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.type.replace(/_/g, " ").toLowerCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-8">
          <Card className="shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Upcoming Deadlines</CardTitle>
              <CardDescription className="text-muted-foreground">Tasks due soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((task) => (
                    <div
                      key={task.id}
                      className="space-y-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.project?.name || "Personal Task"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${getPriorityColor(task.priority.toLowerCase())} border-0 font-medium`}
                        >
                          {task.priority.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Due {new Date(task.dueDate!).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No upcoming deadlines</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// components/project/project-overview.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Users, CheckCircle2, Clock, AlertCircle, Settings, Plus, Trash2, Loader2 } from "lucide-react";
// Removed useParams as projectId will now be passed as a prop

import { useProjectDetails } from "@/hooks/useProjectDetails";

// --- Type definitions (moved from component to be more general or from hook) ---
type SprintUi = {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED"; // Derived status for UI
};

type NewSprintForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
};

// Define ProjectData type for the mock data passed from the page
interface MockProjectData {
  name: string;
  description: string;
  status: string; // This will be the "displayStatus" in the hook's return
  members: number; // This is just a count for the mock
  color: string;
}

// Props for ProjectOverview component
interface ProjectOverviewProps {
  projectId: string; // Now received as a prop
  projectData: MockProjectData; // Mock data passed from the parent page
}
// --------------------------------------------------------------------------------


export function ProjectOverview({ projectId, projectData }: ProjectOverviewProps) { // Accept projectId and projectData as props
  console.log("[project] ProjectOverview component rendered.");
  console.log(`[project] Received projectId from props: ${projectId}`);
  console.log(`[project] Received mock projectData from props: ${JSON.stringify(projectData)}`);

  // Use the projectId prop directly
  const { projectDetails, loading, error, refetchProjectDetails } = useProjectDetails(projectId);
  console.log(`[project] useProjectDetails hook state: loading=${loading}, error=${error?.message || 'none'}, projectDetails=${projectDetails ? 'available' : 'not yet'}`);

  const [sprints, setSprints] = useState<SprintUi[]>([]);
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [newSprint, setNewSprint] = useState<NewSprintForm>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    console.log("[project] useEffect triggered for projectDetails.sprints update.");
    if (projectDetails?.sprints) {
      console.log(`[project] Populating sprints state with ${projectDetails.sprints.length} sprints from projectDetails.`);
      setSprints(projectDetails.sprints.map(sprint => ({
        ...sprint,
        status: sprint.status
      })));
    } else {
      console.log("[project] projectDetails.sprints is not yet available or empty.");
    }
  }, [projectDetails?.sprints]);


  // --- Loading State ---
  if (loading) {
    console.log("[project] Displaying loading state.");
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading project details...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    console.error(`[project] Displaying error state: ${error.message}`);
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading project details: {error.message}</p>
      </div>
    );
  }

  // --- No Project Data ---
  if (!projectDetails) {
    console.warn(`[project] Project details not found for ID: ${projectId}.`);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Project Not Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          The project with ID "{projectId}" could not be found or you do not have access.
        </p>
      </div>
    );
  }

  // Calculate progress using fetched data
  const progressPercentage = projectDetails.totalTasks > 0
    ? (projectDetails.completedTasks / projectDetails.totalTasks) * 100
    : 0;
  console.log(`[project] Calculated project progress: ${progressPercentage}% (${projectDetails.completedTasks}/${projectDetails.totalTasks} tasks).`);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "Active":
        return "bg-blue-100 text-blue-800";
      case "PLANNING":
      case "Planning":
        return "bg-yellow-100 text-yellow-800";
      case "ON_HOLD":
        return "bg-orange-100 text-orange-800";
      case "COMPLETED":
      case "Completed":
        return "bg-green-100 text-green-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openNewSprint = () => {
    console.log("[project] Opening new sprint form.");
    setNewSprintOpen(true);
    setNewSprint({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
    });
  };

  const cancelNewSprint = () => {
    console.log("[project] Cancelling new sprint creation.");
    setNewSprintOpen(false);
  };

  const saveNewSprint = () => {
    console.log("[project] Attempting to save new sprint.");
    if (!newSprint.name.trim()) {
      console.warn("[project] Sprint name is empty, not saving.");
      return;
    }

    const sprint: SprintUi = {
      id: `sprint-${Date.now()}`, // Temporary client-side ID
      name: newSprint.name,
      description: newSprint.description,
      startDate: newSprint.startDate,
      endDate: newSprint.endDate,
      status: "PLANNING",
    };

    setSprints((prev) => {
      console.log(`[project] Adding new sprint to local state: ${sprint.name}`);
      return [sprint, ...prev];
    });
    // In a real app, you would also call a GraphQL mutation to create the sprint in the backend
    // For example: createSprintMutation({ variables: { input: newSprint } });
    console.log(`[project] Simulated backend call for new sprint: ${JSON.stringify(sprint)}`); // Simulate backend call
    setNewSprintOpen(false);
  };

  const deleteSprint = (sprintId: string) => {
    console.log(`[project] Attempting to delete sprint with ID: ${sprintId}`);
    setSprints((prev) => {
      const updatedSprints = prev.filter((s) => s.id !== sprintId);
      console.log(`[project] Sprints after deletion: ${updatedSprints.length}`);
      return updatedSprints;
    });
    // In a real app, you would also call a GraphQL mutation to delete the sprint from the backend
    // For example: deleteSprintMutation({ variables: { id: sprintId } });
    console.log(`[project] Simulated backend call for deleting sprint: ${sprintId}`); // Simulate backend call
  };


  console.log("[project] Rendering ProjectOverview with data.");
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${projectDetails.color}`} />
              <Badge variant="secondary" className={getStatusColor(projectDetails.status)}>
                {projectDetails.displayStatus}
              </Badge>
            </div>
            <p className="text-slate-600 max-w-2xl">{projectDetails.description}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => console.log("[project] Project Settings button clicked.")}>
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
              <div className="text-2xl font-bold">{projectDetails.totalTasks}</div>
              <p className="text-xs text-slate-600">{projectDetails.completedTasks} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectDetails.inProgressTasks}</div>
              <p className="text-xs text-slate-600">Active tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{projectDetails.overdueTasks}</div>
              <p className="text-xs text-slate-600">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectDetails.members.length}</div>
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
                      {projectDetails.completedTasks}/{projectDetails.totalTasks}
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
                            value={newSprint.name}
                            onChange={(e) => {
                              setNewSprint((prev) => ({ ...prev, name: e.target.value }));
                              console.log(`[project] New sprint name changed to: ${e.target.value}`);
                            }}
                            placeholder="Sprint title"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Start Date</label>
                          <Input
                            type="date"
                            value={newSprint.startDate ? new Date(newSprint.startDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              setNewSprint((prev) => ({ ...prev, startDate: e.target.value }));
                              console.log(`[project] New sprint start date changed to: ${e.target.value}`);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">End Date</label>
                          <Input
                            type="date"
                            value={newSprint.endDate ? new Date(newSprint.endDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              setNewSprint((prev) => ({ ...prev, endDate: e.target.value }));
                              console.log(`[project] New sprint end date changed to: ${e.target.value}`);
                            }}
                          />
                        </div>
                        <div className="space-y-2 col-span-full">
                          <label className="text-xs text-muted-foreground">Description</label>
                          <Textarea
                            value={newSprint.description}
                            onChange={(e) => {
                              setNewSprint((prev) => ({ ...prev, description: e.target.value }));
                              console.log(`[project] New sprint description changed.`);
                            }}
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
                          <h4 className="font-medium">{sprint.name}</h4>
                          <Badge variant="secondary" className={getStatusColor(sprint.status)}>
                            {sprint.status}
                          </Badge>
                        </div>
                        {sprint.description && <p className="text-sm text-slate-600">{sprint.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {sprint.startDate && <span>Start: {new Date(sprint.startDate).toLocaleDateString()}</span>}
                          {sprint.endDate && <span>End: {new Date(sprint.endDate).toLocaleDateString()}</span>}
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
          </div>

          {/* Team Members Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => console.log("[project] Add Team Member button clicked.")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectDetails.members.map((member) => (
                    <div key={member.user.id} className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.avatar || (member.user.firstName ? `https://ui-avatars.com/api/?name=${member.user.firstName}+${member.user.lastName}&background=random` : "/placeholder.svg")} alt={`${member.user.firstName || ""} ${member.user.lastName || ""}`} />
                        <AvatarFallback>
                          {`${(member.user.firstName?.[0] || '')}${(member.user.lastName?.[0] || '')}` || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {`${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{member.role.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  ))}
                  {projectDetails.members.length === 0 && (
                    <p className="text-sm text-center text-slate-500">No members yet.</p>
                  )}
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
                  <span>{projectDetails.upcomingDeadlines} tasks due this week</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
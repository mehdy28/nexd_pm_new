// components/project/ProjectOverview.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarDays, Users, CheckCircle2, Clock, AlertCircle, Settings, Plus, Trash2, Loader2, Pencil } from "lucide-react";

import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useSprintMutations } from "@/hooks/useSprintMutations";
import { SprintStatus, SprintDetailsFragment } from "@/types/sprint";
import { ProjectStatus } from "@/types/project";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";

// --- Type definitions ---
type SprintUi = {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  status: SprintStatus;
};

type SprintFormDataType = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
};

interface MockProjectData {
  name: string;
  description: string;
  status: string;
  members: number;
  color: string;
}

interface ProjectOverviewProps {
  projectId: string;
  projectData: MockProjectData;
}
// --------------------------------------------------------------------------------

export function ProjectOverview({ projectId, projectData }: ProjectOverviewProps) {
  console.log("[project] ProjectOverview component rendered.");

  const { projectDetails, loading, error, refetchProjectDetails } = useProjectDetails(projectId);
  const {
    createSprint,
    createLoading,
    createError,
    updateSprint,
    updateLoading,
    updateError,
    deleteSprint,
    deleteLoading,
    deleteError,
  } = useSprintMutations(projectId);

  const [sprints, setSprints] = useState<SprintUi[]>([]);
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [editSprintOpen, setEditSprintOpen] = useState(false);
  const [currentEditingSprint, setCurrentEditingSprint] = useState<SprintUi | null>(null);

  const [newSprintFormData, setNewSprintFormData] = useState<SprintFormDataType>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: SprintStatus.PLANNING,
  });
  const [editSprintFormData, setEditSprintFormData] = useState<SprintFormDataType>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: SprintStatus.PLANNING,
  });

  const [newSprintErrors, setNewSprintErrors] = useState<{ [key: string]: boolean }>({});
  const [editSprintErrors, setEditSprintErrors] = useState<{ [key: string]: boolean }>({});

  // Flag to indicate if sprints have been initially loaded into local state
  const hasInitializedSprints = useRef(false);

  useEffect(() => {
    // Only initialize sprints state once from projectDetails.sprints
    // Subsequent updates to the sprints list will be handled by local state manipulation.
    if (projectDetails?.sprints && !hasInitializedSprints.current) {
      console.log(`[project] Initializing sprints state with ${projectDetails.sprints.length} sprints from projectDetails.`);
      setSprints(
        projectDetails.sprints.map(sprint => ({
          ...sprint,
          description: sprint.description || null,
        }))
      );
      hasInitializedSprints.current = true;
    } else if (!projectDetails?.sprints && hasInitializedSprints.current) {
      // If projectDetails.sprints becomes empty/null *after* initialization, clear local state
      console.log("[project] projectDetails.sprints became unavailable, clearing local sprints state.");
      setSprints([]);
      hasInitializedSprints.current = false; // Reset if project disappears
    }
    // IMPORTANT: Removing projectDetails?.sprints from dependency array
    // to prevent it from "resetting" local state after optimistic updates.
    // This is the key change for your requirement.
  }, [projectDetails?.sprints]); // Kept dependency for initial load and explicit clear on projectDetails removal

  const combinedError = error || createError || updateError || deleteError;

  // --- Combined Loading State ---
  if (loading) {
    return <LoadingPlaceholder message="Loading project details..." />;
  }

  // --- Combined Error State ---
  if (combinedError) {
    const errorMessage = combinedError.message;
    console.error(`[project] Displaying error state: ${errorMessage}`);
    return <ErrorPlaceholder error={new Error(errorMessage)} onRetry={refetchProjectDetails} />;
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

  const progressPercentage =
    projectDetails.totalTasks > 0 ? (projectDetails.completedTasks / projectDetails.totalTasks) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case SprintStatus.ACTIVE:
      case ProjectStatus.ACTIVE:
        return "bg-blue-100 text-blue-800";
      case SprintStatus.PLANNING:
      case ProjectStatus.PLANNING:
        return "bg-yellow-100 text-yellow-800";
      case ProjectStatus.ON_HOLD:
        return "bg-orange-100 text-orange-800";
      case SprintStatus.COMPLETED:
      case ProjectStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case ProjectStatus.ARCHIVED:
        return "bg-gray-100 text-gray-800";
      case ProjectStatus.CANCELLED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openNewSprintForm = () => {
    console.log("[project] Opening new sprint form.");
    setNewSprintOpen(true);
    setNewSprintFormData({ name: "", description: "", startDate: "", endDate: "", status: SprintStatus.PLANNING });
    setNewSprintErrors({});
  };

  const cancelNewSprint = () => {
    console.log("[project] Cancelling new sprint creation.");
    setNewSprintOpen(false);
    setNewSprintErrors({});
  };

  const validateSprintForm = (
    formData: SprintFormDataType,
    setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
  ) => {
    let hasErrors = false;
    const errors: { [key: string]: boolean } = {};
    if (!formData.name.trim()) {
      errors.name = true;
      hasErrors = true;
    }
    if (!formData.startDate) {
      errors.startDate = true;
      hasErrors = true;
    }
    if (!formData.endDate) {
      errors.endDate = true;
      hasErrors = true;
    }
    setErrors(errors);
    return !hasErrors;
  };

  const handleCreateSprint = async () => {
    console.log("[project] Attempting to save new sprint via mutation (client-side optimistic update).");

    if (!validateSprintForm(newSprintFormData, setNewSprintErrors)) {
      console.warn("[project] Sprint form has validation errors.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newOptimisticSprint: SprintUi = {
      id: tempId,
      name: newSprintFormData.name,
      description: newSprintFormData.description,
      startDate: new Date(newSprintFormData.startDate).toISOString(),
      endDate: new Date(newSprintFormData.endDate).toISOString(),
      isCompleted: false,
      status: SprintStatus.PLANNING,
    };

    setSprints(prevSprints => [newOptimisticSprint, ...prevSprints]); // Add optimistically to local state
    setNewSprintOpen(false);
    setNewSprintFormData({ name: "", description: "", startDate: "", endDate: "", status: SprintStatus.PLANNING });
    setNewSprintErrors({});

    try {
      const { data } = await createSprint({
        variables: {
          input: {
            projectId,
            name: newOptimisticSprint.name,
            description: newOptimisticSprint.description,
            startDate: newOptimisticSprint.startDate,
            endDate: newOptimisticSprint.endDate,
            status: newOptimisticSprint.status,
          },
        },
      });

      if (data?.createSprint) {
        console.log(
          `[project] Server successfully created sprint: ${data.createSprint.name} with ID ${data.createSprint.id}`
        );
        // Replace optimistic sprint with real sprint from server
        setSprints(prevSprints =>
          prevSprints.map(s =>
            s.id === tempId
              ? {
                  ...data.createSprint,
                  description: data.createSprint.description || null,
                }
              : s
          )
        );
      } else {
        // If no data, implies an error on server side, rollback optimistic
        console.error("[project] Create sprint mutation returned no data, rolling back optimistic update.");
        setSprints(prevSprints => prevSprints.filter(s => s.id !== tempId));
      }
    } catch (err) {
      console.error("[project] Error creating sprint, rolling back optimistic update:", err);
      setSprints(prevSprints => prevSprints.filter(s => s.id !== tempId)); // Rollback on error
    }
  };

  const openEditSprintForm = (sprint: SprintUi) => {
    console.log(`[project] Opening edit sprint form for ID: ${sprint.id}`);
    setCurrentEditingSprint(sprint);

    const formatDateForInput = (dateString: string | undefined): string => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string received for sprint ID ${sprint.id}: ${dateString}`);
        return "";
      }
      return date.toISOString().split("T")[0];
    };

    setEditSprintFormData({
      name: sprint.name,
      description: sprint.description || "",
      startDate: formatDateForInput(sprint.startDate),
      endDate: formatDateForInput(sprint.endDate),
      status: sprint.status,
    });
    setEditSprintErrors({});
    setEditSprintOpen(true);
  };

  const cancelEditSprint = () => {
    console.log("[project] Cancelling sprint edit.");
    setEditSprintOpen(false);
    setCurrentEditingSprint(null);
    setEditSprintErrors({});
  };

  const handleUpdateSprint = async () => {
    console.log(
      `[project] Attempting to update sprint ID: ${currentEditingSprint?.id} via mutation (client-side optimistic update).`
    );
    if (!currentEditingSprint) return;

    if (!validateSprintForm(editSprintFormData, setEditSprintErrors)) {
      console.warn("[project] Edit sprint form has validation errors.");
      return;
    }

    const updatedOptimisticSprint: SprintUi = {
      ...currentEditingSprint,
      name: editSprintFormData.name,
      description: editSprintFormData.description,
      startDate: new Date(editSprintFormData.startDate).toISOString(),
      endDate: new Date(editSprintFormData.endDate).toISOString(),
      status: editSprintFormData.status,
      isCompleted: editSprintFormData.status === SprintStatus.COMPLETED,
    };

    const originalSprints = sprints; // For rollback
    setSprints(prevSprints => prevSprints.map(s => (s.id === currentEditingSprint.id ? updatedOptimisticSprint : s)));
    setEditSprintOpen(false);
    setCurrentEditingSprint(null);
    setEditSprintErrors({});

    try {
      const { data } = await updateSprint({
        variables: {
          input: {
            id: updatedOptimisticSprint.id,
            name: updatedOptimisticSprint.name,
            description: updatedOptimisticSprint.description,
            startDate: updatedOptimisticSprint.startDate,
            endDate: updatedOptimisticSprint.endDate,
            status: updatedOptimisticSprint.status,
            isCompleted: updatedOptimisticSprint.isCompleted,
          },
        },
      });

      if (data?.updateSprint) {
        console.log(
          `[project] Server successfully updated sprint: ${data.updateSprint.name} with ID ${data.updateSprint.id}`
        );
        setSprints(prevSprints =>
          prevSprints.map(s =>
            s.id === data.updateSprint.id
              ? {
                  ...data.updateSprint,
                  description: data.updateSprint.description || null,
                }
              : s
          )
        );
      } else {
        console.error("[project] Update sprint mutation returned no data, rolling back optimistic update.");
        setSprints(originalSprints);
      }
    } catch (err) {
      console.error("[project] Error updating sprint, rolling back optimistic update:", err);
      setSprints(originalSprints);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    console.log(`[project] Attempting to delete sprint with ID: ${sprintId} via mutation (client-side optimistic update).`);

    const originalSprints = sprints; // Store for rollback
    setSprints(prevSprints => prevSprints.filter(s => s.id !== sprintId)); // Remove optimistically from local state

    try {
      await deleteSprint({
        variables: { id: sprintId },
      });
      console.log(`[project] Server successfully deleted sprint: ${sprintId}`);
      // UI already updated optimistically
    } catch (err) {
      console.error(`[project] Error deleting sprint ${sprintId}, rolling back optimistic update:`, err);
      setSprints(originalSprints); // Rollback on error
    }
  };

  console.log("[project] Rendering ProjectOverview with data.");
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pt-0 space-y-6">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className={`w-4 h-4 rounded-full ${projectDetails.color}`} />
            <Badge variant="secondary" className={getStatusColor(projectDetails.status)}>
              {projectDetails.displayStatus}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">{projectDetails.name}</h1>
            <p className="text-slate-600 max-w-2xl">{projectDetails.description}</p>
          </div>
          {/* <Button variant="outline" size="sm" onClick={() => console.log("[project] Project Settings button clicked.")}>
            <Settings className="h-4 w-4 mr-2" />
            Project Settings
          </Button> */}
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
                    <Button variant="outline" size="sm" onClick={openNewSprintForm} disabled={createLoading}>
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
                            value={newSprintFormData.name}
                            onChange={e => {
                              setNewSprintFormData(prev => ({ ...prev, name: e.target.value }));
                              setNewSprintErrors(prev => ({ ...prev, name: false }));
                            }}
                            placeholder="Sprint title"
                            disabled={createLoading}
                            className={newSprintErrors.name ? "border-red-500" : ""}
                          />
                          {newSprintErrors.name && <p className="text-red-500 text-xs mt-1">Sprint name is required.</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Start Date</label>
                          <Input
                            type="date"
                            value={newSprintFormData.startDate}
                            onChange={e => {
                              setNewSprintFormData(prev => ({ ...prev, startDate: e.target.value }));
                              setNewSprintErrors(prev => ({ ...prev, startDate: false }));
                            }}
                            disabled={createLoading}
                            className={newSprintErrors.startDate ? "border-red-500" : ""}
                          />
                          {newSprintErrors.startDate && (
                            <p className="text-red-500 text-xs mt-1">Start date is required.</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">End Date</label>
                          <Input
                            type="date"
                            value={newSprintFormData.endDate}
                            onChange={e => {
                              setNewSprintFormData(prev => ({ ...prev, endDate: e.target.value }));
                              setNewSprintErrors(prev => ({ ...prev, endDate: false }));
                            }}
                            disabled={createLoading}
                            className={newSprintErrors.endDate ? "border-red-500" : ""}
                          />
                          {newSprintErrors.endDate && <p className="text-red-500 text-xs mt-1">End date is required.</p>}
                        </div>
                        <div className="space-y-2 col-span-full">
                          <label className="text-xs text-muted-foreground">Description</label>
                          <Textarea
                            value={newSprintFormData.description}
                            onChange={e => {
                              setNewSprintFormData(prev => ({ ...prev, description: e.target.value }));
                            }}
                            placeholder="Sprint description"
                            className="resize-none"
                            rows={2}
                            disabled={createLoading}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          onClick={handleCreateSprint}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={createLoading}
                        >
                          {createLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Create
                        </Button>
                        <Button
                          variant="ghost"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={cancelNewSprint}
                          disabled={createLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sprint List */}
                  {sprints.length === 0 && !newSprintOpen && (
                    <div className="text-center py-8 text-slate-500">
                      <p>No sprints created yet</p>
                      <Button variant="outline" size="sm" onClick={openNewSprintForm} className="mt-2 bg-transparent">
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first sprint
                      </Button>
                    </div>
                  )}

                  {sprints.map(sprint => (
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
                      <div className="flex gap-2">
                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSprintForm(sprint)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          disabled={updateLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Delete Confirmation Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Deletion</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete the sprint "<strong>{sprint.name}</strong>"? This action
                                cannot be undone. Any tasks associated with this sprint will lose their sprint
                                assignment.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={
                                  () => {
                                    /* Close dialog handled by shadcn internally */
                                  }
                                }
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDeleteSprint(sprint.id)}
                                disabled={deleteLoading}
                              >
                                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Sprint Dialog/Modal */}
          {currentEditingSprint && (
            <Dialog open={editSprintOpen} onOpenChange={setEditSprintOpen}>
              <DialogContent className="bg-white sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Sprint: {currentEditingSprint.name}</DialogTitle>
                  <DialogDescription>Make changes to your sprint here. Click save when you're done.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Sprint Title</label>
                    <Input
                      value={editSprintFormData.name}
                      onChange={e => {
                        setEditSprintFormData(prev => ({ ...prev, name: e.target.value }));
                        setEditSprintErrors(prev => ({ ...prev, name: false }));
                      }}
                      placeholder="Sprint title"
                      disabled={updateLoading}
                      className={editSprintErrors.name ? "border-red-500" : ""}
                    />
                    {editSprintErrors.name && <p className="text-red-500 text-xs mt-1">Sprint name is required.</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={editSprintFormData.startDate}
                      onChange={e => {
                        setEditSprintFormData(prev => ({ ...prev, startDate: e.target.value }));
                        setEditSprintErrors(prev => ({ ...prev, startDate: false }));
                      }}
                      disabled={updateLoading}
                      className={editSprintErrors.startDate ? "border-red-500" : ""}
                    />
                    {editSprintErrors.startDate && (
                      <p className="text-red-500 text-xs mt-1">Start date is required.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">End Date</label>
                    <Input
                      type="date"
                      value={editSprintFormData.endDate}
                      onChange={e => {
                        setEditSprintFormData(prev => ({ ...prev, endDate: e.target.value }));
                        setEditSprintErrors(prev => ({ ...prev, endDate: false }));
                      }}
                      disabled={updateLoading}
                      className={editSprintErrors.endDate ? "border-red-500" : ""}
                    />
                    {editSprintErrors.endDate && <p className="text-red-500 text-xs mt-1">End date is required.</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Textarea
                      value={editSprintFormData.description}
                      onChange={e => {
                        setEditSprintFormData(prev => ({ ...prev, description: e.target.value }));
                      }}
                      placeholder="Sprint description"
                      className="resize-none"
                      rows={2}
                      disabled={updateLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <select
                      value={editSprintFormData.status}
                      onChange={e => {
                        setEditSprintFormData(prev => ({ ...prev, status: e.target.value as SprintStatus }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={updateLoading}
                    >
                      {Object.values(SprintStatus).map(status => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={cancelEditSprint} disabled={updateLoading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateSprint}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={updateLoading}
                  >
                    {updateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

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
                  {projectDetails.members.map(member => (
                    <div key={member.user.id} className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            member.user.avatar ||
                            (member.user.firstName
                              ? `https://ui-avatars.com/api/?name=${member.user.firstName}+${member.user.lastName}&background=random`
                              : "/placeholder.svg")
                          }
                          alt={`${member.user.firstName || ""} ${member.user.lastName || ""}`}
                        />
                        <AvatarFallback>
                          {`${member.user.firstName?.[0] || ""}${member.user.lastName?.[0] || ""}` || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {`${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{member.role.replace(/_/g, " ")}</p>
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

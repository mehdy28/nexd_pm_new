"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  MoreHorizontal,
  Edit,
} from "lucide-react";

import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useSprintMutations } from "@/hooks/useSprintMutations";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { useMemberManagement } from "@/hooks/useMemberManagement";
import { useAuth } from "@/hooks/useAuth";
import { SprintStatus } from "@/types/sprint";
import { ProjectStatus } from "@/types/project";
import { ProjectRole } from "@/types/workspace";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";
import { AssignProjectMembersModal } from "@/components/project/assign-project-members-modal";

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

interface ProjectOverviewProps {
  projectId: string;
}
// --------------------------------------------------------------------------------

export function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { currentUser } = useAuth();
  const { projectDetails, loading, error, refetchProjectDetails } = useProjectDetails(projectId);
  const { createSprint, createLoading, createError, updateSprint, updateLoading, updateError, deleteSprint, deleteLoading, deleteError } = useSprintMutations(projectId);
  const { updateProject, loading: projectUpdateLoading } = useProjectMutations();
  const { 
    updateProjectRole, 
    updateProjectRoleLoading,
    removeProjectMembers,
    removeProjectMembersLoading
  } = useMemberManagement(projectDetails?.workspace.id || "", projectId);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [projectFormData, setProjectFormData] = useState({
    name: "",
    description: "",
    status: ProjectStatus.PLANNING,
  });

  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [currentEditingSprint, setCurrentEditingSprint] = useState<SprintUi | null>(null);
  const [isAssignMembersModalOpen, setIsAssignMembersModalOpen] = useState(false);
  
  // State for member management modals
  const [isUpdateRoleModalOpen, setIsUpdateRoleModalOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<{ id: string; name: string; role: ProjectRole } | null>(null);
  const [newRole, setNewRole] = useState<ProjectRole | "">("");
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const [newSprintFormData, setNewSprintFormData] = useState<SprintFormDataType>({ name: "", description: "", startDate: "", endDate: "", status: SprintStatus.PLANNING });
  const [editSprintFormData, setEditSprintFormData] = useState<SprintFormDataType>({ name: "", description: "", startDate: "", endDate: "", status: SprintStatus.PLANNING });

  const [newSprintErrors, setNewSprintErrors] = useState<{ [key: string]: boolean }>({});
  const [editSprintErrors, setEditSprintErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (projectDetails) {
      setProjectFormData({
        name: projectDetails.name,
        description: projectDetails.description || "",
        status: projectDetails.status as ProjectStatus,
      });
    }
  }, [projectDetails?.name, projectDetails?.description, projectDetails?.status]);
  
  const currentUserMembership = projectDetails?.members.find(member => member.user.id === currentUser?.id);
  const canManageProject = currentUserMembership?.role === ProjectRole.OWNER || currentUserMembership?.role === ProjectRole.ADMIN;

  const combinedError = error || createError || updateError || deleteError;

  const handleUpdateProject = async (field: 'name' | 'description' | 'status', value: string) => {
    if (!projectDetails) return;
    if (field === 'name' && !value.trim()) {
      setProjectFormData(prev => ({ ...prev, name: projectDetails.name }));
      return;
    }
    if (projectDetails[field] === value) return;

    try {
      await updateProject({ id: projectId, [field]: value });
    } catch (err) {
      console.error(`Failed to update project ${field}`, err);
      setProjectFormData({
        name: projectDetails.name,
        description: projectDetails.description || '',
        status: projectDetails.status as ProjectStatus,
      });
    }
  };

  if (loading) return <LoadingPlaceholder message="Loading project details..." />;
  if (combinedError) {
    const errorMessage = combinedError.message;
    return <ErrorPlaceholder error={new Error(errorMessage)} onRetry={refetchProjectDetails} />;
  }
  if (!projectDetails) {
    return <div className="text-center p-8">Project Not Found</div>;
  }

  const progressPercentage = projectDetails.totalTasks > 0 ? (projectDetails.completedTasks / projectDetails.totalTasks) * 100 : 0;
  const getStatusColor = (status: string) => {
    switch (status) {
      case SprintStatus.ACTIVE: case ProjectStatus.ACTIVE: return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case SprintStatus.PLANNING: case ProjectStatus.PLANNING: return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case ProjectStatus.ON_HOLD: return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case SprintStatus.COMPLETED: case ProjectStatus.COMPLETED: return "bg-green-100 text-green-800 hover:bg-green-200";
      case ProjectStatus.ARCHIVED: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case ProjectStatus.CANCELLED: return "bg-red-100 text-red-800 hover:bg-red-200";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const openNewSprintForm = () => {
    setCurrentEditingSprint(null);
    setNewSprintOpen(true);
    setNewSprintFormData({ name: "", description: "", startDate: "", endDate: "", status: SprintStatus.PLANNING });
    setNewSprintErrors({});
  };

  const cancelNewSprint = () => setNewSprintOpen(false);

  const validateSprintForm = (formData: SprintFormDataType, setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>) => {
    const errors: { [key: string]: boolean } = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.startDate) errors.startDate = true;
    if (!formData.endDate) errors.endDate = true;
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSprint = async () => {
    if (!validateSprintForm(newSprintFormData, setNewSprintErrors)) return;
    try {
      await createSprint({ variables: { input: { ...newSprintFormData, projectId } } });
      setNewSprintOpen(false);
      refetchProjectDetails();
    } catch (err) { console.error("Error creating sprint:", err); }
  };

  const openEditSprintForm = (sprint: SprintUi) => {
    setNewSprintOpen(false);
    setCurrentEditingSprint(sprint);
    const formatDate = (dateString: string) => new Date(dateString).toISOString().split("T")[0];
    setEditSprintFormData({
      name: sprint.name,
      description: sprint.description || "",
      startDate: formatDate(sprint.startDate),
      endDate: formatDate(sprint.endDate),
      status: sprint.status,
    });
    setEditSprintErrors({});
  };

  const cancelEditSprint = () => setCurrentEditingSprint(null);

  const handleUpdateSprint = async () => {
    if (!currentEditingSprint || !validateSprintForm(editSprintFormData, setEditSprintErrors)) return;
    try {
      await updateSprint({
        variables: {
          input: {
            id: currentEditingSprint.id,
            ...editSprintFormData,
            isCompleted: editSprintFormData.status === SprintStatus.COMPLETED,
          },
        },
      });
      setCurrentEditingSprint(null);
      refetchProjectDetails();
    } catch (err) { console.error("Error updating sprint:", err); }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      await deleteSprint({ variables: { id: sprintId } });
      refetchProjectDetails();
    } catch (err) { console.error("Error deleting sprint:", err); }
  };
  
  const handleConfirmUpdateRole = async () => {
    if (!memberToUpdate || !newRole || newRole === memberToUpdate.role) return;
    try {
        await updateProjectRole(memberToUpdate.id, newRole);
        await refetchProjectDetails();
        setIsUpdateRoleModalOpen(false);
        setMemberToUpdate(null);
    } catch (err) {
        console.error("Failed to update project role:", err);
        setIsUpdateRoleModalOpen(false);
        setMemberToUpdate(null);
    }
  };
  
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
        await removeProjectMembers([memberToRemove.id]);
        await refetchProjectDetails();
        setMemberToRemove(null);
    } catch (err) {
        console.error("Failed to remove project member:", err);
        setMemberToRemove(null);
    }
  };

  const handleCloseAssignModal = () => {
    setIsAssignMembersModalOpen(false);
    refetchProjectDetails();
  };

  const formInputClasses = `border border-[#419d97] bg-white focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-[#4ab5ae]`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pt-0 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-auto h-auto rounded-md px-2.5 py-0.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${getStatusColor(projectFormData.status)}`}
                    disabled={projectUpdateLoading}
                  >
                    {projectFormData.status.replace(/_/g, " ")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.values(ProjectStatus).map(status => (
                    <DropdownMenuItem
                      key={status}
                      onSelect={() => {
                        setProjectFormData(prev => ({ ...prev, status }));
                        handleUpdateProject('status', status);
                      }}
                    >
                      {status.replace(/_/g, " ")}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {isEditingTitle ? (
              <Input
                value={projectFormData.name}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, name: e.target.value }))}
                onBlur={(e) => {
                  setIsEditingTitle(false);
                  handleUpdateProject('name', e.target.value);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                autoFocus
                className="text-3xl font-bold tracking-tight h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={projectUpdateLoading}
              />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                {projectFormData.name}
              </h1>
            )}

            {isEditingDescription ? (
              <Textarea
                value={projectFormData.description}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, description: e.target.value }))}
                onBlur={(e) => {
                  setIsEditingDescription(false);
                  handleUpdateProject('description', e.target.value);
                }}
                autoFocus
                className="text-slate-600 max-w-2xl p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                disabled={projectUpdateLoading}
              />
            ) : (
              <p className="text-slate-600 max-w-2xl cursor-pointer min-h-[20px]" onClick={() => setIsEditingDescription(true)}>
                {projectFormData.description || <span className="text-slate-400 italic">Click to add a description</span>}
              </p>
            )}
          </div>
        </div>

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
                    <span className="font-medium">{projectDetails.completedTasks}/{projectDetails.totalTasks}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2 bg-teal-100 border border-teal-200 [&>div]:bg-[#4ab5ae]" />
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
                      <Plus className="h-4 w-4 mr-2" />Add Sprint
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {newSprintOpen && (
                    <div className="rounded-md border p-4 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Sprint Title</label>
                          <Input value={newSprintFormData.name} onChange={e => { setNewSprintFormData(prev => ({ ...prev, name: e.target.value })); setNewSprintErrors(prev => ({ ...prev, name: false })); }} placeholder="Sprint title" disabled={createLoading} className={`${formInputClasses} ${newSprintErrors.name ? "border-red-500" : ""}`} />
                          {newSprintErrors.name && <p className="text-red-500 text-xs mt-1">Sprint name is required.</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Start Date</label>
                          <Input type="date" value={newSprintFormData.startDate} onChange={e => { setNewSprintFormData(prev => ({ ...prev, startDate: e.target.value })); setNewSprintErrors(prev => ({ ...prev, startDate: false })); }} disabled={createLoading} className={`${formInputClasses} ${newSprintErrors.startDate ? "border-red-500" : ""}`} />
                          {newSprintErrors.startDate && <p className="text-red-500 text-xs mt-1">Start date is required.</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">End Date</label>
                          <Input type="date" value={newSprintFormData.endDate} onChange={e => { setNewSprintFormData(prev => ({ ...prev, endDate: e.target.value })); setNewSprintErrors(prev => ({ ...prev, endDate: false })); }} disabled={createLoading} className={`${formInputClasses} ${newSprintErrors.endDate ? "border-red-500" : ""}`} />
                          {newSprintErrors.endDate && <p className="text-red-500 text-xs mt-1">End date is required.</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Description</label>
                          <Textarea value={newSprintFormData.description} onChange={e => { setNewSprintFormData(prev => ({ ...prev, description: e.target.value })); }} placeholder="Sprint description" className={`resize-none ${formInputClasses}`} rows={4} disabled={createLoading} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button onClick={handleCreateSprint} className="bg-[#4ab5ae] text-white hover:bg-[#419d97]" disabled={createLoading}>
                          {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Create
                        </Button>
                        <Button variant="ghost" className="bg-red-500 hover:bg-red-600 text-white" onClick={cancelNewSprint} disabled={createLoading}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {projectDetails.sprints.length === 0 && !newSprintOpen && (
                    <div className="text-center py-8 text-slate-500">
                      <p>No sprints created yet</p>
                      <Button variant="outline" size="sm" onClick={openNewSprintForm} className="mt-2 bg-transparent">
                        <Plus className="h-4 w-4 mr-2" /> Create your first sprint
                      </Button>
                    </div>
                  )}

                  {projectDetails.sprints.map(sprint =>
                    currentEditingSprint?.id === sprint.id ? (
                      <div key={sprint.id} className="rounded-md border p-4 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Sprint Title</label>
                            <Input value={editSprintFormData.name} onChange={e => { setEditSprintFormData(prev => ({ ...prev, name: e.target.value })); setEditSprintErrors(prev => ({ ...prev, name: false })); }} placeholder="Sprint title" disabled={updateLoading} className={`${formInputClasses} ${editSprintErrors.name ? "border-red-500" : ""}`} />
                            {editSprintErrors.name && <p className="text-red-500 text-xs mt-1">Sprint name is required.</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Start Date</label>
                            <Input type="date" value={editSprintFormData.startDate} onChange={e => { setEditSprintFormData(prev => ({ ...prev, startDate: e.target.value })); setEditSprintErrors(prev => ({ ...prev, startDate: false })); }} disabled={updateLoading} className={`${formInputClasses} ${editSprintErrors.startDate ? "border-red-500" : ""}`} />
                            {editSprintErrors.startDate && <p className="text-red-500 text-xs mt-1">Start date is required.</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">End Date</label>
                            <Input type="date" value={editSprintFormData.endDate} onChange={e => { setEditSprintFormData(prev => ({ ...prev, endDate: e.target.value })); setEditSprintErrors(prev => ({ ...prev, endDate: false })); }} disabled={updateLoading} className={`${formInputClasses} ${editSprintErrors.endDate ? "border-red-500" : ""}`} />
                            {editSprintErrors.endDate && <p className="text-red-500 text-xs mt-1">End date is required.</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Description</label>
                            <Textarea value={editSprintFormData.description} onChange={e => { setEditSprintFormData(prev => ({ ...prev, description: e.target.value })); }} placeholder="Sprint description" className={`resize-none ${formInputClasses}`} rows={4} disabled={updateLoading} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Button onClick={handleUpdateSprint} className="bg-[#4ab5ae] text-white hover:bg-[#419d97]" disabled={updateLoading}>
                            {updateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Save Changes
                          </Button>
                          <Button variant="ghost" className="bg-red-500 hover:bg-red-600 text-white" onClick={cancelEditSprint} disabled={updateLoading}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div key={sprint.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{sprint.name}</h4>
                            <Badge variant="secondary" className={getStatusColor(sprint.status)}>{sprint.status}</Badge>
                          </div>
                          {sprint.description && <p className="text-sm text-slate-600">{sprint.description}</p>}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {sprint.startDate && <span>Start: {new Date(sprint.startDate).toLocaleDateString()}</span>}
                            {sprint.endDate && <span>End: {new Date(sprint.endDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditSprintForm({ ...sprint, status: sprint.status as SprintStatus })} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" disabled={updateLoading}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={deleteLoading}>
                                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>Are you sure you want to delete the sprint "<strong>{sprint.name}</strong>"? This action cannot be undone.</DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button variant="destructive" onClick={() => handleDeleteSprint(sprint.id)} disabled={deleteLoading}>
                                  {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members</CardTitle>
                  {canManageProject && (
                    <Button variant="outline" size="sm" onClick={() => setIsAssignMembersModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectDetails.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={member.user.avatar || undefined} 
                            alt={`${member.user.firstName || ""} ${member.user.lastName || ""}`} 
                          />
                          <AvatarFallback 
                            className="text-white font-semibold"
                            style={{ backgroundColor: (member.user as any).avatarColor }}
                          >
                            {`${member.user.firstName?.[0] || ""}${member.user.lastName?.[0] || ""}` || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{`${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email}</p>
                          <p className="text-xs text-slate-500 truncate">{member.role.charAt(0) + member.role.slice(1).toLowerCase()}</p>
                        </div>
                      </div>
                      {canManageProject && member.role !== ProjectRole.OWNER && member.user.id !== currentUser?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setMemberToUpdate({
                                  id: member.id,
                                  name: `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email,
                                  role: member.role as ProjectRole,
                                });
                                setNewRole(member.role as ProjectRole);
                                setIsUpdateRoleModalOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Change Role</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setMemberToRemove({
                                id: member.id,
                                name: `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email
                              })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Remove from Project</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                  {projectDetails.members.length === 0 && <p className="text-sm text-center text-slate-500">No members yet.</p>}
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

      {projectDetails?.workspace?.id && (
        <AssignProjectMembersModal
          isOpen={isAssignMembersModalOpen}
          onClose={handleCloseAssignModal}
          projectId={projectId}
          workspaceId={projectDetails.workspace.id}
        />
      )}
      
      {/* Update Role Modal */}
      {isUpdateRoleModalOpen && memberToUpdate && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setIsUpdateRoleModalOpen(false)}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" 
                onClick={(e) => e.stopPropagation()}
            >
                <div>
                    <h2 className="text-lg font-semibold">Update Role</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Change the project role for <strong>{memberToUpdate.name}</strong>.
                    </p>
                </div>
                <div className="py-4">
                    <Select
                        value={newRole}
                        onValueChange={(value) => setNewRole(value as ProjectRole)}
                        disabled={updateProjectRoleLoading}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(ProjectRole)
                                .filter(role => role !== ProjectRole.OWNER)
                                .map(role => (
                                    <SelectItem key={role} value={role}>
                                        {role.charAt(0) + role.slice(1).toLowerCase()}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsUpdateRoleModalOpen(false)} disabled={updateProjectRoleLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmUpdateRole} disabled={updateProjectRoleLoading || !newRole || newRole === memberToUpdate.role}>
                        {updateProjectRoleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Update
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setMemberToRemove(null)}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" 
                onClick={(e) => e.stopPropagation()}
            >
                <div>
                    <h2 className="text-lg font-semibold">Remove Member</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Are you sure you want to remove <strong>{memberToRemove.name}</strong> from the project? This action cannot be undone.
                    </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={removeProjectMembersLoading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirmRemoveMember} disabled={removeProjectMembersLoading}>
                        {removeProjectMembersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Remove
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
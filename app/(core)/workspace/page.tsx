"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTopbar } from "@/components/layout/topbar-store";
import { Users, Settings, Plus, MoreHorizontal, Trash2, Loader2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useWorkspaceMutations } from "@/hooks/useWorkspaceMutations";
import CreateProjectModal from "@/components/project/create-project-modal";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";
import { InviteMembersModal } from "@/components/workspace/invite-members-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemberManagement } from "@/hooks/useMemberManagement";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceRole } from "@/types/workspace";

export default function WorkspacePage() {
  const pathname = usePathname();
  const { setConfig, setActiveKey } = useTopbar();
  const { currentUser } = useAuth();
  

  // --- Data Hooks ---
  const { workspaceData, loading, error, refetchWorkspaceData } = useWorkspaceData();
  const { updateWorkspace, loading: workspaceUpdateLoading } = useWorkspaceMutations();
  const { 
    removeWorkspaceMembers, 
    updateWorkspaceRole, 
    removeWorkspaceMembersLoading, 
    updateWorkspaceRoleLoading 
  } = useMemberManagement(workspaceData?.id || "");
  const { deleteProject, loading: deleteLoading } = useProjectMutations();
  // ------------------

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  
  const [isUpdateRoleModalOpen, setIsUpdateRoleModalOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<{ id: string; name: string; role: WorkspaceRole } | null>(null);
  const [newRole, setNewRole] = useState<WorkspaceRole | "">("");

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [workspaceFormData, setWorkspaceFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    setConfig({
      title: workspaceData?.name ? `${workspaceData?.name} Overview` : "Workspace Overview",
      tabs: [{ key: "overview", label: "Overview", icon: <Settings className="h-4 w-4" /> }],
      showShare: true,
    });
    setActiveKey("overview");
  }, [workspaceData?.name, setConfig, setActiveKey]);
  
  useEffect(() => {
    if (workspaceData) {
      setWorkspaceFormData({
        name: workspaceData.name,
        description: workspaceData.description || "",
      });
    }
  }, [workspaceData]);

  const currentUserMembership = workspaceData?.members.find(
    (member) => member.user.id === currentUser?.id
  );
  const currentUserRole = currentUserMembership?.role;

  const canManageWorkspace =
    currentUserRole === WorkspaceRole.OWNER ||
    currentUserRole === WorkspaceRole.ADMIN;

  const handleUpdateWorkspace = async (field: 'name' | 'description', value: string) => {
    if (!workspaceData) return;

    const originalValue = workspaceData[field] || "";
    if (value === originalValue) return;

    const updatePayload = { [field]: value };
    
    try {
      await updateWorkspace({ id: workspaceData.id, ...updatePayload });
    } catch (err) {
      console.error(`Failed to update workspace`, err);
      // Revert on failure
      setWorkspaceFormData({
        name: workspaceData.name,
        description: workspaceData.description || "",
      });
    }
  };

  // --- Error/Loading Gates ---
  if (loading) {
    return <LoadingPlaceholder message="Loading workspace data..." />;
  }

  if (error) {
    console.error("[WorkspacePage] Rendering ErrorPlaceholder.", error);
    return <ErrorPlaceholder error={error} onRetry={refetchWorkspaceData} />;
  }
  
  if (!workspaceData) {
      // This state shouldn't be reached if auth worked, but defensively returning an error state.
      return <ErrorPlaceholder error={"Workspace data missing."} onRetry={refetchWorkspaceData} />;
  }
  // ---------------------------

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeWorkspaceMembers([memberToRemove.id]);
      setMemberToRemove(null);
    } catch (err) {
      console.error("Failed to remove member:", err);
      setMemberToRemove(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      refetchWorkspaceData();
    } catch (err) {
      setProjectToDelete(null);
    }
  };
  
  const handleConfirmUpdateRole = async () => {
    if (!memberToUpdate || !newRole || newRole === memberToUpdate.role) return;
    try {
      await updateWorkspaceRole(memberToUpdate.id, newRole as WorkspaceRole);
      await refetchWorkspaceData();
      setIsUpdateRoleModalOpen(false);
      setMemberToUpdate(null);
    } catch (err) {
      console.error("Failed to update role.", err);
      setIsUpdateRoleModalOpen(false);
      setMemberToUpdate(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-blue-100 text-blue-800";
      case "PLANNING": return "bg-yellow-100 text-yellow-800";
      case "ON_HOLD": return "bg-orange-100 text-orange-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "ARCHIVED": return "bg-gray-100 text-gray-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleProjectCreated = () => {
    refetchWorkspaceData();
  }

  return (
    <>
      <div className="p-8 space-y-10 bg-muted/30 min-h-full">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 max-w-3xl">
              {isEditingName ? (
                <Input
                  value={workspaceFormData.name}
                  onChange={(e) => setWorkspaceFormData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={(e) => {
                    setIsEditingName(false);
                    handleUpdateWorkspace('name', e.target.value);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  autoFocus
                  className="text-3xl font-bold h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={workspaceUpdateLoading}
                />
              ) : (
                <h2
                  className={`text-3xl font-bold text-foreground ${canManageWorkspace ? 'cursor-pointer' : ''}`}
                  onClick={() => canManageWorkspace && setIsEditingName(true)}
                >
                  {workspaceFormData.name || "Workspace"}
                </h2>
              )}
              {isEditingDescription ? (
                <Textarea
                  value={workspaceFormData.description}
                  onChange={(e) => setWorkspaceFormData(prev => ({ ...prev, description: e.target.value }))}
                  onBlur={(e) => {
                    setIsEditingDescription(false);
                    handleUpdateWorkspace('description', e.target.value);
                  }}
                  autoFocus
                  className="text-muted-foreground leading-relaxed w-full p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  disabled={workspaceUpdateLoading}
                />
              ) : (
                <p
                  className={`text-muted-foreground leading-relaxed min-h-[24px] ${canManageWorkspace ? 'cursor-pointer' : ''}`}
                  onClick={() => canManageWorkspace && setIsEditingDescription(true)}
                >
                  {workspaceFormData.description || <span className="text-slate-400 italic">Click to add a description</span>}
                </p>
              )}
            </div>
          </div>
          {(workspaceData?.industry || workspaceData?.teamSize || workspaceData?.workFields?.length) && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {workspaceData?.industry && (<Badge variant="secondary" className="bg-gray-100 text-gray-800 border-0">Industry: {workspaceData.industry}</Badge>)}
              {workspaceData?.teamSize && (<Badge variant="secondary" className="bg-gray-100 text-gray-800 border-0">Team Size: {workspaceData.teamSize}</Badge>)}
              {workspaceData?.workFields && workspaceData.workFields.map((field, index) => (<Badge key={index} variant="secondary" className="bg-gray-100 text-gray-800 border-0">{field}</Badge>))}
            </div>
          )}
        </div>
        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-foreground">Projects</h3>
            {canManageWorkspace && (
              <Button className="shadow-soft hover:shadow-medium transition-all duration-200" onClick={() => setIsCreateProjectModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaceData?.projects.map(project => (
              <Card key={project.id} className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 group relative">
                <Link href={`/project/${project.id}`} className="absolute inset-0 z-10" aria-label={`View project ${project.name}`} />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full bg-indigo-500 shadow-sm`} />
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">{project.name}</CardTitle>
                    </div>
                    {canManageWorkspace && (
                      <div className="relative z-20">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                setProjectToDelete({ id: project.id, name: project.name });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground leading-relaxed">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`${getStatusColor(project.status)} border-0 font-medium`}>{project.status.replace(/_/g, " ")}</Badge>
                    <span className="text-sm text-muted-foreground font-medium">{project.projectMemberCount} members</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-semibold text-foreground">{project.completedTaskCount}/{project.totalTaskCount}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${project.totalTaskCount > 0 ? (project.completedTaskCount / project.totalTaskCount) * 100 : 0}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Members Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-foreground">Team Members</h3>
            {canManageWorkspace && (
              <Button variant="outline" className="shadow-soft hover:shadow-medium transition-all duration-200 bg-transparent" onClick={() => setIsInviteModalOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaceData?.members.map(member => (
              <Card key={member.id} className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 shadow-sm">
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
                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{`${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.role.charAt(0) + member.role.slice(1).toLowerCase()}</p>
                    </div>
                  </div>
                  {canManageWorkspace && member.role !== WorkspaceRole.OWNER && member.user.id !== currentUser?.id && (
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
                                role: member.role as WorkspaceRole 
                            });
                            setNewRole(member.role as WorkspaceRole);
                            setIsUpdateRoleModalOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Change Role</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setMemberToRemove({
                            id: member.id,
                            name: `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email
                          })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Remove from Workspace</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {workspaceData?.id && (
        <>
          <CreateProjectModal
            isOpen={isCreateProjectModalOpen}
            onClose={() => setIsCreateProjectModalOpen(false)}
            currentWorkspaceId={workspaceData?.id}
            onProjectCreated={handleProjectCreated}
          />
          <InviteMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            workspaceId={workspaceData?.id}
          />
        </>
      )}

      {projectToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !deleteLoading && setProjectToDelete(null)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Delete Project</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the project "<strong>{projectToDelete.name}</strong>"? This will permanently delete the project and all of its associated data. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setProjectToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !removeWorkspaceMembersLoading && setMemberToRemove(null)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Remove Member</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove <strong>{memberToRemove.name}</strong> from the workspace? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setMemberToRemove(null)}
                disabled={removeWorkspaceMembersLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRemoveMember}
                disabled={removeWorkspaceMembersLoading}
              >
                {removeWorkspaceMembersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {isUpdateRoleModalOpen && memberToUpdate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !updateWorkspaceRoleLoading && setIsUpdateRoleModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Update Role</h3>
              <p className="text-sm text-muted-foreground">
                Change the workspace role for <strong>{memberToUpdate.name}</strong>.
              </p>
            </div>
            
            <div>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as WorkspaceRole)}
                disabled={updateWorkspaceRoleLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(WorkspaceRole)
                    .filter(role => role !== WorkspaceRole.OWNER)
                    .map(role => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsUpdateRoleModalOpen(false)}
                disabled={updateWorkspaceRoleLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpdateRole}
                disabled={updateWorkspaceRoleLoading || !newRole || newRole === memberToUpdate.role}
              >
                {updateWorkspaceRoleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

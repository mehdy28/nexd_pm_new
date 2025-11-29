//app/(core)/workspace/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTopbar } from "@/components/layout/topbar-store";
import { Users, Settings, Plus, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import CreateProjectModal from "@/components/project/create-project-modal";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";
import { InviteMembersModal } from "@/components/workspace/invite-members-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemberManagement } from "@/hooks/useMemberManagement";
import { useProjectMutations } from "@/hooks/useProjectMutations";

export default function WorkspacePage() {
  const { setConfig, setActiveKey } = useTopbar();

  const { workspaceData, loading, error, refetchWorkspaceData } = useWorkspaceData();
  const { removeWorkspaceMembers, loading: removeMemberLoading } = useMemberManagement(workspaceData?.id || "");
  const { deleteProject, loading: deleteLoading } = useProjectMutations();

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  console.log(`%c[RENDER] WorkspacePage`, 'color: orange; font-weight: bold;', {
    loading,
    deleteLoading,
    error: error?.message || null,
    projectToDelete,
    memberToRemove,
    isCreateProjectModalOpen,
    isInviteModalOpen,
    projectCount: workspaceData?.projects?.length
  });


  useEffect(() => {
    console.log("LOG: [useEffect] - Running effect to set Topbar config. Workspace data available:", !!workspaceData);
    setConfig({
      title: workspaceData?.name ? `${workspaceData.name} Overview` : "Workspace Overview",
      tabs: [{ key: "overview", label: "Overview", icon: <Settings className="h-4 w-4" /> }],
      showShare: true,
    });
    setActiveKey("overview");
  }, [workspaceData, setConfig, setActiveKey]);

  if (loading) {
    console.log("LOG: [Render State] - Showing loading placeholder.");
    return <LoadingPlaceholder message="Loading workspace data..." />;
  }

  if (error) {
    console.error("LOG: [Render State] - Showing error placeholder.", error);
    return <ErrorPlaceholder error={error} onRetry={refetchWorkspaceData} />;
  }

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeWorkspaceMembers([memberToRemove.id]);
      setMemberToRemove(null);
      refetchWorkspaceData(); // Refetch to update member list
    } catch (err) {
      console.error("Failed to remove member:", err);
      setMemberToRemove(null);
    }
  };

  const handleDeleteProject = async () => {
    console.log(`%c[ACTION] handleDeleteProject - START`, 'color: red; font-weight: bold;', { projectToDelete });
    if (!projectToDelete) {
      console.warn("LOG: [handleDeleteProject] - Aborting. projectToDelete is null.");
      return;
    }
    try {
      console.log("LOG: [handleDeleteProject] - Awaiting deleteProject mutation...");
      await deleteProject(projectToDelete.id);
      console.log("%c[SUCCESS] deleteProject mutation completed.", 'color: green;');
      console.log("LOG: [handleDeleteProject] - Setting projectToDelete state to null to close modal.");
      setProjectToDelete(null);
      console.log("LOG: [handleDeleteProject] - Calling refetchWorkspaceData().");
      refetchWorkspaceData();
      console.log("LOG: [handleDeleteProject] - Refetch initiated.");
    } catch (err) {
      console.error("LOG: [handleDeleteProject] - deleteProject FAILED:", err);
      console.log("LOG: [handleDeleteProject] - Setting projectToDelete state to null on error.");
      setProjectToDelete(null);
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
    console.log("LOG: [handleProjectCreated] - Project created. Refetching workspace data.");
    refetchWorkspaceData();
  }

  return (
    <>
      <div className="p-8 space-y-10 bg-muted/30 min-h-full">
        {/* Workspace Description */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{workspaceData.name}</h2>
              <p className="text-muted-foreground leading-relaxed max-w-3xl">{workspaceData.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {workspaceData.industry && (<Badge variant="secondary" className="bg-gray-100 text-gray-800 border-0">Industry: {workspaceData.industry}</Badge>)}
            {workspaceData.teamSize && (<Badge variant="secondary" className="bg-gray-100 text-gray-800 border-0">Team Size: {workspaceData.teamSize}</Badge>)}
            {workspaceData.workFields && workspaceData.workFields.map((field, index) => (<Badge key={index} variant="secondary" className="bg-gray-100 text-gray-800 border-0">{field}</Badge>))}
          </div>
        </div>
        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-foreground">Projects</h3>
            <Button className="shadow-soft hover:shadow-medium transition-all duration-200" onClick={() => {
              console.log("LOG: [New Project Button] - Clicked. Setting isCreateProjectModalOpen to true.");
              setIsCreateProjectModalOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaceData.projects.map(project => (
              <Card key={project.id} className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 group relative">
                {/* The Link is now an invisible overlay for navigation */}
                <Link href={`/project/${project.id}`} className="absolute inset-0 z-10" aria-label={`View project ${project.name}`} onClick={(e) => console.log(`%c[EVENT] Link OVERLAY for project '${project.name}' clicked. Navigation should occur.`, 'color: blue;')} />

                {/* The content is rendered normally but is underneath the link overlay */}
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full bg-indigo-500 shadow-sm`} />
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">{project.name}</CardTitle>
                    </div>
                    {/* The Dropdown sits on top of the link overlay because of a higher z-index */}
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
                            onSelect={() => { // onSelect or onClick is fine now, no propagation to fight
                              console.log("%c[EVENT] DropdownMenuItem 'Delete' SELECTED.", 'color: red; font-weight:bold;');
                              console.log("LOG: [Delete MenuItem] - Calling setProjectToDelete with:", { id: project.id, name: project.name });
                              setProjectToDelete({ id: project.id, name: project.name });
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
            <Button variant="outline" className="shadow-soft hover:shadow-medium transition-all duration-200 bg-transparent" onClick={() => {
              console.log("LOG: [Invite Members Button] - Clicked. Setting isInviteModalOpen to true.");
              setIsInviteModalOpen(true);
            }}>
              <Users className="h-4 w-4 mr-2" />
              Invite Members
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaceData.members.map(member => (
              <Card key={member.id} className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 shadow-sm">
                      {/* Only use the uploaded avatar if it exists. Otherwise, fall back to the AvatarFallback below */}
                      <AvatarImage 
                        src={member.user.avatar || undefined} 
                        alt={`${member.user.firstName || ""} ${member.user.lastName || ""}`} 
                      />
                      {/* 
                         Use the stored avatarColor from DB. 
                         The text is white to match the 500-weight colors (e.g., bg-red-500).
                         Fallback to indigo-500 if the color is missing.
                      */}
                      <AvatarFallback 
                        className="text-white font-semibold"
                        style={{ backgroundColor: (member.user as any).avatarColor   }}
                      >
                        {`${member.user.firstName?.[0] || ""}${member.user.lastName?.[0] || ""}` || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{`${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.role.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  {member.role !== 'OWNER' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setMemberToRemove({
                            id: member.id,
                            name: `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email
                          })}
                          className="text-destructive focus:text-destructive"
                        >
                          Remove from Workspace
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

      {workspaceData.id && (
        <>
          <CreateProjectModal
            isOpen={isCreateProjectModalOpen}
            onClose={() => {
              console.log("LOG: [CreateProjectModal] - onClose triggered. Setting isCreateProjectModalOpen to false.");
              setIsCreateProjectModalOpen(false);
            }}
            currentWorkspaceId={workspaceData.id}
            onProjectCreated={handleProjectCreated}
          />
          <InviteMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => {
              console.log("LOG: [InviteMembersModal] - onClose triggered. Setting isInviteModalOpen to false.");
              setIsInviteModalOpen(false);
            }}
            workspaceId={workspaceData.id}
          />
        </>
      )}

      {/* Delete Project Confirmation Modal */}
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

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !removeMemberLoading && setMemberToRemove(null)}
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
                disabled={removeMemberLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRemoveMember}
                disabled={removeMemberLoading}
              >
                {removeMemberLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

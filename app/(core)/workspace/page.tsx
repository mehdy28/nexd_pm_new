"use client";

import { useEffect, useState } from "react";
import { useTopbar } from "@/components/layout/topbar-store";
import { Users, Settings, Plus, MoreHorizontal } from "lucide-react";
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

export default function WorkspacePage() {
  const { setConfig, setActiveKey } = useTopbar();

  const { workspaceData, loading, error, refetchWorkspaceData } = useWorkspaceData();
  const { removeWorkspaceMembers } = useMemberManagement(workspaceData?.id || "");
  
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    setConfig({
      title: workspaceData?.name ? `${workspaceData.name} Overview` : "Workspace Overview",
      tabs: [{ key: "overview", label: "Overview", icon: <Settings className="h-4 w-4" /> }],
      showShare: true,
    });
    setActiveKey("overview");
  }, [workspaceData, setConfig, setActiveKey]);

  if (loading) {
    return <LoadingPlaceholder message="Loading workspace data..." />;
  }

  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetchWorkspaceData} />;
  }

  const handleRemoveMember = async (memberId: string) => {
    if (confirm("Are you sure you want to remove this member from the workspace? This action cannot be undone.")) {
      try {
        await removeWorkspaceMembers([memberId]);
      } catch (err) {
        console.error("Failed to remove member:", err);
      }
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
            <Button className="shadow-soft hover:shadow-medium transition-all duration-200" onClick={() => setIsCreateProjectModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaceData.projects.map(project => (
              <Card key={project.id} className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 cursor-pointer group">
                <Link href={`/project/${project.id}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full bg-indigo-500 shadow-sm`} />
                        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">{project.name}</CardTitle>
                      </div>
                       <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
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
                        <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${project.totalTaskCount > 0 ? (project.completedTaskCount / project.totalTaskCount) * 100 : 0}%` }}/>
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
            <Button variant="outline" className="shadow-soft hover:shadow-medium transition-all duration-200 bg-transparent" onClick={() => setIsInviteModalOpen(true)}>
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
                        <AvatarImage src={member.user.avatar || `https://ui-avatars.com/api/?name=${member.user.firstName}+${member.user.lastName}&background=random`} alt={`${member.user.firstName || ""} ${member.user.lastName || ""}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{`${member.user.firstName?.[0] || ""}${member.user.lastName?.[0] || ""}` || "?"}</AvatarFallback>
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
                                <DropdownMenuItem onClick={() => handleRemoveMember(member.id)} className="text-destructive focus:text-destructive">
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
            onClose={() => setIsCreateProjectModalOpen(false)}
            currentWorkspaceId={workspaceData.id}
            onProjectCreated={handleProjectCreated}
          />
          <InviteMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            workspaceId={workspaceData.id}
          />
        </>
      )}
    </>
  );
}
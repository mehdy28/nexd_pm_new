// app/(core)/workspace/page.tsx
"use client";

import { useEffect, useState } from "react"; // Added useState
import { useTopbar } from "@/components/layout/topbar-store";
import { Users, Settings, Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import CreateProjectModal from "@/components/project/create-project-modal"; // Import the modal component

export default function WorkspacePage() {
  const { setConfig, setActiveKey } = useTopbar();

  const { workspaceData, loading, error, refetchWorkspaceData } = useWorkspaceData(); // Added refetch
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // State for modal

  useEffect(() => {
    setConfig({
      title: workspaceData?.name ? `${workspaceData.name} Overview` : "Workspace Overview",
      tabs: [{ key: "overview", label: "Overview", icon: <Settings className="h-4 w-4" /> }],
      showShare: true,
    });
    setActiveKey("overview");
  }, [workspaceData, setConfig, setActiveKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading workspace data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading workspace data: {error.message}</p>
      </div>
    );
  }

  if (!workspaceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Workspace Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          It looks like you haven't set up a workspace yet. Let's get you started!
        </p>
        <Link href="/setup" passHref>
          <Button className="shadow-soft hover:shadow-medium transition-all duration-200">
            Create Your First Workspace
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-100 text-blue-800";
      case "PLANNING":
        return "bg-yellow-100 text-yellow-800";
      case "ON_HOLD":
        return "bg-orange-100 text-orange-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Callback function after a project is successfully created
  const handleProjectCreated = (projectId: string) => {
    console.log(`New project created with ID: ${projectId}. Refetching workspace data...`);
    // refetchWorkspaceData(); // This will re-run GET_WORKSPACE_DATA_QUERY
    // useMutation's refetchQueries takes care of this
  };


  return (
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
          {workspaceData.industry && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-0">
              Industry: {workspaceData.industry}
            </Badge>
          )}
          {workspaceData.teamSize && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-0">
              Team Size: {workspaceData.teamSize}
            </Badge>
          )}
          {workspaceData.workFields && workspaceData.workFields.map((field, index) => (
            <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-800 border-0">
              {field}
            </Badge>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-foreground">Projects</h3>
          <Button
            className="shadow-soft hover:shadow-medium transition-all duration-200"
            onClick={() => setIsCreateModalOpen(true)} // Open modal
          >
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
                      {/* Project color needs to be fetched from API or defined. Using placeholder for now */}
                      <div className={`w-4 h-4 rounded-full bg-indigo-500 shadow-sm`} />
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
                      {project.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground font-medium">{project.projectMemberCount} members</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-semibold text-foreground">
                        {project.completedTaskCount}/{project.totalTaskCount}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.totalTaskCount > 0 ? (project.completedTaskCount / project.totalTaskCount) * 100 : 0}%` }}
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
          {workspaceData.members.map((member) => (
            <Card
              key={member.user.id}
              className="shadow-soft hover:shadow-medium hover:scale-[1.02] transition-all duration-200 group"
            >
              <CardContent className="p-5">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 shadow-sm">
                      <AvatarImage src={member.user.firstName ? `https://ui-avatars.com/api/?name=${member.user.firstName}+${member.user.lastName}&background=random` : "/placeholder.svg"} alt={`${member.user.firstName || ""} ${member.user.lastName || ""}`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {`${(member.user.firstName?.[0] || '')}${(member.user.lastName?.[0] || '')}` || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {`${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{member.role.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Project Modal */}
      {workspaceData.id && ( // Only render if workspaceData.id is available
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          currentWorkspaceId={workspaceData.id} // Pass the fetched workspace ID
          onProjectCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMembersModal({ isOpen, onClose }: InviteMembersModalProps) {
  const invitedUsers = [
    { email: "user1@example.com", workspaceRole: "Member", projectRole: "Editor", project: "Project Alpha" },
    { email: "user2@example.com", workspaceRole: "Admin", projectRole: "Viewer", project: "Project Beta" },
    { email: "user3@example.com", workspaceRole: "Member", projectRole: "Manager", project: "Project Gamma" },
    { email: "user4@example.com", workspaceRole: "Viewer", projectRole: "Viewer", project: "Project Alpha" },
    { email: "user5@example.com", workspaceRole: "Admin", projectRole: "Editor", project: "Project Beta" },
    { email: "user6@example.com", workspaceRole: "Member", projectRole: "Viewer", project: "Project Gamma" },
    { email: "user7@example.com", workspaceRole: "Viewer", projectRole: "Manager", project: "Project Alpha" },
    { email: "user8@example.com", workspaceRole: "Admin", projectRole: "Viewer", project: "Project Beta" },
    { email: "user9@example.com", workspaceRole: "Member", projectRole: "Editor", project: "Project Gamma" },
    { email: "user10@example.com", workspaceRole: "Viewer", projectRole: "Manager", project: "Project Alpha" },
  ];

  const projects = ["Project A", "Project B", "Project C"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="bg-card text-foreground p-6 rounded-lg shadow-lg w-[900px] h-[550px] max-w-none flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground mb-4">
            Invite Members
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="invite" className="flex flex-col flex-1 overflow-hidden">
          {/* Sticky Tabs */}
          <div className="sticky top-0 z-10 bg-card pb-2">
            <TabsList className="flex justify-start w-full h-10">
              <TabsTrigger value="invite">Invite Member</TabsTrigger>
              <TabsTrigger value="invited">Invited Members</TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Invite Tab */}
            <TabsContent value="invite" className="flex-1 overflow-y-auto px-0 py-0">
              <div className="grid gap-4 w-full h-full">
                {/* Email */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-left text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    className="col-span-3 border-border bg-background w-full"
                    placeholder="Enter user email"
                  />
                </div>

                {/* Workspace Role */}
                <div className="grid grid-cols-4 items-center gap-4 w-full">
                  <Label htmlFor="workspace-role" className="text-left text-foreground">
                    Workspace Role
                  </Label>
                  <Select className="col-span-3 w-full">
                    <SelectTrigger 
                      id="workspace-role"
                      className="border-border bg-background w-full"
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Project */}
                <div className="grid grid-cols-4 items-center gap-4 w-full">
                  <Label htmlFor="project" className="text-left text-foreground">
                    Project
                  </Label>
                  <Select className="col-span-3 w-full">
                    <SelectTrigger 
                      id="project"
                      className="border-border bg-background w-full"
                    >
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p, i) => (
                        <SelectItem key={i} value={p.toLowerCase()}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Role */}
                <div className="grid grid-cols-4 items-center gap-4 w-full">
                  <Label htmlFor="project-role" className="text-left text-foreground">
                    Project Role
                  </Label>
                  <Select className="col-span-3 w-full">
                    <SelectTrigger 
                      id="project-role"
                      className="border-border bg-background w-full"
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Invited Tab */}
            <TabsContent value="invited" className="flex-1 overflow-y-auto px-4 py-0">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-card z-10 pb-2 border-b border-border ">
                <div className="grid grid-cols-4 gap-4 font-semibold text-foreground text-right">
                <span>Email</span>
                <span>Workspace Role</span>
                <span>Project Role</span>
                <span>Project</span>
                </div>
              </div>
              {invitedUsers.length === 0 ? (
                // TODO: Center this text
                <p className="text-muted-foreground">No users invited yet.</p>
              ) : (
                <ul className="space-y-2">
                  {invitedUsers.map((user, index) => (
                    <li
                      key={index} // Use a more stable key if available, like a user ID
                      className="grid grid-cols-4 gap-4 text-sm text-foreground border-b border-border pb-2"
                      style={{ textAlign: 'right' }} // Apply text-align right directly for specificity
                    >
                      <span className="pr-2">{user.email}</span> {/* Add some right padding */}
                      <span className="pr-2 text-muted-foreground"> {/* Add padding to other spans */}
                        {user.workspaceRole}
                      </span>
                      <span className="pr-2 text-muted-foreground"> {/* Add padding */}
                        {user.projectRole}
                      </span>
                       <span className="text-muted-foreground">
                         {user.project}
                      </span>
                    </li>
                  ))}
                  {/* Add more empty list items to ensure consistent height if needed */}
                  {Array.from({ length: Math.max(0, 10 - invitedUsers.length) }).map((_, index) => <li key={`empty-${index}`} className="h-[28px]"></li>)}
                </ul>
              )}
            </TabsContent>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="bg-[#4ab5ae] text-white hover:bg-[#3a9d96] transition-colors duration-200">
              Send Invitation
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

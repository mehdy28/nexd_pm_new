
// components/project/assign-project-members-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemberManagement } from "@/hooks/useMemberManagement";
import { ProjectRole } from "@/types/workspace";
import { Loader2 } from "lucide-react";

interface AssignProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
}

type SelectedMember = {
  userId: string;
  role: ProjectRole;
};

export function AssignProjectMembersModal({ isOpen, onClose, workspaceId, projectId }: AssignProjectMembersModalProps) {
  const { assignableMembers, loading, addProjectMembers, addProjectMembersLoading } = useMemberManagement(workspaceId, projectId);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers([]);
    }
  }, [isOpen]);

  const handleSelectMember = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers(prev => [...prev, { userId, role: ProjectRole.MEMBER }]);
    } else {
      setSelectedMembers(prev => prev.filter(member => member.userId !== userId));
    }
  };

  const handleRoleChange = (userId: string, role: ProjectRole) => {
    setSelectedMembers(prev => prev.map(member => (member.userId === userId ? { ...member, role } : member)));
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await addProjectMembers(selectedMembers);
      onClose();
    } catch (error) {
      console.error("[Modal] Failed to add project members:", error);
    }
  };
  
  const isSelected = (userId: string) => selectedMembers.some(m => m.userId === userId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-foreground p-6 rounded-lg shadow-lg max-w-lg flex flex-col h-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">Assign Members to Project</DialogTitle>
          <DialogDescription>Select members from the workspace to add to this project and assign them a role.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow min-h-0 my-4">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {assignableMembers.length === 0 && (
                       <p className="text-center text-sm text-muted-foreground py-8">No assignable members found in this workspace.</p>
                    )}
                    {assignableMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-4">
                        <Checkbox
                          id={`member-${member.user.id}`}
                          onCheckedChange={(checked) => handleSelectMember(member.user.id, !!checked)}
                          checked={isSelected(member.user.id)}
                        />
                        <Label htmlFor={`member-${member.user.id}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                           <Avatar className="h-8 w-8">
                              <AvatarImage src={member.user.avatar || undefined} />
                              <AvatarFallback 
                                className="text-white text-xs"
                                style={{ backgroundColor: (member.user as any).avatarColor || "#6366f1" }}
                              >
                                {`${member.user.firstName?.[0] || ''}${member.user.lastName?.[0] || ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium">{`${member.user.firstName || ''} ${member.user.lastName || ''}`.trim()}</p>
                                <p className="text-xs text-muted-foreground">{member.user.email}</p>
                            </div>
                        </Label>
                        <Select
                          disabled={!isSelected(member.user.id)}
                          onValueChange={(role) => handleRoleChange(member.user.id, role as ProjectRole)}
                          defaultValue={ProjectRole.MEMBER}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ProjectRole).map(role => (
                               <SelectItem key={role} value={role}>{role.charAt(0) + role.slice(1).toLowerCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
            )}
        </div>

        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={onClose} disabled={addProjectMembersLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addProjectMembersLoading || selectedMembers.length === 0}>
            {addProjectMembersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Members
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
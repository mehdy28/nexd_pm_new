// components/project/assign-project-members-modal.tsx
"use client";

import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import { Button } from "@/components/ui/button";
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
  }, [isOpen, workspaceId, projectId]);

  useEffect(() => {
  }, [assignableMembers, loading]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers([]);
    }
  }, [isOpen]);

  const handleSelectMember = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers(prev => {
        const newState = [...prev, { userId, role: ProjectRole.MEMBER }];
        return newState;
      });
    } else {
      setSelectedMembers(prev => {
        const newState = prev.filter(member => member.userId !== userId);
        return newState;
      });
    }
  };

  const handleRoleChange = (userId: string, role: ProjectRole) => {
    setSelectedMembers(prev => {
      const newState = prev.map(member => (member.userId === userId ? { ...member, role } : member));
      return newState;
    });
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

  if (!isOpen) {
    return null;
  }

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={onClose}
    >
      <div 
        className="bg-card text-foreground p-6 rounded-lg shadow-lg max-w-2xl w-full flex flex-col h-[550px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pb-4">
          <h2 className="text-2xl font-semibold text-foreground">Assign Members to Project</h2>
          <p className="text-sm text-muted-foreground">Select members from the workspace to add to this project and assign them a role.</p>
        </div>
        
        <div className="flex-grow min-h-0 overflow-y-auto pr-4">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                  {assignableMembers.length === 0 && (
                     <p className="text-center text-sm text-muted-foreground py-8">No assignable members found in this workspace.</p>
                  )}
                  {assignableMembers.map((member: { id: Key | null | undefined; user: { id: string; avatar: any; firstName: any[]; lastName: any[]; email: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; }) => (
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
                              style={{ backgroundColor: (member.user as any).avatarColor   }}
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
                          <div className="max-h-48 overflow-y-auto">
                            {Object.values(ProjectRole).map(role => (
                               <SelectItem key={role} value={role}>{role.charAt(0) + role.slice(1).toLowerCase()}</SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
            )}
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-auto">
          <Button variant="outline" onClick={onClose} disabled={addProjectMembersLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addProjectMembersLoading || selectedMembers.length === 0}>
            {addProjectMembersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Members
          </Button>
        </div>
      </div>
    </div>
  );
}
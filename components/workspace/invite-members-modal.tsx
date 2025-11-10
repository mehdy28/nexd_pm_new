"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useMemberManagement } from "@/hooks/useMemberManagement";
import { WorkspaceRole } from "@/types/workspace";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

type PendingInvitation = {
  email: string;
  role: WorkspaceRole;
};

export function InviteMembersModal({ isOpen, onClose, workspaceId }: InviteMembersModalProps) {
  const { invitations, loading, inviteMembers, inviteLoading, revokeInvitation, revokeLoading } = useMemberManagement(workspaceId);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentRole, setCurrentRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);
  const [error, setError] = useState("");

  const handleAddPendingInvite = () => {
    setError("");
    if (!currentEmail || !/^\S+@\S+\.\S+$/.test(currentEmail)) {
      setError("Please enter a valid email.");
      return;
    }
    if (pendingInvites.some(p => p.email === currentEmail) || invitations.some(i => i.email === currentEmail)) {
      setError("This email has already been invited.");
      return;
    }
    setPendingInvites(prev => [...prev, { email: currentEmail, role: currentRole }]);
    setCurrentEmail("");
  };

  const handleRemovePendingInvite = (email: string) => {
    setPendingInvites(prev => prev.filter(p => p.email !== email));
  };
  
  const handleSendInvitations = async () => {
    if (pendingInvites.length === 0) return;
    try {
      await inviteMembers(pendingInvites);
      setPendingInvites([]);
      onClose();
    } catch (e) {
      console.error("Failed to send invitations", e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-foreground p-6 rounded-lg shadow-lg w-[800px] h-[550px] max-w-none flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">Invite Members</DialogTitle>
          <DialogDescription>Add members to your workspace. You can add multiple emails before sending the invitations.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="flex-grow flex flex-col mt-2 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite New Members</TabsTrigger>
            <TabsTrigger value="invited">Pending Invitations ({invitations.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite" className="flex-grow mt-4 overflow-hidden">
            {/* FIX: This wrapper div ensures the tab's content manages its own layout correctly */}
            <div className="flex flex-col h-full">
              <div className="space-y-4 shrink-0">
                <div className="flex items-end gap-2">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      value={currentEmail}
                      onChange={e => setCurrentEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="workspace-role">Role</Label>
                    <Select value={currentRole} onValueChange={(value: WorkspaceRole) => setCurrentRole(value)}>
                      <SelectTrigger id="workspace-role" className="w-[120px]">
                        <SelectValue placeholder="Select role" />
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
                  <Button variant="outline" size="icon" onClick={handleAddPendingInvite}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>

              <div className="mt-4 border-t pt-4 flex-grow flex flex-col min-h-0 overflow-hidden">
                <h4 className="text-sm font-medium mb-2 shrink-0">To be invited ({pendingInvites.length})</h4>
                <div className="flex-grow overflow-y-auto pr-2">
                  {pendingInvites.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-muted-foreground text-center">
                        Add emails above to create a batch invitation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingInvites.map(invite => (
                        <div
                          key={invite.email}
                          className="flex items-center justify-between bg-muted p-2 rounded-md"
                        >
                          <div>
                            <p className="text-sm font-medium">{invite.email}</p>
                            <p className="text-xs text-muted-foreground">{invite.role}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemovePendingInvite(invite.email)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={inviteLoading}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvitations} disabled={pendingInvites.length === 0 || inviteLoading}>
                  {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitations
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invited" className="flex-grow mt-4 overflow-hidden">
             {/* FIX: This wrapper div ensures the tab's content manages its own layout correctly */}
            <div className="flex flex-col h-full">
              {loading ? <div className="flex items-center justify-center flex-grow"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                invitations.length === 0 ? 
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">No pending invitations.</p>
                </div> :
                (
                  <div className="space-y-2 overflow-y-auto flex-grow pr-2">
                      {invitations.map(invite => (
                          <div key={invite.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                              <div>
                                  <p className="font-medium text-sm">{invite.email}</p>
                                  <div className="text-xs text-muted-foreground">
                                      Role: {invite.role} · Status: <Badge variant="outline">{invite.status}</Badge>
                                  </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => revokeInvitation(invite.id)} disabled={revokeLoading}>
                                  <Trash2 className="h-4 w-4"/>
                              </Button>
                          </div>
                      ))}
                  </div>
                )
              }
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Plus, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CommunicationItem, WorkspaceMember } from "@/hooks/useMessaging";
import { useUser } from "@/hooks/useUser";

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

interface GroupChatCreationProps {
  workspaceId: string;
  members: WorkspaceMember[];
  onBack: () => void;
  onChatCreated: (item: CommunicationItem) => void;
  createGroupConversation: (variables: { variables: { workspaceId: string; name: string; participantIds: string[] } }) => Promise<any>;
}

export function GroupChatCreation({ workspaceId, members, onBack, onChatCreated, createGroupConversation }: GroupChatCreationProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser } = useUser();

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && selectedMembers.length > 0) {
      const res = await createGroupConversation({
        variables: { workspaceId, name: groupName, participantIds: selectedMembers }
      });
      if (res.data?.createGroupConversation) {
        onChatCreated({
          id: res.data.createGroupConversation.id,
          type: "conversation",
          title: groupName,
        } as CommunicationItem);
      }
    }
  };

  const filteredUsers = members.filter(member => {
    if (member.user.id === currentUser?.id) return false; // Exclude self
    const fullName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const selectedUsers = members.filter(member => selectedMembers.includes(member.user.id));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Start New Group Chat</CardTitle>
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-6 min-h-0">
        <form onSubmit={handleCreateGroup} className="flex flex-col h-full space-y-4">
            <div className="flex-shrink-0 space-y-2">
                <label className="text-sm font-medium">Group Name</label>
                <div className="flex items-center space-x-2 border rounded-md p-2">
                    <Input placeholder="e.g., Q4 Launch Coordination" value={groupName} onChange={(e) => setGroupName(e.target.value)} required className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0" />
                </div>
            </div>
            <div className="flex flex-col flex-grow min-h-0 space-y-3">
                <div className="flex justify-between items-center flex-shrink-0">
                    <h4 className="text-sm font-medium">Add Members ({selectedMembers.length})</h4>
                    <div className="text-xs text-muted-foreground truncate max-w-[50%]">
                        Selected: {selectedUsers.map(m => m.user.firstName).join(', ')}
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2 border rounded-md p-2">
                    <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0" />
                </div>
                <div className="flex-grow min-h-0 border rounded-md overflow-y-auto">
                    <div className="p-2 space-y-1">
                        {filteredUsers.map(member => {
                            const isSelected = selectedMembers.includes(member.user.id);
                            const fullName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim();
                            return (
                                <div key={member.id} className={cn("p-2 rounded-md cursor-pointer flex items-center justify-between transition-colors", isSelected ? "bg-[hsl(174,75%,40%)]/20" : "hover:bg-gray-100")} onClick={() => toggleMember(member.user.id)}>
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={member.user.avatar || undefined} alt={fullName} />
                                          <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="text-sm font-medium">{fullName}</h4>
                                            <p className="text-xs text-muted-foreground capitalize">{member.role.toLowerCase()}</p>
                                        </div>
                                    </div>
                                    {isSelected ? <Check className="w-4 h-4 text-[hsl(174,75%,40%)]" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <Button type="submit" disabled={!groupName.trim() || selectedMembers.length === 0} className="w-full flex-shrink-0 text-white bg-[hsl(174,75%,40%)] hover:bg-[hsl(174,75%,35%)]">
                <Send className="w-4 h-4 mr-2" /> Create Group Chat
            </Button>
        </form>
      </CardContent>
    </Card>
  );
}
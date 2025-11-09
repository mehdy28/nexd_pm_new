//components/messaging/direct-chat-creation.tsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CommunicationItem, WorkspaceMember } from "@/hooks/useMessaging";
import { useUser } from "@/hooks/useUser";



const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

interface DirectChatCreationProps {
  workspaceId: string;
  members: WorkspaceMember[];
  onBack: () => void;
  onChatSelected: (item: CommunicationItem) => void;
  createDirectConversation: (variables: { variables: { workspaceId: string; participantId: string } }) => Promise<any>;
}

export function DirectChatCreation({ workspaceId, members, onBack, onChatSelected, createDirectConversation }: DirectChatCreationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser } = useUser();

  const filteredUsers = members.filter(member => {
      if (member.user.id === currentUser?.id) return false; // Exclude self
      const fullName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.toLowerCase();
      const email = member.user.email.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const handleUserSelect = async (member: WorkspaceMember) => {
    const res = await createDirectConversation({
        variables: { workspaceId, participantId: member.user.id }
    });

    if (res.data?.createDirectConversation) {
        onChatSelected({
            id: res.data.createDirectConversation.id,
            type: "conversation",
            title: `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim(),
        } as CommunicationItem);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Start New Direct Chat</CardTitle>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="p-4 flex-shrink-0">
            <div className="flex items-center space-x-2 border rounded-md p-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0" />
            </div>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-4">
            {filteredUsers.length > 0 ? (
                filteredUsers.map(member => {
                    const fullName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim();
                    return (
                    <div key={member.id} className="p-3 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center justify-between" onClick={() => handleUserSelect(member)}>
                        <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={member.user.avatar || undefined} alt={fullName} />
                                <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="text-sm font-medium">{fullName}</h4>
                                <p className="text-xs text-muted-foreground capitalize">{member.role.toLowerCase()}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2 text-[hsl(174,70%,54%)]" /> Chat
                        </Button>
                    </div>
                )})
            ) : (
                <div className="p-4 text-center text-muted-foreground">No users found.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
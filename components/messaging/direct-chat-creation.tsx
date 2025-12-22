"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, MessageSquare, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CommunicationItem, WorkspaceMember } from "@/hooks/useMessaging";
import { useUser } from "@/hooks/useUser";



const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

interface DirectChatCreationProps {
  workspaceId: string;
  members: WorkspaceMember[];
  communicationList: CommunicationItem[];
  onBack: () => void;
  onChatSelected: (item: CommunicationItem) => void;
  createDirectConversation: (variables: { variables: { workspaceId: string; participantId: string } }) => Promise<any>;
}

export function DirectChatCreation({ workspaceId, members, communicationList, onBack, onChatSelected, createDirectConversation }: DirectChatCreationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser } = useUser();
  const [creatingForUserId, setCreatingForUserId] = useState<string | null>(null);

  const filteredUsers = members.filter(member => {
      if (member.user.id === currentUser?.id) return false; // Exclude self
      
      // Constraint: Check if direct conversation already exists
      const hasExistingChat = communicationList.some(item => 
        item.type === 'conversation' && 
        item.conversationType === 'DIRECT' && 
        item.participants?.some(p => p.id === member.user.id)
      );
      if (hasExistingChat) return false;

      const fullName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.toLowerCase();
      const email = member.user.email.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const handleUserSelect = async (member: WorkspaceMember) => {
    if (creatingForUserId) return; // Prevent new clicks while a creation is in progress

    setCreatingForUserId(member.user.id);
    try {
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
    } catch (error) {
      console.error("Failed to create direct conversation:", error);
    } finally {
      setCreatingForUserId(null); // Re-enable buttons
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
                    const isCreating = creatingForUserId === member.user.id;
                    return (
                    <div 
                        key={member.id} 
                        className={`p-3 rounded-lg flex items-center justify-between transition-opacity ${isCreating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}`} 
                        onClick={() => !isCreating && handleUserSelect(member)}
                    >
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
                        <Button variant="ghost" size="sm" disabled={isCreating}>
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <MessageSquare className="w-4 h-4 mr-2 text-[hsl(174,75%,40%)]" />
                            )}
                            {isCreating ? 'Starting...' : 'Chat'}
                        </Button>
                    </div>
                )})
            ) : (
                <div className="p-4 text-center text-muted-foreground">
                    {members.length > 1 ? "No new users available or matching search." : "No users found."}
                </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
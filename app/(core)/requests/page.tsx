// app/(core)/requests/page.tsx
"use client";

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ArrowUpCircle,
  MoreHorizontal,
  Plus
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_TICKETS } from '@/lib/mock-data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Helper for status styling
const getStatusIcon = (status: string) => {
  switch(status) {
    case 'OPEN': return <Circle className="w-4 h-4 text-gray-400" />;
    case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-blue-500" />;
    case 'RESOLVED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    default: return <Circle className="w-4 h-4" />;
  }
};

const getPriorityBadge = (priority: string) => {
    switch(priority) {
        case 'HIGH': return <Badge variant="destructive" className="text-[10px]">High</Badge>;
        case 'MEDIUM': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-[10px]">Medium</Badge>;
        case 'LOW': return <Badge variant="outline" className="text-gray-500 text-[10px]">Low</Badge>;
    }
}

const RequestBacklogPage = () => {
  const [requests, setRequests] = useState(MOCK_TICKETS);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredRequests = statusFilter === "ALL" 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-white min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Backlog</h1>
          <p className="text-muted-foreground">Manage client requests and bug reports.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Manual Request
        </Button>
      </div>

      <div className="flex items-center space-x-4 border-b pb-4">
        <div className="flex p-1 bg-gray-100 rounded-lg">
           {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((tab) => (
             <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                    statusFilter === tab ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
             >
                {tab === 'ALL' ? 'All Requests' : tab.replace('_', ' ')}
             </button>
           ))}
        </div>
      </div>

      <Card className="border-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((req) => (
              <TableRow key={req.id} className="hover:bg-gray-50 cursor-pointer">
                <TableCell className="font-mono text-xs text-muted-foreground">#{req.id}</TableCell>
                <TableCell className="font-medium">
                    {req.subject}
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{req.lastMessage}</div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback style={{backgroundColor: req.creator.avatarColor}} className="text-[10px] text-white">
                                {req.creator.firstName[0]}{req.creator.lastName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{req.creator.firstName} {req.creator.lastName}</span>
                        {req.creator.role === 'GUEST' && <Badge variant="outline" className="text-[9px] h-4 px-1">Client</Badge>}
                    </div>
                </TableCell>
                <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {getStatusIcon(req.status)}
                        <span className="text-sm capitalize">{req.status.replace('_', ' ').toLowerCase()}</span>
                    </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                    {new Date(req.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default RequestBacklogPage;
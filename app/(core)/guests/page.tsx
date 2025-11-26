// app/(core)/guests/page.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Mail, 
  MoreVertical, 
  UserPlus, 
  Trash2, 
  Search,
  ShieldAlert
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_PROJECTS } from '@/lib/mock-data';

const GuestManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = useMemo(() => {
    return MOCK_PROJECTS.map(project => {
      const guests = project.members.filter(m => {
        const matchesRole = m.role === 'GUEST';
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          m.firstName.toLowerCase().includes(searchLower) || 
          m.lastName.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower);
        
        return matchesRole && matchesSearch;
      });

      return {
        ...project,
        guests
      };
    }).filter(p => p.guests.length > 0 || searchTerm === "");
  }, [searchTerm]);

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guest Management</h1>
          <p className="text-muted-foreground">Manage client access and project visibility.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="w-4 h-4 mr-2" /> Invite Guest
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests by name or email..."
          className="pl-9 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                <Badge variant="outline" className="bg-white">
                  {project.guests.length} Guests
                </Badge>
              </div>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {project.guests.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No guests assigned to this project.
                </div>
              ) : (
                project.guests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={guest.avatar} />
                        <AvatarFallback style={{ backgroundColor: guest.avatarColor }} className="text-white text-xs">
                          {guest.firstName[0]}{guest.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{guest.firstName} {guest.lastName}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                          <Mail className="w-3 h-3 mr-1" /> {guest.email}
                        </p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" /> Remove Access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </CardContent>
            {project.guests.length > 0 && (
                 <div className="p-4 bg-gray-50/30 border-t flex justify-center">
                     <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full">
                         Manage Project Permissions
                     </Button>
                 </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GuestManagementPage;
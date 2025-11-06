"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Shield, ShieldCheck, UserX, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

const mockUsers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=32&width=32",
    role: "USER",
    status: "active",
    lastActive: "2 hours ago",
    workspaces: 3,
    projects: 12,
  },
  {
    id: "2",
    name: "Sarah Wilson",
    email: "sarah@company.com",
    avatar: "/placeholder.svg?height=32&width=32",
    role: "ADMIN",
    status: "active",
    lastActive: "30 minutes ago",
    workspaces: 5,
    projects: 8,
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@startup.io",
    avatar: "/placeholder.svg?height=32&width=32",
    role: "USER",
    status: "inactive",
    lastActive: "3 days ago",
    workspaces: 1,
    projects: 4,
  },
]

const getRoleBadge = (role: string) => {
  return role === "ADMIN" ? (
    <Badge className="bg-[hsl(174,70%,54%)]">
      <ShieldCheck className="w-3 h-3 mr-1" />
      Admin
    </Badge>
  ) : (
    <Badge variant="secondary">
      <Shield className="w-3 h-3 mr-1" />
      User
    </Badge>
  )
}

const getStatusBadge = (status: string) => {
  return status === "active" ? (
    <Badge variant="outline" className="text-green-600 border-green-600">
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="text-gray-600 border-gray-600">
      Inactive
    </Badge>
  )
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-6 pt-0 space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                        selectedUser === user.id && "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20",
                      )}
                      onClick={() => setSelectedUser(user.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium truncate">{user.name}</h4>
                            <div className="flex items-center space-x-2">
                              {getRoleBadge(user.role)}
                              {getStatusBadge(user.status)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Last active: {user.lastActive}</span>
                            <span>
                              {user.workspaces} workspaces • {user.projects} projects
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedUser ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Promote to Admin
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    <Shield className="w-4 h-4 mr-2" />
                    Demote to User
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Suspend Account
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Workspaces:</span>
                    <span className="text-sm font-medium">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Projects:</span>
                    <span className="text-sm font-medium">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tasks Created:</span>
                    <span className="text-sm font-medium">89</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Documents:</span>
                    <span className="text-sm font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Wireframes:</span>
                    <span className="text-sm font-medium">15</span>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-[300px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">Select a User</h3>
                <p>Choose a user from the list to manage their account</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>

  )
}

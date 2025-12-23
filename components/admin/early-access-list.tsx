"use client"

import { useEffect } from "react"
import { useEarlyAccess, type EarlyAccessUser } from "@/hooks/useEarlyAccess"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { UsersIcon } from "lucide-react"

function WaitlistKpi({ count }: { count?: number }) {
  if (count === undefined) return null
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Waitlist Signups
          </CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{count}</div>
          <p className="text-xs text-muted-foreground">
            Total users on the waitlist
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function EarlyAccessList() {
  const { fetchWaitlist, waitlistUsers, queryLoading, queryError } =
    useEarlyAccess()

  useEffect(() => {
    fetchWaitlist()
  }, [fetchWaitlist])

  if (queryLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-28 w-1/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">
          Error loading waitlist data: {queryError.message}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Early Access Waitlist
          </h1>
          <p className="text-gray-600">
            View and manage users who have signed up for early access.
          </p>
        </div>

        <WaitlistKpi count={waitlistUsers?.length} />

        <Card>
          <CardHeader>
            <CardTitle>Waitlist Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistUsers && waitlistUsers.length > 0 ? (
                  waitlistUsers.map((user: EarlyAccessUser) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "PPP p")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No users have signed up yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
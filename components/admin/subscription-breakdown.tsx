"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const subscriptionPlans = [
  {
    name: "Free",
    users: 1200,
    percentage: 42.2,
    revenue: "$0",
    color: "bg-gray-500",
    workspaces: 1200,
    projects: 2400,
  },
  {
    name: "Pro",
    users: 980,
    percentage: 34.4,
    revenue: "$19,600",
    color: "bg-[hsl(174,70%,54%)]",
    workspaces: 980,
    projects: 1960,
  },
  {
    name: "Team",
    users: 450,
    percentage: 15.8,
    revenue: "$22,500",
    color: "bg-[hsl(210,25%,25%)]",
    workspaces: 225,
    projects: 900,
  },
  {
    name: "Enterprise",
    users: 217,
    percentage: 7.6,
    revenue: "$21,700",
    color: "bg-blue-500",
    workspaces: 108,
    projects: 418,
  },
]

export function SubscriptionBreakdown() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Subscription Plan Breakdown</CardTitle>
          <CardDescription>Detailed analysis of subscription plans and their metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {subscriptionPlans.map((plan) => (
              <div key={plan.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${plan.color}`} />
                    <span className="font-medium">{plan.name}</span>
                    <Badge variant="secondary">{plan.users} users</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{plan.revenue}/month</div>
                    <div className="text-sm text-muted-foreground">{plan.percentage}% of total</div>
                  </div>
                </div>
                <Progress value={plan.percentage} className="h-2" />
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>Workspaces: {plan.workspaces}</div>
                  <div>Projects: {plan.projects}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
          <CardDescription>Monthly recurring revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total MRR</span>
              <span className="text-2xl font-bold text-[hsl(174,70%,54%)]">$63,800</span>
            </div>
            <div className="space-y-2">
              {subscriptionPlans
                .filter((plan) => plan.name !== "Free")
                .map((plan) => (
                  <div key={plan.name} className="flex justify-between items-center">
                    <span className="text-sm">{plan.name}</span>
                    <span className="font-medium">{plan.revenue}</span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Distribution</CardTitle>
          <CardDescription>Workspaces per subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptionPlans.map((plan) => (
              <div key={plan.name} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${plan.color}`} />
                  <span className="text-sm">{plan.name}</span>
                </div>
                <span className="font-medium">{plan.workspaces}</span>
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center font-semibold">
                <span>Total Workspaces</span>
                <span>2,513</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

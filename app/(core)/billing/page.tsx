"use client"

import { useEffect, useState } from "react"
import { useTopbar } from "@/components/layout/topbar-store"
import { CreditCard, Download, Check, Zap, Crown, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data - in real app this would come from API
const subscriptionData = {
  currentPlan: {
    name: "Pro",
    price: 29,
    billing: "monthly",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
      "Custom integrations",
    ],
    nextBilling: "2024-02-15",
  },
  usage: {
    projects: { current: 12, limit: "unlimited" },
    teamMembers: { current: 8, limit: 25 },
    storage: { current: 2.4, limit: 10, unit: "GB" },
  },
  invoices: [
    {
      id: "INV-2024-001",
      date: "2024-01-15",
      amount: 29.0,
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "INV-2023-012",
      date: "2023-12-15",
      amount: 29.0,
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "INV-2023-011",
      date: "2023-11-15",
      amount: 29.0,
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "INV-2023-010",
      date: "2023-10-15",
      amount: 29.0,
      status: "paid",
      downloadUrl: "#",
    },
  ],
}

const plans = [
  {
    name: "Starter",
    price: 0,
    billing: "monthly",
    description: "Perfect for individuals getting started",
    features: ["Up to 3 projects", "Basic analytics", "Email support", "5GB storage"],
    icon: <Zap className="h-5 w-5" />,
    popular: false,
  },
  {
    name: "Pro",
    price: 29,
    billing: "monthly",
    description: "Best for growing teams and businesses",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
      "Custom integrations",
      "10GB storage",
    ],
    icon: <Crown className="h-5 w-5" />,
    popular: true,
  },
  {
    name: "Enterprise",
    price: 99,
    billing: "monthly",
    description: "For large organizations with advanced needs",
    features: [
      "Everything in Pro",
      "Advanced security",
      "Custom branding",
      "Dedicated support",
      "SLA guarantee",
      "Unlimited storage",
    ],
    icon: <Building2 className="h-5 w-5" />,
    popular: false,
  },
]

export default function BillingPage() {
  const topbar = useTopbar()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  useEffect(() => {
    if (topbar?.setConfig && topbar?.setActiveKey) {
      topbar.setConfig({
        title: "Billing & Subscription",
        tabs: [{ key: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> }],
        showShare: false,
      })
      topbar.setActiveKey("billing")
    }
  }, [topbar.setConfig, topbar.setActiveKey])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.8) // 20% discount for yearly
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8">
        {/* Current Subscription */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Current Subscription</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    {subscriptionData.currentPlan.name} Plan
                  </CardTitle>
                  <CardDescription>
                    ${subscriptionData.currentPlan.price}/{subscriptionData.currentPlan.billing}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Next billing date</p>
                  <p className="font-medium">{formatDate(subscriptionData.currentPlan.nextBilling)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Projects</p>
                  <p className="text-2xl font-bold">
                    {subscriptionData.usage.projects.current}
                    <span className="text-sm font-normal text-slate-600">/{subscriptionData.usage.projects.limit}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Team Members</p>
                  <p className="text-2xl font-bold">
                    {subscriptionData.usage.teamMembers.current}
                    <span className="text-sm font-normal text-slate-600">
                      /{subscriptionData.usage.teamMembers.limit}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Storage Used</p>
                  <p className="text-2xl font-bold">
                    {subscriptionData.usage.storage.current}
                    <span className="text-sm font-normal text-slate-600">
                      /{subscriptionData.usage.storage.limit} {subscriptionData.usage.storage.unit}
                    </span>
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline">Manage Subscription</Button>
                <Button variant="outline">Update Payment Method</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Available Plans</h2>
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
              <Button
                variant={billingCycle === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingCycle("monthly")}
                className="h-8"
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "yearly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingCycle("yearly")}
                className="h-8"
              >
                Yearly
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                  Save 20%
                </Badge>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const price = billingCycle === "yearly" ? getYearlyPrice(plan.price) : plan.price
              const isCurrentPlan = plan.name === subscriptionData.currentPlan.name

              return (
                <Card key={plan.name} className={`relative ${plan.popular ? "ring-2 ring-emerald-600" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-emerald-600 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {plan.icon}
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${price}</span>
                        <span className="text-slate-600">/{billingCycle}</span>
                      </div>
                      {billingCycle === "yearly" && plan.price > 0 && (
                        <p className="text-sm text-slate-600">${plan.price * 12} billed annually</p>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? "Current Plan" : plan.price === 0 ? "Downgrade" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Billing History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Billing History</h2>
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Download your invoices and view payment history</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionData.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{formatDate(invoice.date)}</TableCell>
                      <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

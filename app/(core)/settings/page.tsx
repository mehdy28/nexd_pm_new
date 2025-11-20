"use client"

import { useEffect, useState } from "react"
import { useTopbar } from "@/components/layout/topbar-store"
import {
  CreditCard,
  Download,
  Check,
  Zap,
  Crown,
  Building2,
  User as UserIcon,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAccountPage } from "@/hooks/useAccountPage"
import { useMutation } from "@apollo/client"
import { Plan } from "@prisma/client"
import { UPDATE_MY_PROFILE, UPDATE_MY_NOTIFICATION_SETTINGS } from "@/graphql/mutations/userMutations"

// Mock data for invoices as this data is not in the schema yet
const mockInvoices = [
  { id: "INV-2024-001", date: "2024-01-15", amount: 29.0, status: "paid" },
  { id: "INV-2023-012", date: "2023-12-15", amount: 29.0, status: "paid" },
]

const plans = [
  { name: "FREE", icon: <Zap className="h-5 w-5" />, features: ["Up to 3 projects", "5GB storage"] },
  { name: "PRO", icon: <Crown className="h-5 w-5" />, features: ["Unlimited projects", "10GB storage per user"] },
  { name: "ENTERPRISE", icon: <Building2 className="h-5 w-5" />, features: ["Everything in Pro", "Advanced security"] },
]

// --- Helper Functions ---
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

const getPlanDetails = (planEnum: Plan) => plans.find((p) => p.name === planEnum) || plans[0]

// --- Main Component ---
export default function SettingsPage() {
  const topbar = useTopbar()
  const { user, workspace, isOwner, loading, error } = useAccountPage()

  const [activeTab, setActiveTab] = useState("profile")

  // *** THE FIX IS IN THIS useEffect HOOK'S DEPENDENCY ARRAY ***
  useEffect(() => {
    const tabs = [{ key: "profile", label: "Profile", icon: <UserIcon className="h-4 w-4" /> }]
    if (isOwner) {
      tabs.push({ key: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> })
    }

    if (topbar?.setConfig && topbar?.setActiveKey) {
      topbar.setConfig({
        title: "Account Settings",
        tabs: tabs,
        showShare: false,
      })
      topbar.setActiveKey(activeTab)
    }
  }, [topbar?.setConfig, topbar?.setActiveKey, isOwner, activeTab]) // <-- Dependency array is fixed

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error loading account data. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {isOwner && <TabsTrigger value="billing">Billing</TabsTrigger>}
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            <ProfileTab user={user} />
          </TabsContent>
          {isOwner && (
            <TabsContent value="billing" className="mt-6">
              <BillingTab workspace={workspace} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

// --- Profile Tab Component ---
function ProfileTab({ user }: { user: any }) {
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [updateProfile, { loading: profileLoading }] = useMutation(UPDATE_MY_PROFILE)
  const [updateNotifications] = useMutation(UPDATE_MY_NOTIFICATION_SETTINGS)

  const handleProfileSave = () => {
    updateProfile({ variables: { firstName, lastName } })
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    updateNotifications({ variables: { input: { [key]: value } } })
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled />
          </div>
          <Button onClick={handleProfileSave} disabled={profileLoading}>
            {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.notificationSettings &&
            Object.entries(user.notificationSettings)
              .filter(([key]) => key !== "__typename")
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </Label>
                  <Switch
                    id={key}
                    checked={value as boolean}
                    onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                  />
                </div>
              ))}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Billing Tab Component ---
function BillingTab({ workspace }: { workspace: any }) {
  const planDetails = getPlanDetails(workspace.subscription.plan)

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {planDetails.icon} {workspace.subscription.plan} Plan
              </              CardTitle>
              <CardDescription>
                Your workspace is currently on the {workspace.subscription.plan} plan.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Next billing date</p>
              <p className="font-medium">{formatDate(workspace.subscription.currentPeriodEnd)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Projects</p>
              <p className="text-2xl font-bold">{workspace.projects.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Team Members</p>
              <p className="text-2xl font-bold">{workspace.members.length}</p>
            </div>
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button variant="outline">Manage Subscription in Stripe</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Download your invoices and view payment history.</CardDescription>
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
              {mockInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Paid
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
  )
}

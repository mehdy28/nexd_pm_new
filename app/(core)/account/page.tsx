"use client";

import { useEffect, useState, useMemo } from "react";
import { useTopbar, useTopbarSetup } from "@/components/layout/topbar-store";
import { useAccountPage } from "@/hooks/useAccountPage";
// import { BillingTabContent } from "@/components/account/billing-tab-content";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { User, /*Bell, CreditCard,*/ Loader2, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_COLORS } from "@/lib/avatar-colors";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    workspace,
    // notificationSettings,
    // isOwner,
    loading,
    error,
    refetch,
    refetchUser,
    updateProfile,
    updateProfileLoading,
    // updateNotifications,
    // updateNotificationsLoading
  } = useAccountPage();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#6366f1");

  // const [notifState, setNotifState] = useState({
  //   atMention: true,
  //   taskAssigned: true,
  //   projectUpdates: true,
  //   productNews: true
  // });

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setAvatarColor(user.avatarColor || "#6366f1");
    }
    // if (notificationSettings) {
    //   setNotifState({
    //     atMention: notificationSettings.atMention,
    //     taskAssigned: notificationSettings.taskAssigned,
    //     projectUpdates: notificationSettings.projectUpdates,
    //     productNews: notificationSettings.productNews
    //   });
    // }
  }, [user/*, notificationSettings*/]);

  const tabs = useMemo(() => {
    const t = [
      { key: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
      // { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    ];
    // if (isOwner) {
    //   t.push({ key: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> });
    // }
    return t;
  }, [/*isOwner*/]);

  useTopbarSetup({
    title: "Account & Settings",
    tabs: tabs,
    activeKey: "profile",
    showShare: false,
    showSprint: false,
    showAddSection: false,
  });

  const { activeKey } = useTopbar();
  const currentKey = activeKey || "profile";

  if (loading) return <LoadingPlaceholder message="Loading account details..." />;
  if (error) return <ErrorPlaceholder error={error} onRetry={refetch} />;

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({
        variables: {
          firstName,
          lastName,
        }
      });
      await refetchUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
      console.error(err);
    }
  };

  // const handleUpdateNotifications = async (key: string, value: boolean) => {
  //   const newState = { ...notifState, [key]: value };
  //   setNotifState(newState);

  //   try {
  //     await updateNotifications({
  //       variables: {
  //         input: newState
  //       }
  //     });
  //   } catch (err) {
  //     setNotifState(notifState);
  //     toast.error("Failed to update notification settings");
  //   }
  // };

  const handleColorSelect = async (color: string) => {
    const prevColor = avatarColor;
    setAvatarColor(color);

    if (color === user?.avatarColor) return;

    try {
      await updateProfile({
        variables: {
          avatarColor: color
        }
      });
      await refetchUser();
      toast.success("Avatar color updated");
    } catch (err) {
      setAvatarColor(prevColor);
      toast.error("Failed to update avatar color");
    }
  };

  const renderContent = () => {
    if (currentKey === "profile") {
      return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your photo and personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center gap-4 min-w-[150px]">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-lg bg-muted">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback
                      className="text-white text-4xl font-bold transition-colors duration-300"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground text-center">
                    Your avatar color is visible to everyone in your workspace.
                  </p>
                </div>

                <div className="flex-1 space-y-6 w-full">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        maxLength={7}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        maxLength={7}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label>Avatar Color</Label>
                    <div className="flex flex-wrap gap-3">
                      {AVATAR_COLORS.map((color) => {
                        const isSelected = avatarColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            disabled={updateProfileLoading}
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring",
                              isSelected
                                ? "ring-2 ring-offset-2 ring-offset-background ring-black dark:ring-white scale-110 shadow-sm"
                                : "hover:scale-110 hover:shadow-sm border border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          >
                            {isSelected && (
                              <Check className="h-5 w-5 text-white drop-shadow-md" strokeWidth={3} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email address managed via authentication provider.</p>
                  </div>

                  <div className="pt-4">
                    <Button
                     onClick={handleUpdateProfile} 
                     className="bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                     disabled={updateProfileLoading}>
                      {updateProfileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-teal-600" />
                      <h3 className="text-lg font-medium">Security</h3>
                    </div>
                    <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Password</p>
                        <p className="text-xs text-muted-foreground">Update your password to keep your account secure.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                        size="sm"
                        onClick={() => router.push("/forgot-password")}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // if (currentKey === "notifications") {
    //   return (
    //     <div className="space-y-6 animate-in fade-in-50 duration-500">
    //       <Card>
    //         <CardHeader>
    //           <CardTitle>Notification Preferences</CardTitle>
    //           <CardDescription>Choose what you want to be notified about.</CardDescription>
    //         </CardHeader>
    //         <CardContent className="space-y-6">
    //           <div className="space-y-4">
    //             <div className="flex items-center justify-between space-x-2">
    //               <Label htmlFor="atMention" className="flex flex-col space-y-1">
    //                 <span>@Mentions</span>
    //                 <span className="font-normal text-sm text-muted-foreground">Notify me when I am mentioned in a comment or task.</span>
    //               </Label>
    //               <Switch
    //                 id="atMention"
    //                 checked={notifState.atMention}
    //                 onCheckedChange={(checked) => handleUpdateNotifications("atMention", checked)}
    //                 disabled={updateNotificationsLoading}
    //               />
    //             </div>
    //             <Separator />
    //             <div className="flex items-center justify-between space-x-2">
    //               <Label htmlFor="taskAssigned" className="flex flex-col space-y-1">
    //                 <span>Task Assignments</span>
    //                 <span className="font-normal text-sm text-muted-foreground">Notify me when a new task is assigned to me.</span>
    //               </Label>
    //               <Switch
    //                 id="taskAssigned"
    //                 checked={notifState.taskAssigned}
    //                 onCheckedChange={(checked) => handleUpdateNotifications("taskAssigned", checked)}
    //                 disabled={updateNotificationsLoading}
    //               />
    //             </div>
    //             <Separator />
    //             <div className="flex items-center justify-between space-x-2">
    //               <Label htmlFor="projectUpdates" className="flex flex-col space-y-1">
    //                 <span>Project Updates</span>
    //                 <span className="font-normal text-sm text-muted-foreground">Notify me about major updates in my projects.</span>
    //               </Label>
    //               <Switch
    //                 id="projectUpdates"
    //                 checked={notifState.projectUpdates}
    //                 onCheckedChange={(checked) => handleUpdateNotifications("projectUpdates", checked)}
    //                 disabled={updateNotificationsLoading}
    //               />
    //             </div>
    //             <Separator />
    //             <div className="flex items-center justify-between space-x-2">
    //               <Label htmlFor="productNews" className="flex flex-col space-y-1">
    //                 <span>Product News</span>
    //                 <span className="font-normal text-sm text-muted-foreground">Receive updates about new features and improvements.</span>
    //               </Label>
    //               <Switch
    //                 id="productNews"
    //                 checked={notifState.productNews}
    //                 onCheckedChange={(checked) => handleUpdateNotifications("productNews", checked)}
    //                 disabled={updateNotificationsLoading}
    //               />
    //             </div>
    //           </div>
    //         </CardContent>
    //       </Card>
    //     </div>
    //   );
    // }

    // if (currentKey === "billing" && isOwner) {
    //   return (
    //     <div className="space-y-6 animate-in fade-in-50 duration-500">
    //       <BillingTabContent />
    //     </div>
    //   );
    // }

    return null;
  };

  return (
    <div className="p-4 space-y-2">
      {renderContent()}
    </div>
  );
}

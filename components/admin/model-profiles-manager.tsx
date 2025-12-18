// components/admin/model-profiles-manager.tsx

"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Search,
  PlusCircle,
  Cpu,
  Save,
  Trash2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import {
  useGetModelProfiles,
  useGetModelProfile,
  useCreateModelProfile,
  useUpdateModelProfile,
  useDeleteModelProfile,
} from "@/hooks/useModelProfiles" // This is the hook file created in the previous step
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ------------------------------------------------------------------
// 1. Main Container Component (Orchestrator)
// ------------------------------------------------------------------
export function ModelProfilesManager() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { models, loading, error, refetch } = useGetModelProfiles()

  const handleSelectProfile = (id: string | null) => {
    setSelectedProfileId(id)
  }

  const handleSave = () => {
    setSelectedProfileId(null) // Deselect after saving
    refetch() // Refetch the list to show the new/updated item
  }

  const filteredProfiles = models.filter(
    (profile) =>
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.provider?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Model Profiles</h1>
        <p className="text-gray-600">Configure and manage AI model settings and instructions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 flex-1">
        {/* Left Panel: Profile List */}
        <div className="lg:col-span-1 flex flex-col h-[80vh]">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Model Profiles</CardTitle>
                  <CardDescription>Available AI models</CardDescription>
                </div>
                <Button size="sm" onClick={() => handleSelectProfile("new")}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search profiles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white border"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <ModelProfileList
                profiles={filteredProfiles}
                isLoading={loading}
                selectedProfileId={selectedProfileId}
                onSelectProfile={(id) => handleSelectProfile(id)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Profile Editor */}
        <div className="lg:col-span-3 h-[80vh]">
          <ModelProfileEditor
            key={selectedProfileId} // Re-mounts the component on selection change
            profileId={selectedProfileId}
            onSave={handleSave}
            onCancel={() => handleSelectProfile(null)}
            onDelete={handleSave} // Same as save, deselects and refetches
          />
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// 2. Profile List Component
// ------------------------------------------------------------------
interface ModelProfile {
  id: string
  name: string
  provider?: string | null
}

interface ModelProfileListProps {
  profiles: ModelProfile[]
  isLoading: boolean
  selectedProfileId: string | null
  onSelectProfile: (id: string) => void
}

function ModelProfileList({
  profiles,
  isLoading,
  selectedProfileId,
  onSelectProfile,
}: ModelProfileListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3 p-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={cn(
              "p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
              selectedProfileId === profile.id &&
                "bg-[hsl(174,70%,54%)]/10 border border-[hsl(174,70%,54%)]/20"
            )}
            onClick={() => onSelectProfile(profile.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate text-gray-900">{profile.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{profile.provider}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

// ------------------------------------------------------------------
// 3. Profile Editor Component (Create/Update Form)
// ------------------------------------------------------------------
interface ModelProfileEditorProps {
  profileId: string | null
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

function ModelProfileEditor({ profileId, onSave, onCancel, onDelete }: ModelProfileEditorProps) {
  const isCreatingNew = profileId === "new"
  const fetchProfileId = isCreatingNew ? null : profileId

  // --- Form State ---
  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [provider, setProvider] = useState("")
  const [instructions, setInstructions] = useState("")

  // --- GraphQL Hooks ---
  const { model, loading: queryLoading, error: queryError } = useGetModelProfile(fetchProfileId || "")
  const [createProfile, { loading: createLoading }] = useCreateModelProfile()
  const [updateProfile, { loading: updateLoading }] = useUpdateModelProfile()
  const [deleteProfile, { loading: deleteLoading }] = useDeleteModelProfile()

  const isLoading = createLoading || updateLoading || deleteLoading

  // --- Effects ---
  useEffect(() => {
    if (model) {
      setId(model.id)
      setName(model.name)
      setProvider(model.provider || "")
      setInstructions(model.enhancementInstructions)
    }
  }, [model])

  // --- Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isCreatingNew) {
        await createProfile({
          variables: { name, provider, enhancementInstructions: instructions },
        })
        toast.success("Model profile created successfully.")
      } else {
        await updateProfile({
          variables: { id, name, provider, enhancementInstructions: instructions },
        })
        toast.success("Model profile updated successfully.")
      }
      onSave()
    } catch (err: any) {
      toast.error(err.message || "An error occurred.")
    }
  }

  const handleDelete = async () => {
    if (!profileId || isCreatingNew) return
    try {
      await deleteProfile({ variables: { id: profileId } })
      toast.success("Model profile deleted successfully.")
      onDelete()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete profile.")
    }
  }

  // --- Render Logic ---
  if (!profileId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Cpu className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium mb-2">Select a Profile</h3>
          <p>Choose a profile from the list to edit, or create a new one.</p>
        </div>
      </Card>
    )
  }

  if (queryLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (queryError) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Could not load profile</h3>
          <p className="text-sm">{queryError.message}</p>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="h-full">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>{isCreatingNew ? "Create New Model Profile" : "Edit Model Profile"}</CardTitle>
          <CardDescription>
            {isCreatingNew
              ? "Define a new AI model with its unique ID and instructions."
              : `Editing profile for ${name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Display Name</Label>
            <Input
              id="profile-name"
              placeholder="e.g., 'OpenAI GPT-4o'"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              className="bg-white border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-provider">Provider</Label>
            <Input
              id="profile-provider"
              placeholder="e.g., 'OpenAI', 'Meta', 'Google'"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={isLoading}
              className="bg-white border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-instructions">Enhancement Instructions</Label>
            <Textarea
              id="profile-instructions"
              placeholder="System-level instructions for how the model should behave..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[200px] bg-white border"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              These instructions are applied to enhance prompts using this model.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div>
            {!isCreatingNew && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isLoading}>
                    {deleteLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the model profile
                      and may affect prompts that rely on it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isCreatingNew ? "Create Profile" : "Save Changes"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}

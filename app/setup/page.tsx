"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { WorkspacePreview } from "@/components/setup/workspace-preview"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { useSetupWorkspaceAndProject } from "@/hooks/useSetupWorkspaceAndProject"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

const templates = [
  { id: "agile", name: "Agile Development", description: "Sprint-based project management" },
  { id: "marketing", name: "Marketing Campaign", description: "Campaign planning and execution" },
  { id: "design", name: "Design System", description: "Design workflow and asset management" },
]

const views = [
  { id: "list", name: "List View", description: "Traditional task list" },
  { id: "board", name: "Board View", description: "Kanban-style boards" },
  { id: "calendar", name: "Calendar View", description: "Timeline and deadlines" },
]

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [setupData, setSetupData] = useState({
    workspaceTitle: "",
    workspaceDescription: "",
    projectName: "",
    projectDescription: "",
    preferredView: "list",
    template: "general",
  })

  const steps = [
    {
      title: "Workspace Details",
      description: "Set up your workspace and project names",
    },
    {
      title: "Choose Your View",
      description: "Select your preferred way to view tasks",
    },
    {
      title: "Pick a Template",
      description: "Choose a template that fits your workflow",
    },
  ]

  const router = useRouter()
    const { toast } = useToast()
    const { setupWorkspaceAndProject, loading } = useSetupWorkspaceAndProject()


  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    try {
      const success = await setupWorkspaceAndProject({
        workspaceName: setupData.workspaceTitle,
        workspaceDescription: setupData.workspaceDescription,
        projectName: setupData.projectName,
        projectDescription: setupData.projectDescription,
      })

      if (success) {
        localStorage.setItem("hasCompletedSetup", "true")
        localStorage.setItem("setupData", JSON.stringify(setupData))
        console.log("Setup completed:", setupData)
        router.push("/workspace")
      } else {
        throw new Error("Failed to setup workspace and project.")
      }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message,
          })
      console.error("Setup failed:", error)
    }
  }

  const canProceed = () => {
    if (currentStep === 0) {
      return setupData.workspaceTitle && setupData.projectName
    }
    return true
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div>
              <Label htmlFor="workspace">Workspace Title</Label>
              <Input
                id="workspace"
                placeholder="e.g., Acme Corp, My Team"
                value={setupData.workspaceTitle}
                onChange={(e) => setSetupData({ ...setupData, workspaceTitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="workspaceDescription">Workspace Description</Label>
              <Input
                id="workspaceDescription"
                placeholder="e.g., A collaborative workspace for..."
                value={setupData.workspaceDescription}
                onChange={(e) => setSetupData({ ...setupData, workspaceDescription: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="project">First Project Name</Label>
              <Input
                id="project"
                placeholder="e.g., Website Redesign"
                value={setupData.projectName}
                onChange={(e) => setSetupData({ ...setupData, projectName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="projectDescription">Project Description</Label>
              <Input
                id="projectDescription"
                placeholder="e.g., Redesigning the company website..."
                value={setupData.projectDescription}
                onChange={(e) => setSetupData({ ...setupData, projectDescription: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            {views.map((view) => (
              <Card
                key={view.id}
                className={`cursor-pointer transition-all ${
                  setupData.preferredView === view.id ? "ring-2 ring-emerald-500 bg-emerald-50" : "hover:bg-gray-50"
                }`}
                onClick={() => setSetupData({ ...setupData, preferredView: view.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{view.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{view.description}</p>
                    </div>
                    {setupData.preferredView === view.id && <Check className="w-5 h-5 text-emerald-600" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      case 2:
        return (
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  setupData.template === template.id ? "ring-2 ring-emerald-500 bg-emerald-50" : "hover:bg-gray-50"
                }`}
                onClick={() => setSetupData({ ...setupData, template: template.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    </div>
                    {setupData.template === template.id && <Check className="w-5 h-5 text-emerald-600" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-200 from-emerald-50 to-teal-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set up your workspace</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentStep ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${index < currentStep ? "bg-emerald-600" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{steps[currentStep].title}</h2>
                <p className="text-gray-600 text-sm">{steps[currentStep].description}</p>
              </div>

              <div className="min-h-[300px]">{renderStepContent()}</div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {currentStep === steps.length - 1 ? (
                  <Button onClick={handleFinish} className="flex items-center gap-2" disabled={!canProceed() || loading}>
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="flex items-center gap-2" disabled={!canProceed()}>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-3">
            {/* <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Live Preview</h2>
              <p className="text-gray-600 text-sm">See how your workspace will look</p>
            </div> */}

            <div className="flex items-center justify-center h-full">
              <WorkspacePreview
                workspaceTitle={setupData.workspaceTitle}
                workspaceDescription={setupData.workspaceDescription}
                projectTitle={setupData.projectName}
                projectDescription={setupData.projectDescription}
                viewType={setupData.preferredView as "list" | "board" | "calendar"}
                template={setupData.template as "blank" | "marketing" | "development" | "design"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
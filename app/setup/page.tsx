"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Building, Rocket, Users, Globe, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface StepData {
  workspaceName: string
  workspaceDescription: string
  projectName: string
  projectDescription: string
  industry: string
  teamSize: string
  workFields: string[]
  collaboration: string
  timezone: string
}

const steps = [
  {
    id: 1,
    title: "Create Workspace",
    icon: Building,
    color: "bg-teal-500",
  },
  {
    id: 2,
    title: "Create Project",
    icon: Rocket,
    color: "bg-teal-600",
  },
  {
    id: 3,
    title: "Choose Industry",
    icon: Globe,
    color: "bg-teal-700",
  },
  {
    id: 4,
    title: "Team Size",
    icon: Users,
    color: "bg-teal-700",
  },
  {
    id: 5,
    title: "Work Fields",
    icon: Settings,
    color: "bg-teal-800",
  },
  {
    id: 6,
    title: "All Set!",
    icon: CheckCircle,
    color: "bg-teal-500",
  },
]

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Marketing",
  "Retail",
  "Consulting",
  "Design",
  "Other",
]

const teamSizes = ["Just me", "2-5 people", "6-30 people",  "30+ people"]

const workFields = [
  "Business Analysis",
  "Product Management",
  "Consulting",
  "Strategy",
  "Project Management",
  "Data Analysis",
  "Process Improvement",
  "Change Management",
  "Business Development",
  "Market Research",
];

const cardVariants = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: "0%", opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
  exit: { y: "-100%", opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
}

export default function SetupFlow() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [data, setData] = useState<StepData>({
    workspaceName: "",
    workspaceDescription: "",
    projectName: "",
    projectDescription: "",
    industry: "",
    teamSize: "",
    workFields: [],
    collaboration: "",
    timezone: "",
  })

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCompletedSteps((prev) => [...prev, currentStep])
      setCurrentStep((prev) => prev + 1)
    }
  }

  const updateData = (field: keyof StepData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleWorkField = (field: string) => {
    const currentFields = data.workFields
    const newFields = currentFields.includes(field)
      ? currentFields.filter((f) => f !== field)
      : [...currentFields, field]
    updateData("workFields", newFields)
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return data.workspaceName.trim() !== "" && data.workspaceDescription.trim() !== ""
      case 2:
        return data.projectName.trim() !== "" && data.projectDescription.trim() !== ""
      case 3:
        return data.industry !== ""
      case 4:
        return data.teamSize !== ""
      case 5:
        return data.workFields.length > 0
      default:
        return true
    }
  }

  const currentStepData = steps[currentStep - 1]
  const IconComponent = currentStepData.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      <div className="w-64 bg-slate-800 p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-2">Setup Progress</h2>
          <p className="text-slate-400 text-sm">
            Step {currentStep} of {steps.length}
          </p>
        </div>
        <div className="flex-1 space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    completedSteps.includes(step.id)
                      ? "bg-teal-500"
                      : currentStep === step.id
                        ? "bg-teal-500"
                        : "bg-slate-600"
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-white text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 mt-2 ${completedSteps.includes(step.id) ? "bg-teal-500" : "bg-slate-600"}`}
                  />
                )}
              </div>
              <div className="flex-1 pb-6">
                <h3
                  className={`font-medium transition-colors ${
                    currentStep === step.id ? "text-white" : "text-slate-400"
                  }`}
                >
                  {step.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl h-full">
          <div className="relative h-screen overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={currentStep}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0 p-8"
              >
                <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm h-full flex flex-col">
                  <CardHeader className="text-center pb-8">
                    <div
                      className={`w-16 h-16 ${currentStepData.color} rounded-full flex items-center justify-center mx-auto mb-4`}
                    >
                      {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
                    </div>
                    <CardTitle className="text-2xl text-balance">{currentStepData.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 px-12 pb-12 flex-grow flex flex-col justify-between">
                    <div>
                      {currentStep === 1 && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="workspace-name" className="text-base">
                              Workspace Name
                            </Label>
                            <Input
                              id="workspace-name"
                              placeholder="e.g., Acme Corp, My Startup, Team Alpha"
                              value={data.workspaceName}
                              onChange={(e) => updateData("workspaceName", e.target.value)}
                              className="text-lg py-6"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="workspace-description" className="text-base">
                              Workspace Description
                            </Label>
                            <Textarea
                              id="workspace-description"
                              placeholder="Tell us what your workspace is about..."
                              value={data.workspaceDescription}
                              onChange={(e) => updateData("workspaceDescription", e.target.value)}
                              rows={4}
                              className="text-base"
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="project-name" className="text-base">
                              Project Name
                            </Label>
                            <Input
                              id="project-name"
                              placeholder="e.g., Website Redesign, Mobile App, Q1 Campaign"
                              value={data.projectName}
                              onChange={(e) => updateData("projectName", e.target.value)}
                              className="text-lg py-6"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="project-description" className="text-base">
                              Project Description
                            </Label>
                            <Textarea
                              id="project-description"
                              placeholder="What are you trying to accomplish with this project?"
                              value={data.projectDescription}
                              onChange={(e) => updateData("projectDescription", e.target.value)}
                              rows={4}
                              className="text-base"
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="space-y-4">
                          <Label className="text-base">Select Your Industry</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {industries.map((industry) => (
                              <Button
                                key={industry}
                                variant={data.industry === industry ? "default" : "outline"}
                                className={`p-4 h-auto text-left justify-start ${
                                  data.industry === industry
                                    ? "bg-teal-500 hover:bg-teal-600"
                                    : "hover:bg-teal-50 hover:border-teal-300"
                                }`}
                                onClick={() => updateData("industry", industry)}
                              >
                                {industry}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentStep === 4 && (
                        <div className="space-y-4">
                          <Label className="text-base">How big is your team?</Label>
                          <div className="space-y-3">
                            {teamSizes.map((size) => (
                              <Button
                                key={size}
                                variant={data.teamSize === size ? "default" : "outline"}
                                className={`w-full p-4 h-auto text-left justify-start ${
                                  data.teamSize === size
                                    ? "bg-teal-500 hover:bg-teal-600"
                                    : "hover:bg-teal-50 hover:border-teal-300"
                                }`}
                                onClick={() => updateData("teamSize", size)}
                              >
                                {size}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentStep === 5 && (
                        <div className="space-y-4">
                          <Label className="text-base">What areas do you work in?</Label>
                          <p className="text-sm text-slate-600">Select all that apply</p>
                          <div className="grid grid-cols-2 gap-2">
                            {workFields.map((field) => (
                              <Badge
                                key={field}
                                variant={data.workFields.includes(field) ? "default" : "outline"}
                                className={`cursor-pointer p-3 text-center justify-center transition-all ${
                                  data.workFields.includes(field)
                                    ? "bg-teal-500 hover:bg-teal-600"
                                    : "hover:bg-teal-50 hover:border-teal-300"
                                }`}
                                onClick={() => toggleWorkField(field)}
                              >
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentStep === 6 && (
                        <div className="text-center space-y-6">

                          <div>
                            <h3 className="text-xl font-semibold mb-2">Welcome to {data.workspaceName}!</h3>
                            <p className="text-slate-600 text-pretty">
                              Your workspace is ready. You can now start collaborating with your team on{" "}
                              {data.projectName}.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>


                    {currentStep < 6 && (
                      <Button
                        onClick={nextStep}
                        disabled={!isStepValid()}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-lg py-6 mt-8"
                      >
                        Continue
                      </Button>
                    )}

                    {currentStep === 6 && (
                      <Button className="bg-teal-500 hover:bg-teal-600 text-lg py-6 px-8 w-full">Complete Setup</Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, FileText, Users, Target, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface FormData {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  company: string
  jobTitle: string

  // Company Information
  companySize: string
  industry: string
  currentPMTools: string[]

  // Project Management Context
  teamSize: string
  projectTypes: string[]
  biggestChallenge: string

  // AI and Automation Interest
  aiExperience: string
  automationInterest: string

  // NEXD.PM Specific
  interestedFeatures: string[]
  angelInvestorPresentation: string
  betaTesting: string

  // Feedback and Insights
  additionalComments: string
  referralSource: string
}

export default function PlaybookDownloadPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    jobTitle: "",
    companySize: "",
    industry: "",
    currentPMTools: [],
    teamSize: "",
    projectTypes: [],
    biggestChallenge: "",
    aiExperience: "",
    automationInterest: "",
    interestedFeatures: [],
    angelInvestorPresentation: "",
    betaTesting: "",
    additionalComments: "",
    referralSource: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: keyof FormData, value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter((item) => item !== value),
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      console.log("Form submission data:", formData)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Trigger PDF download
      const link = document.createElement("a")
      link.href = "/prompt-optimization-playbook.pdf"
      link.download = "NEXD-PM-Prompt-Optimization-Playbook.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setIsSubmitted(true)
    } catch (error) {
      console.error("Submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    {
      id: "welcome",
      title: "Welcome! Let's get started",
      subtitle: "First, tell us a bit about yourself",
    },
    {
      id: "personal",
      title: "What's your name?",
      subtitle: "We'd love to personalize your experience",
    },
    {
      id: "contact",
      title: "How can we reach you?",
      subtitle: "We'll send your playbook and occasional updates",
    },
    {
      id: "company",
      title: "Tell us about your company",
      subtitle: "This helps us understand your context",
    },
    {
      id: "company-details",
      title: "Company size and industry",
      subtitle: "A bit more about your organization",
    },
    {
      id: "current-tools",
      title: "What tools do you currently use?",
      subtitle: "Select all project management tools you use",
    },
    {
      id: "team-context",
      title: "What's your team like?",
      subtitle: "Understanding your team dynamics",
    },
    {
      id: "project-types",
      title: "What types of projects do you manage?",
      subtitle: "Select all that apply to your work",
    },
    {
      id: "challenges",
      title: "What's your biggest challenge?",
      subtitle: "Help us understand your pain points",
    },
    {
      id: "ai-experience",
      title: "How familiar are you with AI?",
      subtitle: "This helps us tailor the content",
    },
    {
      id: "automation-interest",
      title: "How interested are you in automation?",
      subtitle: "Understanding your automation appetite",
    },
    {
      id: "nexd-features",
      title: "Which NEXD.PM features excite you?",
      subtitle: "Select all that interest you",
    },
    {
      id: "investor-presentation",
      title: "Interested in our investor story?",
      subtitle: "Would you like to see our angel investor presentation?",
    },
    {
      id: "beta-testing",
      title: "Want to be a beta tester?",
      subtitle: "Get early access to NEXD.PM",
    },
    {
      id: "additional-info",
      title: "Anything else to share?",
      subtitle: "Optional: Any specific needs or comments",
    },
    {
      id: "referral",
      title: "How did you find us?",
      subtitle: "Help us understand our reach",
    },
  ]

  const totalSteps = steps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName
      case 2:
        return formData.email && formData.company && formData.jobTitle
      case 3:
        return formData.companySize
      case 4:
        return formData.industry
      case 5:
        return formData.currentPMTools.length > 0
      case 6:
        return formData.teamSize
      case 7:
        return formData.projectTypes.length > 0
      case 8:
        return formData.biggestChallenge
      case 9:
        return formData.aiExperience
      case 10:
        return formData.automationInterest
      case 11:
        return formData.interestedFeatures.length > 0
      case 12:
        return formData.angelInvestorPresentation
      case 13:
        return formData.betaTesting
      case 15:
        return formData.referralSource
      default:
        return true
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-2xl border-0">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Download Started!</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Your Prompt Optimization Playbook should start downloading shortly. Check your downloads folder.
            </p>
            <div className="space-y-4">
              <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-lg">
                <Link href="/blog">Back to Blog</Link>
              </Button>
              <Button variant="outline" asChild className="w-full h-12 text-lg bg-transparent">
                <Link href="/">Join Waitlist</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-8">
            <div className="w-24 h-24 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Get Your Free Playbook</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                120 pages of battle-tested prompt templates and optimization strategies for project managers
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">50+ Templates</h3>
                <p className="text-sm text-gray-600">Ready-to-use prompts</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Battle-Tested</h3>
                <p className="text-sm text-gray-600">Validated by 200+ PMs</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Advanced Tips</h3>
                <p className="text-sm text-gray-600">Expert strategies</p>
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-lg font-medium text-gray-700 mb-2 block">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-lg font-medium text-gray-700 mb-2 block">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Enter your last name"
                  className="h-12 text-lg"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-lg font-medium text-gray-700 mb-2 block">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@company.com"
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="company" className="text-lg font-medium text-gray-700 mb-2 block">
                Company Name
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Your company name"
                className="h-12 text-lg"
              />
            </div>
            <div>
              <Label htmlFor="jobTitle" className="text-lg font-medium text-gray-700 mb-2 block">
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                placeholder="e.g., Senior Project Manager"
                className="h-12 text-lg"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Company Size</Label>
            <RadioGroup
              value={formData.companySize}
              onValueChange={(value) => handleInputChange("companySize", value)}
              className="space-y-4"
            >
              {[
                { value: "1-10", label: "1-10 employees", desc: "Small startup or team" },
                { value: "11-50", label: "11-50 employees", desc: "Growing company" },
                { value: "51-200", label: "51-200 employees", desc: "Mid-size company" },
                { value: "201-1000", label: "201-1000 employees", desc: "Large company" },
                { value: "1000+", label: "1000+ employees", desc: "Enterprise" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Industry</Label>
            <RadioGroup
              value={formData.industry}
              onValueChange={(value) => handleInputChange("industry", value)}
              className="space-y-4"
            >
              {[
                { value: "technology", label: "Technology", desc: "Software, hardware, IT services" },
                { value: "finance", label: "Finance", desc: "Banking, fintech, insurance" },
                { value: "healthcare", label: "Healthcare", desc: "Medical, pharma, health tech" },
                { value: "education", label: "Education", desc: "Schools, edtech, training" },
                { value: "retail", label: "Retail", desc: "E-commerce, consumer goods" },
                { value: "consulting", label: "Consulting", desc: "Professional services" },
                { value: "other", label: "Other", desc: "Something else" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Current Project Management Tools</Label>
            <p className="text-gray-600 mb-6">Select all that you currently use</p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Jira",
                "Asana",
                "Monday.com",
                "Trello",
                "Linear",
                "ClickUp",
                "Notion",
                "Microsoft Project",
                "Slack",
                "Teams",
                "Other",
              ].map((tool) => (
                <div key={tool} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                  <Checkbox
                    id={tool}
                    checked={formData.currentPMTools.includes(tool)}
                    onCheckedChange={(checked) => handleArrayChange("currentPMTools", tool, checked as boolean)}
                  />
                  <Label htmlFor={tool} className="text-lg cursor-pointer flex-1">
                    {tool}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Typical Team Size</Label>
            <RadioGroup
              value={formData.teamSize}
              onValueChange={(value) => handleInputChange("teamSize", value)}
              className="space-y-4"
            >
              {[
                { value: "1-5", label: "1-5 people", desc: "Small, agile team" },
                { value: "6-15", label: "6-15 people", desc: "Medium team" },
                { value: "16-30", label: "16-30 people", desc: "Large team" },
                { value: "31-50", label: "31-50 people", desc: "Very large team" },
                { value: "50+", label: "50+ people", desc: "Multiple teams" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Types of Projects You Manage</Label>
            <p className="text-gray-600 mb-6">Select all that apply</p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Software Development",
                "Product Launches",
                "Marketing Campaigns",
                "Infrastructure",
                "Process Improvement",
                "Research & Development",
                "Client Projects",
                "Internal Operations",
              ].map((type) => (
                <div key={type} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                  <Checkbox
                    id={type}
                    checked={formData.projectTypes.includes(type)}
                    onCheckedChange={(checked) => handleArrayChange("projectTypes", type, checked as boolean)}
                  />
                  <Label htmlFor={type} className="text-lg cursor-pointer flex-1">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-6">
            <Label htmlFor="biggestChallenge" className="text-lg font-medium text-gray-700 mb-2 block">
              What's your biggest project management challenge?
            </Label>
            <Textarea
              id="biggestChallenge"
              value={formData.biggestChallenge}
              onChange={(e) => handleInputChange("biggestChallenge", e.target.value)}
              placeholder="e.g., Timeline estimation, resource allocation, stakeholder communication, team coordination..."
              rows={6}
              className="text-lg resize-none"
              autoFocus
            />
          </div>
        )

      case 9:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Current AI Experience Level</Label>
            <RadioGroup
              value={formData.aiExperience}
              onValueChange={(value) => handleInputChange("aiExperience", value)}
              className="space-y-4"
            >
              {[
                { value: "beginner", label: "Beginner", desc: "Just getting started with AI tools" },
                { value: "intermediate", label: "Intermediate", desc: "Use AI tools regularly" },
                { value: "advanced", label: "Advanced", desc: "Create custom prompts and workflows" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 10:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">
              Interest in Project Management Automation
            </Label>
            <RadioGroup
              value={formData.automationInterest}
              onValueChange={(value) => handleInputChange("automationInterest", value)}
              className="space-y-4"
            >
              {[
                {
                  value: "very-interested",
                  label: "Very Interested",
                  desc: "Would love to automate everything possible",
                },
                { value: "somewhat-interested", label: "Somewhat Interested", desc: "For specific repetitive tasks" },
                { value: "cautious", label: "Cautious", desc: "Prefer human oversight for most decisions" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 11:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">
              Which NEXD.PM features interest you most?
            </Label>
            <p className="text-gray-600 mb-6">Select all that excite you</p>
            <div className="space-y-3">
              {[
                { value: "Visual Prompt Engineering", desc: "Design prompts visually instead of writing code" },
                { value: "AI-Powered Project Planning", desc: "Let AI help plan your projects" },
                { value: "Automated Status Updates", desc: "Never write status reports again" },
                { value: "Smart Resource Allocation", desc: "AI-optimized team assignments" },
                { value: "Predictive Analytics", desc: "Predict project outcomes and risks" },
                { value: "Team Collaboration Tools", desc: "Enhanced team communication" },
                { value: "Integration Capabilities", desc: "Connect with your existing tools" },
                { value: "Custom Workflow Builder", desc: "Build workflows that fit your process" },
              ].map((feature) => (
                <div key={feature.value} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50">
                  <Checkbox
                    id={feature.value}
                    checked={formData.interestedFeatures.includes(feature.value)}
                    onCheckedChange={(checked) =>
                      handleArrayChange("interestedFeatures", feature.value, checked as boolean)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor={feature.value} className="text-lg font-medium cursor-pointer block">
                      {feature.value}
                    </Label>
                    <p className="text-gray-500 text-sm mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 12:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Our Investor Story</h3>
              <p className="text-gray-600">
                We're building something revolutionary and would love to share our vision with forward-thinking
                professionals like you.
              </p>
            </div>
            <Label className="text-lg font-medium text-gray-700 mb-4 block">
              Would you be interested in seeing our angel investor presentation?
            </Label>
            <RadioGroup
              value={formData.angelInvestorPresentation}
              onValueChange={(value) => handleInputChange("angelInvestorPresentation", value)}
              className="space-y-4"
            >
              {[
                { value: "yes", label: "Yes, I'd love to see it!", desc: "Show me your vision and roadmap" },
                { value: "maybe", label: "Maybe, tell me more", desc: "I'm curious but want more details first" },
                { value: "no", label: "Not right now", desc: "Just here for the playbook" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 13:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Join Our Beta Program</h3>
              <p className="text-gray-600">
                Be among the first to experience the future of AI-powered project management.
              </p>
            </div>
            <Label className="text-lg font-medium text-gray-700 mb-4 block">Interest in Beta Testing NEXD.PM</Label>
            <RadioGroup
              value={formData.betaTesting}
              onValueChange={(value) => handleInputChange("betaTesting", value)}
              className="space-y-4"
            >
              {[
                { value: "very-interested", label: "Very Interested", desc: "Sign me up! I want early access" },
                { value: "interested", label: "Interested", desc: "Tell me more about the beta program" },
                { value: "not-now", label: "Not Right Now", desc: "Maybe in the future" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 14:
        return (
          <div className="space-y-6">
            <Label htmlFor="additionalComments" className="text-lg font-medium text-gray-700 mb-2 block">
              Any additional comments or specific needs?
            </Label>
            <p className="text-gray-600 mb-4">Optional: Tell us anything else that would help us serve you better</p>
            <Textarea
              id="additionalComments"
              value={formData.additionalComments}
              onChange={(e) => handleInputChange("additionalComments", e.target.value)}
              placeholder="e.g., Specific features you'd love to see, integration needs, team challenges..."
              rows={6}
              className="text-lg resize-none"
              autoFocus
            />
          </div>
        )

      case 15:
        return (
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-700 mb-4 block">How did you hear about NEXD.PM?</Label>
            <RadioGroup
              value={formData.referralSource}
              onValueChange={(value) => handleInputChange("referralSource", value)}
              className="space-y-4"
            >
              {[
                { value: "blog", label: "Blog/Content", desc: "Found us through our articles" },
                { value: "social-media", label: "Social Media", desc: "LinkedIn, Twitter, etc." },
                { value: "search", label: "Search Engine", desc: "Google, Bing search" },
                { value: "referral", label: "Friend/Colleague", desc: "Someone recommended us" },
                { value: "conference", label: "Conference/Event", desc: "Met us at an event" },
                { value: "newsletter", label: "Newsletter", desc: "Email newsletter or publication" },
                { value: "other", label: "Other", desc: "Something else" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-gray-500 text-sm">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <Link href="/blog/prompt-optimization-playbook">
                <Button variant="ghost" className="gap-2 hover:bg-gray-50">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Article
                </Button>
              </Link>
              <Link href="/" className="flex items-center">
                <Image
                  src="/nexd-logo-horizontal.png"
                  alt="NEXD.PM Logo"
                  width={160}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <div className="w-[120px]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="min-h-[600px] flex flex-col">
                {/* Step Header */}
                <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white p-8 text-center">
                  <h1 className="text-3xl font-bold mb-2">{steps[currentStep]?.title}</h1>
                  <p className="text-teal-100 text-lg">{steps[currentStep]?.subtitle}</p>
                </div>

                {/* Step Content */}
                <div className="flex-1 p-8 lg:p-12">
                  <div className="max-w-2xl mx-auto">{renderStepContent()}</div>
                </div>

                {/* Navigation */}
                <div className="border-t bg-gray-50 p-6">
                  <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <Button
                      onClick={nextStep}
                      disabled={!canProceed() || isSubmitting}
                      className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white flex items-center gap-2 px-8"
                    >
                      {isSubmitting ? (
                        "Processing..."
                      ) : currentStep === totalSteps - 1 ? (
                        <>
                          <Download className="w-4 h-4" />
                          Download Playbook
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

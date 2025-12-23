"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Palette, Settings, Zap, ArrowRight, CheckCircle, Sparkles, Brain, GitBranch, MousePointer } from "lucide-react"
import Image from "next/image"

export function HowItWorks() {
  const scrollToWaitlist = () => {
    const heroSection = document.querySelector("section")
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" })
      // Focus on the name input after scrolling
      setTimeout(() => {
        const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement
        if (nameInput) {
          nameInput.focus()
        }
      }, 500)
    }
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200 mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Revolutionary Workflow
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            How NEXD.PM Transforms Prompt Creation
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            The world's first visual prompt creation system integrated directly into project management. No more complex
            prompt engineering—just design, define, and generate.
          </p>
        </div>

        <div className="max-w-7xl mx-auto space-y-16">
          {/* Step 1: Visual Design with 3D Effect */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <MousePointer className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-teal-600 bg-teal-100 px-3 py-1 rounded-full">Step 1</span>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">Create Visual Whiteboards</h3>
                  </div>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Start by creating visual representations of your desired output using our intuitive drag-and-drop
                  interface. The AI automatically analyzes your design and generates contextual prompts.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-700">Drag-and-drop Whiteboard builder</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-700">AI analyzes your design in real-time</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-700">Automatic prompt generation from visuals</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-700">Seamless design-to-prompt workflow</span>
                  </div>
                </div>
              </div>

              {/* 3D Layered Interface - Larger and Centered */}
              <div className="relative flex items-center justify-center">
                {/* Background: Whiteboard Editor - Shifted up slightly */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden w-full max-w-2xl">
                  <Image
            	      src="/landing/6.png"
                    alt="Visual Whiteboard Editor"
                    width={1400}
                    height={900}
                    className="w-full h-auto"
                  />
                  {/* Subtle overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5"></div>
                </div>

                {/* Foreground: Floating Form Dialog - Bottom Right, shifted more to the right */}
                <div className="absolute bottom-4 right-0 lg:-right-4 w-96 lg:w-[450px] z-10">
                  <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden hover:shadow-3xl transition-shadow duration-300">
                    <Image
            	      src="/landing/6.png"
                      alt="Prompt Creation Form"
                      width={900}
                      height={600}
                      className="w-full h-auto"
                    />
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-purple-500/10"></div>
                  </div>

                  {/* Connection Line */}
                  <div className="absolute -top-2 -left-8 w-16 h-0.5 bg-gradient-to-r from-teal-400 to-purple-400 opacity-60"></div>
                  <div className="absolute -top-1 -left-2 w-2 h-2 bg-teal-400 rounded-full opacity-60"></div>
                </div>

                {/* Floating Elements for 3D Effect */}
                <div className="absolute top-8 left-4 w-3 h-3 bg-teal-400 rounded-full opacity-40 animate-pulse"></div>
                <div className="absolute bottom-12 left-8 w-2 h-2 bg-purple-400 rounded-full opacity-40 animate-pulse delay-1000"></div>
                <div className="absolute top-16 right-4 w-2 h-2 bg-cyan-400 rounded-full opacity-40 animate-pulse delay-500"></div>
              </div>
            </div>
          </div>

          {/* Step 2: Define AI Parameters */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                      Step 2
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">Define AI Parameters</h3>
                  </div>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Configure your AI settings with our intelligent form that guides you through model selection,
                  categories, and contextual descriptions for optimal results.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">Smart AI model recommendations (DALL-E, GPT, etc.)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">Automatic category suggestions based on project</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">"Enhance with AI" optimization feature</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">Context-aware prompt generation</span>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center">

                  <Image
            	    src="/landing/6-removebg-preview.png"
                    alt="AI Parameters Configuration"
                    width={1200}
                    height={900}
                    className="w-full h-auto"
                  />

              </div>
            </div>
          </div>

          {/* Step 3: Version Management - Centered */}
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl p-8 md:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <GitBranch className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                      Step 3
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">Iterate & Collaborate</h3>
                  </div>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Built-in version control tracks every iteration. Teams can collaborate, compare versions, and
                  continuously improve prompts with AI-powered suggestions.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Automatic version tracking and history</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Team collaboration and sharing features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">AI-powered improvement suggestions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Performance analytics and optimization</span>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center">

                  <Image
            	      src="/landing/5-removebg-preview.png"
                    alt="Prompt Version Management"
                    width={1300}
                    height={1000}
                    className="w-full h-auto"
                  />

              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits Summary */}
        <div className="mt-24 text-center">
          <Card className="p-8 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200 max-w-5xl mx-auto">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Visual Prompt Creation is the Future</h3>
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Palette className="w-8 h-8 text-teal-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">No Technical Expertise Required</h4>
                  <p className="text-gray-600">
                    Create professional-grade prompts through visual design—no prompt engineering knowledge needed
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">10x Faster Development</h4>
                  <p className="text-gray-600">
                    Visual interface dramatically speeds up prompt creation and iteration cycles
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI-Optimized Results</h4>
                  <p className="text-gray-600">
                    Get consistently better outputs with intelligent optimization and context awareness
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg"
                onClick={scrollToWaitlist}
              >
                Join the Visual Prompt Revolution
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

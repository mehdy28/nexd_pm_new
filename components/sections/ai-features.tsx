import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Brain, Zap, Users, Sparkles, Target, Lightbulb } from "lucide-react"

export function AIFeatures() {
  return (
    <section id="ai-prompts" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 mb-4">
            <Brain className="w-4 h-4 mr-2" />
            Revolutionary AI Integration
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            The Future of Project Management is Here
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            NEXD.PM will be the first platform to seamlessly integrate AI prompt management directly into your project
            workflow. No more switching between tools—everything you need in one place.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Context-Aware AI</h3>
              <p className="text-gray-600 mb-4">
                Our AI analyzes your project type, phase, and content to suggest perfectly relevant prompts that
                accelerate your workflow.
              </p>
              <div className="text-sm text-purple-600 font-medium">Coming in Q2 2024</div>
            </CardContent>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Prompt Library</h3>
              <p className="text-gray-600 mb-4">
                Build, version, and share AI prompts with your team. Track performance and continuously improve your
                prompt strategies.
              </p>
              <div className="text-sm text-purple-600 font-medium">Beta access available</div>
            </CardContent>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600 mb-4">
                Share successful prompts across your organization. Learn from team insights and build a knowledge base
                that grows with you.
              </p>
              <div className="text-sm text-purple-600 font-medium">Launch feature</div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Features Preview */}
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 p-4 bg-white/60 rounded-lg">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-700">Project-specific AI suggestions</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/60 rounded-lg">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-700">Creative prompt generation</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/60 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-700">Automated workflow optimization</span>
          </div>
        </div>
      </div>
    </section>
  )
}

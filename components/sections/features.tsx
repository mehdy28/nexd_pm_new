import { Card, CardContent } from "@/components/ui/card"
import { Layout, Calendar, FileText, TrendingUp, Shield, MessageSquare } from "lucide-react"

export function Features() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            Everything You Need for Modern Project Management
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            NEXD.PM combines traditional project management tools with cutting-edge AI capabilities, creating the most
            comprehensive platform for modern teams.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Layout className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Kanban Boards</h3>
              </div>
              <p className="text-gray-600">
                AI-enhanced boards that automatically organize tasks, suggest optimizations, and predict bottlenecks
                before they happen.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Intelligent Scheduling</h3>
              </div>
              <p className="text-gray-600">
                AI-powered timeline management that adapts to your team's velocity and automatically adjusts deadlines.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AI-Assisted Documentation</h3>
              </div>
              <p className="text-gray-600">
                Generate project documentation, meeting notes, and reports automatically with context-aware AI
                assistance.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Predictive Analytics</h3>
              </div>
              <p className="text-gray-600">
                Advanced insights that predict project outcomes, identify risks, and suggest improvements before issues
                arise.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Notifications</h3>
              </div>
              <p className="text-gray-600">
                AI-curated notifications that surface only what matters, reducing noise and keeping teams focused.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Enterprise Security</h3>
              </div>
              <p className="text-gray-600">
                Bank-level security with end-to-end encryption, SSO integration, and compliance with SOC 2 standards.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

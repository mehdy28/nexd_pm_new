import Image from "next/image"
import { CheckCircle2, ChevronDown } from "lucide-react"
import { WaitlistForm } from "@/components/blog/waitlist-form"

// Import the new client components
import { Navigation } from "@/components/landing/navigation"
import { ViewsSection } from "@/components/landing/views-section"
import { FadeInSection } from "@/components/landing/fade-in-section"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <Navigation />

      {/* Section 1: Hero */}
      <section className="pt-32 pb-40 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-teal-400/30 to-cyan-400/30 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <Image
                src="/landingpage/logo.png"
                alt="nexd.pm"
                width={267}
                height={80}
                className="h-20 w-auto animate-fade-in-scale"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/30 to-cyan-400/30 blur-2xl animate-pulse-glow" />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 text-slate-900 text-balance leading-[1.1] animate-fade-up">
            Where Your Project <br />
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 bg-clip-text text-transparent">
                Becomes the Prompt
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600/40 via-cyan-500/40 to-teal-600/40 blur-3xl animate-pulse-glow" />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-up animation-delay-200">
            Transform your project management into intelligent AI prompts. Seamlessly blend task orchestration with
            prompt engineering to unlock unprecedented collaboration and productivity.
          </p>
          <div className="flex justify-center animate-bounce-slow animation-delay-1000">
            <ChevronDown size={32} className="text-teal-600" />
          </div>
        </div>
      </section>

      {/* Section 2: Problem → Solution Transformation */}
      <section id="problem" className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                Your Prompts, Now Powered by Your Project.
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Stop copy-pasting outdated project details. Our Live Variables connect your prompts directly to your
                work, ensuring they are always accurate and context-aware.
              </p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24">
            <FadeInSection>
              <div className="border bg-slate-50 border-slate-300 rounded-2xl p-6 h-full">
                <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">The Old Way: Manual & Static</h3>
                <div className="bg-white p-4 rounded-lg border border-slate-200 font-mono text-slate-600 text-sm space-y-2">
                  <p>
                    Write a bug report for sprint{" "}
                    <span className="bg-yellow-200/80 text-yellow-900 px-1 rounded">'Q4-Phoenix'</span>. The
                    high-priority bugs I'm working on are{" "}
                    <span className="bg-yellow-200/80 text-yellow-900 px-1 rounded">'T-123'</span> and{" "}
                    <span className="bg-yellow-200/80 text-yellow-900 px-1 rounded">'T-129'</span>... they are both
                    still in progress...
                  </p>
                  <p className="text-red-500 pt-2 text-xs opacity-80">
                    * Instantly outdated. Prone to errors. A waste of time.
                  </p>
                </div>
              </div>
            </FadeInSection>
            <FadeInSection delay="200ms">
              <div className="border-2 bg-white border-teal-300 rounded-2xl p-6 h-full shadow-2xl shadow-teal-500/10">
                <h3 className="text-2xl font-bold text-teal-700 mb-4 text-center">The Nexd Way: Live & Automated</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-1.5 h-8 bg-teal-500 rounded-full" />
                    <span className="text-slate-700">
                      Write a detailed bug report summary for the following tickets:
                    </span>
                  </div>
                  <div className="relative flex items-center gap-3 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-300 z-10">
                    <div className="w-1.5 h-8 bg-teal-500 rounded-full" />
                    <span className="text-teal-700 font-semibold">My High-Priority In-Progress Bugs</span>
                  </div>
                  <p className="text-green-600 pt-2 text-xs opacity-90 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Always accurate. Always up-to-date. Zero manual work.</span>
                  </p>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Section 3: Showcase the Live Data Connection */}
      <section
        id="solution"
        className="py-32 px-4 relative bg-gradient-to-b from-transparent via-teal-50/20 to-transparent"
      >
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                The First Prompt Engine Powered by Your Live Work.
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Stop copy-pasting context. Our intelligent variables query your project data in real-time.
              </p>
            </div>
          </FadeInSection>
          <FadeInSection delay="200ms">
            <div className="relative flex items-center justify-center mb-20">
              <Image
                src="/landingpage/prompt-lab.png"
                alt="Prompt Lab with Variable Builder"
                width={1600}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </FadeInSection>
          <FadeInSection>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto text-center leading-relaxed">
              Pull active sprints, high-priority tasks, or recent documents. Your prompts are always up-to-date,
              automatically.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Section 4: Showcase the Whiteboard-to-Prompt Flow */}
      <section id="features" className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                Turn Strategy into Action, Instantly.
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Don't let your best ideas get lost in translation. Convert entire whiteboard sessions into perfectly
                structured, context-aware AI directives with a single click.
              </p>
            </div>
          </FadeInSection>
          <FadeInSection delay="200ms">
            <div className="relative flex items-center justify-center mb-20">
              <Image
                src="/landingpage/whiteboard-prompt.png"
                alt="Whiteboard Feature Request Funnel"
                width={1600}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </FadeInSection>
          <FadeInSection>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto text-center leading-relaxed mt-16">
              Go from brainstorming to execution in seconds. Your visual plan becomes a text-based command instantly.
            </p>
          </FadeInSection>
        </div>
      </section>

      <ViewsSection />

      <WaitlistForm variant="cta" />

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/landingpage/logo.png" alt="nexd.pm" width={100} height={30} className="h-6 w-auto" />
            <span className="text-slate-600 text-sm">© 2025 nexd.pm. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-sm text-slate-600 hover:text-teal-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-slate-600 hover:text-teal-600 transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-slate-600 hover:text-teal-600 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
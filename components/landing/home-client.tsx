"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { ArrowRight, CheckCircle2, ChevronDown } from "lucide-react"
import { WaitlistForm } from "@/components/blog/waitlist-form"
import { Header } from "../sections/header"
const viewContent = {
  "prompt-lab": {
    src: "/landingpage/prompt--lab.png",
    alt: "Prompt Lab Interface",
  },
  "whiteboard": {
    src: "/landingpage/whiteboard-view.png",
    alt: "Whiteboard Interface",
  },
  "kanban": {
    src: "/landingpage/kanban-view.png",
    alt: "Kanban Board View",
  },
  "list": {
    src: "/landingpage/list-view.png",
    alt: "List View",
  },
  "document": {
    src: "/landingpage/document-view.png",
    alt: "Document View",
  },
}

export default function HomeClient() {
  console.log("HomeClient component is rendering.")

  const [scrollY, setScrollY] = useState(0)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [activeView, setActiveView] = useState<"prompt-lab" | "whiteboard" | "kanban" | "list" | "document">(
    "prompt-lab",
  )
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const problemRef = useRef<HTMLDivElement>(null)
  const liveDataRef = useRef<HTMLDivElement>(null)
  const whiteboardRef = useRef<HTMLDivElement>(null)
  const viewsRef = useRef<HTMLDivElement>(null)
  const logoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("HomeClient component has mounted.")
    if (logoContainerRef.current) {
      console.log(
        "Initial logo container dimensions on mount:",
        logoContainerRef.current.getBoundingClientRect(),
      )
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: "0px",
    }

    const problemObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setProblemVisible(true)
        }
      })
    }, observerOptions)

    const liveDataObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setLiveDataVisible(true)
        }
      })
    }, observerOptions)

    const whiteboardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setWhiteboardVisible(true)
        }
      })
    }, observerOptions)

    const viewsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setViewsVisible(true)
        }
      })
    }, observerOptions)

    if (problemRef.current) problemObserver.observe(problemRef.current)
    if (liveDataRef.current) liveDataObserver.observe(liveDataRef.current)
    if (whiteboardRef.current) whiteboardObserver.observe(whiteboardRef.current)
    if (viewsRef.current) viewsObserver.observe(viewsRef.current)

    return () => {
      problemObserver.disconnect()
      liveDataObserver.disconnect()
      whiteboardObserver.disconnect()
      viewsObserver.disconnect()
    }
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Email submitted:", email)
  }

  const views = ["prompt-lab", "whiteboard", "kanban", "list", "document"] as const

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = views.indexOf(activeView)

      if (isLeftSwipe && currentIndex < views.length - 1) {
        changeView(views[currentIndex + 1])
      } else if (isRightSwipe && currentIndex > 0) {
        changeView(views[currentIndex - 1])
      }
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  const changeView = (newView: typeof activeView) => {
    setActiveView(newView)
  }

  const handleImageLoad = (img: HTMLImageElement) => {
    console.log("Logo image has finished loading.")
    console.log("Image natural dimensions:", {
      width: img.naturalWidth,
      height: img.naturalHeight,
    })
    if (logoContainerRef.current) {
      console.log(
        "Logo container dimensions after image load:",
        logoContainerRef.current.getBoundingClientRect(),
      )
    }
  }

  const [problemVisible, setProblemVisible] = useState(false)
  const [liveDataVisible, setLiveDataVisible] = useState(false)
  const [whiteboardVisible, setWhiteboardVisible] = useState(false)
  const [viewsVisible, setViewsVisible] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Floating Navigation */}
      <Header />

      {/* Section 1: Hero */}
      <section className="pt-32 pb-40 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-teal-400/30 to-cyan-400/30 rounded-full blur-[140px] animate-pulse-slow" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="relative" ref={logoContainerRef}>
              <Image
                src="/landingpage/logo.png"
                alt="nexd.pm"
                width={470}
                height={200}
                className="h-28 w-auto animate-fade-in-scale"
                priority
                onLoadingComplete={handleImageLoad}
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
            The first PM platform where your live project data powers your AI. Automate reports, generate tasks, and
            unlock insights in seconds.
          </p>

          <div className="flex justify-center animate-bounce-slow animation-delay-1000">
            <ChevronDown size={32} className="text-teal-600" />
          </div>
        </div>
      </section>

      {/* Section 2: REPLACED Problem → Solution Transformation */}
      <section id="problem" className="py-32 px-4" ref={problemRef}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Your Prompts, Now Powered by Your Project.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Stop copy-pasting outdated project details. Our Live Variables connect your prompts directly to your work,
              ensuring they are always accurate and context-aware.
            </p>
          </div>

          {/* BEFORE / AFTER Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24">
            {/* BEFORE */}
            <div className="border bg-slate-50 border-slate-300 rounded-2xl p-6 h-full">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">The Old Way: Manual & Static</h3>
              <div className="bg-white p-4 rounded-lg border border-slate-200 font-mono text-slate-600 text-sm space-y-2">
                <p>
                  Write a bug report for sprint{" "}
                  <span className="bg-yellow-200/80 text-yellow-900 px-1 rounded">'Q4-Phoenix'</span>. The
                  high-priority bugs I'm working on are{" "}
                  <span className="bg-yellow-200/80 text-yellow-900 px-1 rounded">'T-123'</span> and{" "}
                  <span className="bg-yellow-200/80 text-yellow-900 px-1 rounded">'T-129'</span>... they are both still
                  in progress...
                </p>
                <p className="text-red-500 pt-2 text-xs opacity-80">
                  * Instantly outdated. Prone to errors. A waste of time.
                </p>
              </div>
            </div>

            {/* AFTER */}
            <div className="border-2 bg-white border-teal-300 rounded-2xl p-6 h-full shadow-2xl shadow-teal-500/10">
              <h3 className="text-2xl font-bold text-teal-700 mb-4 text-center">The Nexd Way: Live & Automated</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-1.5 h-8 bg-teal-500 rounded-full" />
                  <span className="text-slate-700">Write a detailed bug report summary for the following tickets:</span>
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
          </div>

          {/* EXPLANATION OF LIVE DATA */}
          <div className="text-center mt-16">
            <h3 className="text-3xl font-bold text-slate-800 mb-4">What does "Live Data" actually mean?</h3>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              It means a single Live Variable can query your entire project to find exactly what you need, right now.
              It's not just a placeholder—it's a powerful, real-time command.
            </p>
          </div>

          <div className="mt-12 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
            {/* Live Variable Block */}
            <div className="relative flex items-center gap-3 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-300 z-10 w-fit">
              <div className="w-1.5 h-8 bg-teal-500 rounded-full" />
              <span className="text-teal-700 font-semibold">My High-Priority In-Progress Bugs</span>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0">
              <ArrowRight
                size={40}
                className={`text-teal-400 transition-transform duration-700 hidden lg:block ${
                  problemVisible ? "scale-x-100" : "scale-x-0"
                }`}
                style={{ transitionDelay: problemVisible ? "500ms" : "0ms", transformOrigin: "left" }}
              />
              <ChevronDown
                size={40}
                className={`text-teal-400 transition-transform duration-700 lg:hidden ${
                  problemVisible ? "scale-y-100" : "scale-y-0"
                }`}
                style={{ transitionDelay: problemVisible ? "500ms" : "0ms", transformOrigin: "top" }}
              />
            </div>

            {/* Revealed Data Block */}
            <div
              className={`bg-white shadow-2xl rounded-lg border border-slate-200 p-4 w-full max-w-sm transition-all duration-500 ${
                problemVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
              }`}
              style={{ transitionDelay: problemVisible ? "800ms" : "0ms" }}
            >
              <h4 className="font-bold text-slate-700 text-sm mb-2">Pulls this data, live from your project:</h4>
              <div className="text-left space-y-2 text-sm text-slate-600 bg-slate-50/70 p-3 rounded-md border border-slate-200">
                <p className="font-semibold text-slate-500 text-xs">QUERY:</p>
                <p>
                  <span className="font-medium text-slate-800">Tasks</span> WHERE{" "}
                  <span className="text-purple-600">Priority</span> IS{" "}
                  <span className="text-orange-600">'High'</span> AND{" "}
                  <span className="text-purple-600">Status</span> IS NOT{" "}
                  <span className="text-orange-600">'Done'</span> AND{" "}
                  <span className="text-purple-600">Assignee</span> IS{" "}
                  <span className="text-orange-600">'Me'</span>
                </p>
              </div>
              <div className="text-left space-y-1 text-sm text-slate-600 mt-3">
                <p className="font-semibold text-slate-500 text-xs">RESULT:</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span>[T-123] Payment gateway API fails on timeout</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span>[T-129] User avatar upload crashes on Safari</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Showcase the Live Data Connection */}
      <section
        id="solution"
        className="py-32 px-4 relative bg-gradient-to-b from-transparent via-teal-50/20 to-transparent"
        ref={liveDataRef}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              The First Prompt Engine Powered by Your Live Work.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Our intelligent engine connects directly to your tasks, documents, and diagrams, giving your prompts
              perfect, real-time context.
            </p>
          </div>

          <div className="relative flex items-center justify-center mb-20">
            <div
              className={`transition-all duration-1000 ease-out ${
                liveDataVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8"
              }`}
              style={{ transitionDelay: liveDataVisible ? "200ms" : "0ms" }}
            >
              <Image
                src="/landingpage/prompt-lab.png"
                alt="Prompt Lab with Variable Builder"
                width={1600}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </div>

          <p className="text-lg text-slate-600 max-w-3xl mx-auto text-center leading-relaxed">
            Pull active sprints, high-priority tasks, or recent documents. Your prompts are always up-to-date,
            automatically.
          </p>
        </div>
      </section>

      {/* Section 4: Showcase the Whiteboard-to-Prompt Flow */}
      <section id="features" className="py-32 px-4 relative" ref={whiteboardRef}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              From Visual Idea to Actionable Prompt.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Turn your whiteboard sessions, system diagrams, and user flows directly into intelligent prompts. Stop
              translating; start generating.
            </p>
          </div>

          <div className="relative flex items-center justify-center mb-20">
            <div
              className={`transition-all duration-1000 ease-out ${
                liveDataVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8"
              }`}
              style={{ transitionDelay: liveDataVisible ? "200ms" : "0ms" }}
            >
              <Image
                src="/landingpage/whiteboard-prompt.png"
                alt="Whiteboard Feature Request Funnel"
                width={1600}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </div>

          <p className="text-lg text-slate-600 max-w-3xl mx-auto text-center leading-relaxed mt-16">
            Go from brainstorming to execution in seconds. Your visual plan becomes a text-based command instantly.
          </p>
        </div>
      </section>

      {/* Views Showcase Section */}
      <section id="views" className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 text-balance">
              One Platform. Multiple Views.
            </h2>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Work the way your team works. Switch seamlessly between views designed for every workflow.
            </p>
          </div>

          <div className="hidden md:flex justify-center mb-12">
            <div className="inline-flex bg-slate-100 rounded-full p-2 gap-2">
              <button
                onClick={() => changeView("prompt-lab")}
                className={`px-6 py-3 rounded-full font-medium transition-all text-base whitespace-nowrap ${
                  activeView === "prompt-lab"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Prompt Lab
              </button>
              <button
                onClick={() => changeView("whiteboard")}
                className={`px-6 py-3 rounded-full font-medium transition-all text-base whitespace-nowrap ${
                  activeView === "whiteboard"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Whiteboard
              </button>
              <button
                onClick={() => changeView("kanban")}
                className={`px-6 py-3 rounded-full font-medium transition-all text-base whitespace-nowrap ${
                  activeView === "kanban" ? "bg-teal-600 text-white shadow-lg" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => changeView("list")}
                className={`px-6 py-3 rounded-full font-medium transition-all text-base whitespace-nowrap ${
                  activeView === "list" ? "bg-teal-600 text-white shadow-lg" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                List
              </button>
              <button
                onClick={() => changeView("document")}
                className={`px-6 py-3 rounded-full font-medium transition-all text-base whitespace-nowrap ${
                  activeView === "document"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Document
              </button>
            </div>
          </div>

          <div className="md:hidden text-center mb-8">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Swipe to explore views
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </p>
          </div>

          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Spacer to maintain aspect ratio and prevent layout shift during transitions */}
            <Image
              src={viewContent["prompt-lab"].src}
              alt=""
              aria-hidden
              width={1600}
              height={900}
              className="w-full h-auto invisible"
            />
            {views.map((view) => (
              <Image
                key={view}
                src={viewContent[view].src}
                alt={viewContent[view].alt}
                width={1600}
                height={900}
                priority={view === "prompt-lab"}
                className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-300 ease-in-out rounded-2xl ${
                  activeView === view ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                }`}
              />
            ))}
          </div>

          <div className="md:hidden flex justify-center gap-2 mt-8">
            {views.map((view, index) => (
              <button
                key={view}
                onClick={() => changeView(view)}
                className={`h-2 rounded-full transition-all ${
                  activeView === view ? "w-8 bg-teal-600" : "w-2 bg-slate-300"
                }`}
                aria-label={`View ${view}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Final Call to Action */}
      <WaitlistForm variant="cta" />

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/landingpage/logo.png" alt="nexd.pm" width={100} height={30} className="h-6 w-auto" />
            <span className="text-slate-600 text-sm">© 2026 nexd.pm. All rights reserved.</span>
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

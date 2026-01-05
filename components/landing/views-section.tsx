"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"

const viewContent = {
  "prompt-lab": {
    src: "/landingpage/prompt--lab.png",
    alt: "Prompt Lab Interface",
  },
  whiteboard: {
    src: "/landingpage/whiteboard-view.png",
    alt: "Whiteboard Interface",
  },
  kanban: {
    src: "/landingpage/kanban-view.png",
    alt: "Kanban Board View",
  },
  list: {
    src: "/landingpage/list-view.png",
    alt: "List View",
  },
  document: {
    src: "/landingpage/document-view.png",
    alt: "Document View",
  },
} as const

type View = keyof typeof viewContent
const views: View[] = ["prompt-lab", "whiteboard", "kanban", "list", "document"]

export function ViewsSection() {
  const [activeView, setActiveView] = useState<View>("prompt-lab")
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

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
    const currentIndex = views.indexOf(activeView)

    if (isLeftSwipe && currentIndex < views.length - 1) {
      setActiveView(views[currentIndex + 1])
    } else if (isRightSwipe && currentIndex > 0) {
      setActiveView(views[currentIndex - 1])
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  return (
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
            {views.map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-6 py-3 rounded-full font-medium transition-all text-base whitespace-nowrap ${
                  activeView === view
                    ? "bg-teal-600 text-white shadow-lg"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1).replace("-", " ")}
              </button>
            ))}
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
          {views.map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`h-2 rounded-full transition-all ${
                activeView === view ? "w-8 bg-teal-600" : "w-2 bg-slate-300"
              }`}
              aria-label={`View ${view}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
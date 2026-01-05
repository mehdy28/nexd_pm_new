"use client"

import { useRef, useEffect, useState, type ReactNode } from "react"

interface FadeInSectionProps {
  children: ReactNode
  className?: string
  delay?: string
  duration?: string
  translateY?: string
}

export function FadeInSection({
  children,
  className,
  delay = "0ms",
  duration = "700ms",
  translateY = "16px",
}: FadeInSectionProps) {
  const [isVisible, setVisible] = useState(false)
  const domRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )

    const { current } = domRef
    if (current) {
      observer.observe(current)
    }

    return () => {
      if (current) {
        observer.unobserve(current)
      }
    }
  }, [])

  return (
    <div
      ref={domRef}
      className={`${className} transition-all ease-out`}
      style={{
        transitionDuration: duration,
        transitionDelay: delay,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(${translateY})`,
      }}
    >
      {children}
    </div>
  )
}
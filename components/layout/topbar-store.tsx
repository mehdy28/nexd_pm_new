"use client"

import type React from "react"
import { createContext, useContext, useCallback, useState, useEffect, useRef, type ReactNode } from "react"

export type TabItem = { key: string; label: string; icon?: React.ReactNode }

type TopbarState = {
  title: string
  tabs: TabItem[]
  activeKey: string
  showShare?: boolean
  showSprint?: boolean
  showAddSection?: boolean
}

type TopbarContextType = TopbarState & {
  setConfig: (cfg: Partial<TopbarState>) => void
  setActiveKey: (key: string) => void
}

const TopbarContext = createContext<TopbarContextType | null>(null)

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TopbarState>({
    title: "",
    tabs: [],
    activeKey: "",
    showShare: true,
    showSprint: true,
    showAddSection: true,
  })

  const setConfig = useCallback((cfg: Partial<TopbarState>) => {
    setState((prev) => ({ ...prev, ...cfg }))
  }, [])

  const setActiveKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, activeKey: key }))
  }, [])

  const value: TopbarContextType = {
    ...state,
    setConfig,
    setActiveKey,
  }

  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>
}

export function useTopbar() {
  const ctx = useContext(TopbarContext)
  if (!ctx) throw new Error("useTopbar must be used within TopbarProvider")
  return ctx
}

/* Helper hook to configure topbar from a page */
export function useTopbarSetup(initial: Partial<TopbarState>) {
  const { setConfig } = useTopbar()
  const last = useRef<string | null>(null)

  useEffect(() => {
    try {
      // Create a serializable version by excluding React elements from comparison
      const serializable = { ...initial }
      if (serializable.tabs) {
        serializable.tabs = serializable.tabs.map((tab) => ({ key: tab.key, label: tab.label }))
      }

      const next = JSON.stringify(serializable)
      if (last.current !== next) {
        last.current = next
        setConfig(initial)
      }
    } catch (error) {
      // Fallback: just set the config without comparison if serialization fails
      setConfig(initial)
    }
  }, [setConfig, initial])
}

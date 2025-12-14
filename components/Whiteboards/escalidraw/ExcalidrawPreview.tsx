"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import dynamic from "next/dynamic"
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import type { AppState  } from "@excalidraw/excalidraw/types"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { Loader2 } from "lucide-react"

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw")
    return mod.Excalidraw
  },
  { ssr: false }
)

interface ExcalidrawPreviewProps {
  filePath: string
}

interface ExcalidrawFileData {
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
}

const ExcalidrawPreview = ({ filePath }: ExcalidrawPreviewProps) => {
  const [data, setData] = useState<ExcalidrawFileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(filePath)
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.status}`)
        }
        const fileData = await response.json()
        if (isMounted) {
          setData({
            elements: fileData.elements || [],
            appState: { ...fileData.appState, viewBackgroundColor: "#f8fafc" },
          })
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || "Could not load template data.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [filePath])

  // FIX APPLIED HERE
  useLayoutEffect(() => {
    if (excalidrawAPI && data?.elements && data.elements.length > 0) {
      // Use scrollToContent with fitToViewport option
      excalidrawAPI.scrollToContent(data.elements, {
        fitToViewport: true, // This is the equivalent of "zoom to fit"
        viewportZoomFactor: 0.95, // Adjusts how tightly it fits (0.95 is close to your original value)
      })
    }
  }, [excalidrawAPI, data])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-2 text-center text-xs text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (!data || !Excalidraw) {
    return null
  }

  return (
    <div className="pointer-events-none h-full w-full [&_.excalidraw-bottom-bar]:hidden [&_.excalidraw-main-menu]:hidden">
      <Excalidraw
        excalidrawAPI={api => setExcalidrawAPI(api)}
        initialData={data}
        viewModeEnabled={true}
        zenModeEnabled={true}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveAsImage: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      />
    </div>
  )
}

export default ExcalidrawPreview

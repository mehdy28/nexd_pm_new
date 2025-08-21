"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save } from "lucide-react"
import { wireframesStore, type Wireframe } from "./store"

// Types + wrapper requested
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import type { AppState as ExcalidrawAppState } from "@excalidraw/excalidraw/types"
import type { ExcalidrawAPI } from "./escalidraw/excalidraw"
import ExcalidrawWrapper from "./escalidraw/ExcalidrawWrapper"

const exportToBlob = async (...args: any[]) => {
  const mod: any = await import("@excalidraw/excalidraw")
  return mod.exportToBlob(...(args as any))
}

export function WireframeEditor({ id, backHref }: { id: string; backHref: string }) {
  const [wf, setWf] = useState<Wireframe | null>(null)
  const [title, setTitle] = useState("")
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const found = wireframesStore.get(id)
    if (found) {
      setWf(found)
      setTitle(found.title)
      console.log("wf.scene:", found.scene); // Log wf.scene
    } else {
      const created = wireframesStore.create("Untitled Wireframe")
      setWf(created)
      setTitle(created.title)
      console.log("wf.scene after create:", created.scene); // Log wf.scene after create
    }
  }, [id])

  const selectedWireframe = wf
    ? {
        id: wf.id,
        content: {
          elements: (wf.scene?.elements ?? []) as ReadonlyArray<ExcalidrawElement>,
          appState: (wf.scene?.appState ?? { viewBackgroundColor: "#ffffff" }) as Partial<ExcalidrawAppState>,
          files: wf.scene?.files ?? {},
        },
      }
    : null

  const excalidrawInitialData = useMemo(() => {
    const defaultData: {
      elements: ReadonlyArray<ExcalidrawElement>
      appState: Partial<ExcalidrawAppState>
    } = {
      elements: [],
      appState: { collaborators: new Map() as any, viewBackgroundColor: "#ffffff" }, // Added viewBackgroundColor
    }
    if (!selectedWireframe || !selectedWireframe.content) return defaultData

    const content = selectedWireframe.content;
    const initialAppState = (content.appState || { viewBackgroundColor: "#ffffff" }) as Partial<ExcalidrawAppState>; // Add default viewBackgroundColor
    const { collaborators: initialCollaborators, ...restInitialAppState } = initialAppState as any;

    const preparedAppState: Partial<ExcalidrawAppState> = { ...restInitialAppState };
    if (initialCollaborators && typeof initialCollaborators === "object" && !(initialCollaborators instanceof Map)) {
      preparedAppState.collaborators = new Map() as any;
    } else if (initialCollaborators instanceof Map) {
      preparedAppState.collaborators = initialCollaborators as any;
    } else {
      preparedAppState.collaborators = new Map() as any;
    }

    const initialData = {
      elements: (content.elements || []) as ReadonlyArray<ExcalidrawElement>,
      appState: preparedAppState,
    };

    console.log("excalidrawInitialData:", initialData); // Log excalidrawInitialData
    return initialData;
  }, [selectedWireframe]);

  const persist = useCallback(
    async (opts: {
      reason: "scene" | "title"
      elements?: ReadonlyArray<ExcalidrawElement>
      appState?: ExcalidrawAppState
      files?: Record<string, any>
    }) => {
      if (!wf) return
      const elements =
        opts.elements || (excalidrawAPI?.getSceneElements ? excalidrawAPI.getSceneElements() : wf.scene?.elements) || []
      const appState =
        opts.appState || (excalidrawAPI?.getAppState ? excalidrawAPI.getAppState() : wf.scene?.appState) || {}
      const files = opts.files || (excalidrawAPI?.getFiles ? excalidrawAPI.getFiles() : wf.scene?.files) || {}

      let previewDataUrl = wf.previewDataUrl
      try {
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, exportBackground: true, viewBackgroundColor: "#ffffff" },
          files,
          mimeType: "image/png",
          quality: 0.9,
          exportPadding: 8,
          getDimensions: () => ({ width: 800, height: 500 }),
        } as any)
        previewDataUrl = await blobToDataUrl(blob)
      } catch {
        // ignore preview errors
      }

      const updated = wireframesStore.update(wf.id, {
        title: opts.reason === "title" ? title : wf.title,
        scene: { elements: elements as any[], appState: appState as any, files },
        previewDataUrl,
      })
      if (updated) setWf(updated)
    },
    [wf, title, excalidrawAPI],
  )

  const debouncedHandleChange = useCallback(
    (elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState, files?: Record<string, any>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persist({ reason: "scene", elements, appState, files: files || {} })
      }, 500)
    },
    [persist],
  )

  if (!wf) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading wireframe...</div>
  }

  return (
    <div className="page-scroller p-4">
      <div className="saas-card overflow-hidden">
        <div
          className="saas-section-header"
          style={{ borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)" }}
        >
          <div className="flex items-center gap-2">
            <Link href={backHref}>
              <Button variant="outline" className="h-9 bg-transparent">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Wireframes
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => persist({ reason: "title" })}
              className="h-9 w-[260px]"
              placeholder="Wireframe title"
            />
            <Button className="h-9 btn-primary" onClick={() => persist({ reason: "scene" })}>
              <Save className="mr-1 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="min-h-[70vh]">
         <div className="flex h-full w-full flex-col"> {/* Add this line */}
          <ExcalidrawWrapper
            initialData={excalidrawInitialData}
            onChange={debouncedHandleChange}
            setApi={setExcalidrawAPI}
            api={excalidrawAPI}
          />
         </div> {/* Add this line */}
        </div>
      </div>
    </div>
  )
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
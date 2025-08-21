"use client"

import type React from "react"
import { memo, useEffect, useCallback, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { ExcalidrawAPI } from "./excalidraw"
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import type { AppState as ExcalidrawAppState } from "@excalidraw/excalidraw/types"
import "@excalidraw/excalidraw/index.css";

const DynamicExcalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, { ssr: false })

type DynamicWelcomeScreenType = React.ComponentType<{ children?: React.ReactNode }> & {
  Center: any
  Hints: any
}
type DynamicMainMenuType = React.ComponentType<{ children?: React.ReactNode }> & {
  Item: any
  ItemLink: any
  ItemCustom: any
}

interface ExcalidrawWrapperProps {
  initialData?: {
    elements?: ReadonlyArray<ExcalidrawElement>
    appState?: Partial<ExcalidrawAppState>
  } | null
  onChange?: (
    elements: ReadonlyArray<ExcalidrawElement>,
    appState: ExcalidrawAppState,
    files?: Record<string, any>,
  ) => void
  setApi: (api: ExcalidrawAPI | null) => void
  api: ExcalidrawAPI | null
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = memo(({ initialData, onChange, setApi, api }) => {
  const [dynamicWelcomeScreenReady, setDynamicWelcomeScreenReady] = useState(false)
  const [DynamicWelcomeScreenComponent, setDynamicWelcomeScreenComponent] = useState<DynamicWelcomeScreenType | null>(
    null,
  )

  const [dynamicMainMenuReady, setDynamicMainMenuReady] = useState(false)
  const [DynamicMainMenuComponent, setDynamicMainMenuComponent] = useState<DynamicMainMenuType | null>(null)

  const initialDataRef = useRef(initialData)

  useEffect(() => {
    let isMounted = true
    const loadWelcomeScreen = async () => {
      const { WelcomeScreen } = await import("@excalidraw/excalidraw")
      if (!isMounted) return
      const DynamicComponent: any = WelcomeScreen
      DynamicComponent.Center = WelcomeScreen.Center
      DynamicComponent.Hints = WelcomeScreen.Hints
      setDynamicWelcomeScreenComponent(() => DynamicComponent)
      setDynamicWelcomeScreenReady(true)
    }
    loadWelcomeScreen()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadMainMenu = async () => {
      const { MainMenu } = await import("@excalidraw/excalidraw")
      if (!isMounted) return
      const DynamicComponent: any = MainMenu
      DynamicComponent.Item = MainMenu.Item
      DynamicComponent.ItemLink = MainMenu.ItemLink
      DynamicComponent.ItemCustom = MainMenu.ItemCustom
      setDynamicMainMenuComponent(() => DynamicComponent)
      setDynamicMainMenuReady(true)
    }
    loadMainMenu()
    return () => {
      isMounted = false
    }
  }, [])

  const onLoadLib = useCallback(async () => {
    if (!api) return
    try {
      const response = await fetch("/libraries/mehhdy.excalidrawlib")
      if (!response.ok) throw new Error(`Failed to fetch library: ${response.status} ${response.statusText}`)
      const libraryData = await response.json()
      if (api && typeof api.updateLibrary === "function") {
        api.updateLibrary({
          libraryItems: libraryData.libraryItems || [],
        })
      }
    } catch (err) {
      // Silent fail
      console.warn("ExcalidrawWrapper: library load failed", err)
    }
  }, [api])

  useEffect(() => {
    if (api) onLoadLib()
  }, [api, onLoadLib])

  // Update scene if initialData prop changes after mount
  useEffect(() => {
    if (api && initialData !== initialDataRef.current) {
      const elements = initialData?.elements ?? []
      const appState = initialData?.appState ?? {}
      api.updateScene?.({ elements, appState })
      initialDataRef.current = initialData
    }
  }, [api, initialData])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1">
        <DynamicExcalidraw
          excalidrawAPI={(apiInstance: any) => setApi(apiInstance)}
          initialData={initialDataRef.current as any}
          onChange={(elements: any, appState: any, files: any) => onChange?.(elements, appState, files)}
          UIOptions={{ canvasActions: { loadScene: false } }}
        >
          {dynamicMainMenuReady && DynamicMainMenuComponent ? (
            <DynamicMainMenuComponent>
              <DynamicMainMenuComponent.Item onSelect={() => alert("Custom Item 1 Clicked!")}>
                Custom Item 1
              </DynamicMainMenuComponent.Item>
              <DynamicMainMenuComponent.ItemLink href="https://youtu.be/dQw4w9WgXcQ">
                Example Link
              </DynamicMainMenuComponent.ItemLink>
              <DynamicMainMenuComponent.ItemCustom>
                <button onClick={() => alert("Custom Button Clicked!")}>Custom Button</button>
              </DynamicMainMenuComponent.ItemCustom>
            </DynamicMainMenuComponent>
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500">Loading Main Menu...</div>
          )}

          {dynamicWelcomeScreenReady && DynamicWelcomeScreenComponent ? (
            <DynamicWelcomeScreenComponent>
              <DynamicWelcomeScreenComponent.Center>
                <DynamicWelcomeScreenComponent.Center.Heading>
                  {"One Piece 3amek!"}
                </DynamicWelcomeScreenComponent.Center.Heading>
                <DynamicWelcomeScreenComponent.Center.MenuItemLink href="https://youtu.be/dQw4w9WgXcQ">
                  {"Click Me :D"}
                </DynamicWelcomeScreenComponent.Center.MenuItemLink>
              </DynamicWelcomeScreenComponent.Center>
            </DynamicWelcomeScreenComponent>
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500">Loading Welcome Screen...</div>
          )}
        </DynamicExcalidraw>
      </div>
    </div>
  )
})

ExcalidrawWrapper.displayName = "ExcalidrawWrapper"
export default ExcalidrawWrapper
export type { ExcalidrawElement, ExcalidrawAppState }

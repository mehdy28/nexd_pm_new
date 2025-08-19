export type ExcalidrawAPI = {
  getSceneElements: () => any[]
  getAppState: () => any
  getFiles?: () => Record<string, any>
  updateScene?: (opts: { elements?: any[]; appState?: any; files?: Record<string, any> }) => void
  updateLibrary?: (opts: { libraryItems: any[] }) => void
}

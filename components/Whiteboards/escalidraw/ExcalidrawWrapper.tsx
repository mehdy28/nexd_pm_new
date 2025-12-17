"use client";

import type React from "react";
import { memo, useEffect, useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawAPI } from "./excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { getCommonBounds, exportToSvg } from "@excalidraw/excalidraw";
import type { AppState as ExcalidrawAppState } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { WelcomeScreen as OriginalWelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

type DynamicWelcomeScreenType = React.ComponentType<{ children?: React.ReactNode }> & {
  Center: typeof OriginalWelcomeScreen.Center;
  Hints: typeof OriginalWelcomeScreen.Hints;
};

const DynamicExcalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false }
);

// ---------------- LIBRARIES ----------------

const LIBRARIES = [
  { name: "Data Viz", path: "/libraries/data-viz.excalidrawlib" },
  { name: "Lo-fi Wireframing", path: "/libraries/lo-fi-wireframing-kit.excalidrawlib" },
  { name: "System Design", path: "/libraries/systems-design-components.excalidrawlib" },
  { name: "UML Activity Diagram", path: "/libraries/uml-library-activity-diagram.excalidrawlib" },
  { name: "UML Deployment Diagram", path: "/libraries/uml-deployment-diagram.excalidrawlib" },
  { name: "Universal UI Kit", path: "/libraries/universal-ui-kit.excalidrawlib" },
  { name: "Wardley Mapping", path: "/libraries/wardley-mapping-canvas.excalidrawlib" },
];


interface LibraryItem {
  id: string;
  status: string;
  elements: readonly ExcalidrawElement[];
  created: number;
  name?: string;
}

// ---------------- LIBRARY ITEM PREVIEW ----------------

const LibraryItemPreview = ({ elements }: { elements: readonly ExcalidrawElement[] }) => {
    const [svgDataURL, setSvgDataURL] = useState<string | null>(null);

    useEffect(() => {
        const renderPreview = async () => {
            if (!elements || elements.length === 0) {
                return;
            }
            try {
                const svg = await exportToSvg({
                    elements,
                    appState: {
                        exportBackground: false,
                        viewBackgroundColor: "transparent",
                        gridSize: null,
                    },
                    files: null,
                    getDimensions: () => ({ width: 120, height: 120 }),
                });
                const dataUrl = `data:image/svg+xml;base64,${btoa(svg.outerHTML)}`;
                setSvgDataURL(dataUrl);
            } catch (error) {
                console.error("Error generating library item preview", error);
                setSvgDataURL(null);
            }
        };

        renderPreview();
    }, [elements]);

    if (!svgDataURL) {
        return (
            <div style={{
                width: '100%',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888'
            }}>
                ...
            </div>
        );
    }

    return (
        <img
            src={svgDataURL}
            alt="Library item preview"
            style={{
                width: "100%",
                height: "100px",
                objectFit: "contain",
                padding: "8px"
            }}
        />
    );
};


// ---------------- CUSTOM LIBRARY MODAL ----------------

const CustomLibraryModal = ({
  api,
  onClose,
}: {
  api: ExcalidrawImperativeAPI;
  onClose: () => void;
}) => {
  const [activeLib, setActiveLib] = useState(LIBRARIES[0]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(activeLib.path);
        if (!response.ok) throw new Error("Failed to fetch library");

        const data = await response.json();

        const validItems: LibraryItem[] = (data.libraryItems || []).filter(
          (item: any) =>
            Array.isArray(item.elements) && item.elements.length > 0
        );

        setLibraryItems(validItems);
      } catch (error) {
        console.error("Error loading library:", activeLib.name, error);
        setLibraryItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibrary();
  }, [activeLib]);

  const handleAddItemToCanvas = (
    elements?: readonly ExcalidrawElement[]
  ) => {
    if (!api) return;

    if (!Array.isArray(elements) || elements.length === 0) {
      console.error("Invalid library item (missing elements):", elements);
      return;
    }

    const appState = api.getAppState();
    const { width, height, zoom } = appState;

    const viewPortCenterX = (width / 2 - appState.scrollX) / zoom.value;
    const viewPortCenterY = (height / 2 - appState.scrollY) / zoom.value;

    const [minX, minY, maxX, maxY] = getCommonBounds(elements);

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;

    const bboxCenterX = minX + bboxWidth / 2;
    const bboxCenterY = minY + bboxHeight / 2;

    const dx = viewPortCenterX - bboxCenterX;
    const dy = viewPortCenterY - bboxCenterY;

    const newElements = elements.map((el) => ({
      ...el,
      x: el.x + dx,
      y: el.y + dy,
    }));

    const existingElements = api.getSceneElements();

    api.updateScene({
      elements: [...existingElements, ...newElements],
    });
    
    onClose();
  };

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: "80%",
          height: "70%",
          maxWidth: "1200px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          position: "relative",
        }}
      >
        {/* Sidebar */}
        <div style={{ width: 240, borderRight: "1px solid #e0e0e0", padding: 16 }}>
          <h3>Libraries</h3>
          {LIBRARIES.map((lib) => (
            <button
              key={lib.path}
              onClick={() => setActiveLib(lib)}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                marginBottom: 8,
                textAlign: "left",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background:
                  activeLib.path === lib.path ? "#e6f7ff" : "transparent",
              }}
            >
              {lib.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <h2>{activeLib.name}</h2>

          {isLoading ? (
            <div>Loading...</div>
          ) : libraryItems.length === 0 ? (
            <div>No items found in this library.</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 16,
              }}
            >
              {libraryItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleAddItemToCanvas(item.elements)}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    cursor: "pointer",
                    textAlign: "center",
                    backgroundColor: "#f9f9f9",
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LibraryItemPreview elements={item.elements} />
                  </div>
                   <div style={{ padding: '8px', borderTop: '1px solid #eee', wordBreak: 'break-word' }}>
                    {item.name ?? `Item ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            fontSize: 24,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};



// --- End Custom Library Components ---

interface ExcalidrawWrapperProps {
    initialData?: {
        elements?: ReadonlyArray<ExcalidrawElement>;
        appState?: Partial<ExcalidrawAppState>;
    } | null;
    onChange?: (
        elements: ReadonlyArray<ExcalidrawElement>,
        appState: ExcalidrawAppState
    ) => void;
    onPointerDown?: (event: any) => void;
    setApi: (api: ExcalidrawImperativeAPI | null) => void;
    api: ExcalidrawImperativeAPI | null;
    style?: React.CSSProperties;
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = memo(({
    initialData,
    onChange,
    onPointerDown,
    setApi,
    api,
    style
}) => {
    const [dynamicWelcomeScreenReady, setDynamicWelcomeScreenReady] = useState(false);
    const initialDataRef = useRef(initialData);
    const [DynamicWelcomeScreenComponent, setDynamicWelcomeScreenComponent] = useState<DynamicWelcomeScreenType | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadWelcomeScreen = async () => {
            try {
                const { WelcomeScreen } = await import('@excalidraw/excalidraw');
                if (!isMounted) return;
                const DynamicComponent = WelcomeScreen as any;
                DynamicComponent.Center = WelcomeScreen.Center;
                DynamicComponent.Hints = WelcomeScreen.Hints;
                setDynamicWelcomeScreenComponent(() => DynamicComponent);
                setDynamicWelcomeScreenReady(true);
            } catch (e) {
                console.error("Failed to import WelcomeScreen:", e);
            }
        };
        loadWelcomeScreen();
        return () => { isMounted = false; };
    }, []);

    const handleSetApi = useCallback((apiInstance: ExcalidrawImperativeAPI | null) => {
        setApi(apiInstance);
    }, [setApi]);

    const handleOnChange = useCallback((elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState) => {
        if (onChange) {
            onChange(elements, appState);
        }
    }, [onChange]);

    const renderTopRightUI = () => {
        return (
            <button
                onClick={() => setIsLibraryOpen(true)}
                style={{
                    backgroundColor: "#F1F3F5",
                    border: "1px solid #E9ECEF",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
                    fontSize: '14px',
                    color: '#495057'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M2 15h10"/><path d="M5 12v6"/><path d="M8 12v6"/>
                </svg>
                Library
            </button>
        );
    };

    return (
        <div style={{ ...style, display: "flex", flexDirection: "column" }}>
            <style>{`
              .excalidraw .help-icon,
              .excalidraw .main-menu-trigger,
              .excalidraw .excalidraw-bottom-bar,
              .excalidraw label[title="Library"] {
                display: none;
              }
            `}</style>
            <div style={{ flexGrow: 1, position: "relative" }}>
                <DynamicExcalidraw
                    assetPath="/excalidraw-assets/"
                    excalidrawAPI={handleSetApi}
                    initialData={initialDataRef.current}
                    onChange={handleOnChange}
                    onPointerDown={onPointerDown}
                    UIOptions={{
                        canvasActions: {
                            loadScene: false,
                            saveToActiveFile: false,
                            toggleTheme: false,
                            saveAsImage: false,
                            clearCanvas: false,
                            export: false,
                            library: false,
                        }
                    }}
                    renderTopRightUI={renderTopRightUI}
                >
                    {dynamicWelcomeScreenReady && DynamicWelcomeScreenComponent ? (
                        <DynamicWelcomeScreenComponent>
                            <DynamicWelcomeScreenComponent.Center>
                                 <DynamicWelcomeScreenComponent.Center.Heading>
                                    Start by creating something new or open an existing file.
                                </DynamicWelcomeScreenComponent.Center.Heading>
                            </DynamicWelcomeScreenComponent.Center>
                        </DynamicWelcomeScreenComponent>
                    ) : (
                        <div>Loading...</div>
                    )}
                </DynamicExcalidraw>
                 {isLibraryOpen && api && (
                    <CustomLibraryModal api={api} onClose={() => setIsLibraryOpen(false)} />
                )}
            </div>
        </div>
    );
});

ExcalidrawWrapper.displayName = 'ExcalidrawWrapper';

export default ExcalidrawWrapper;
export type { ExcalidrawElement, ExcalidrawAppState };
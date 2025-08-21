"use client";
import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { Wand2 } from "lucide-react";

import type { ExcalidrawAPI } from "./escalidraw/excalidraw";
import ExcalidrawWrapper from "./escalidraw/ExcalidrawWrapper";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  AppState as ExcalidrawAppState,
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/types";

// --- Type definitions ---
interface WireframeAppState
  extends Partial<Omit<ExcalidrawAppState, "collaborators">> {
  collaborators?: Map<SocketId, Readonly<Collaborator>> | object;
}
interface WireframeContent {
  elements?: ReadonlyArray<ExcalidrawElement>;
  appState?: WireframeAppState;
}
interface SelectedWireframe {
  id: string;
  name: string;
  content?: WireframeContent | null;
}
interface WireframeEditorPageProps {
  wireframeId: string | null;
  onBack: () => void;
}

// --- Debounce Utility Function ---
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

const WireframeEditorPage: React.FC<WireframeEditorPageProps> = memo(
  ({ wireframeId, onBack }) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [hasMounted, setHasMounted] = useState(false);

    // --- State for Wireframe Data (replacing hooks) ---
    const [selectedWireframe, setSelectedWireframe] = useState<SelectedWireframe | null>(
      wireframeId
        ? {
            id: wireframeId,
            name: "Untitled Wireframe", // Initial name
            content: {
              elements: [], // Initial elements
              appState: { viewBackgroundColor: "#ffffff" }, // Initial app state
            },
          }
        : null
    );

    const [wireframeName, setWireframeName] = useState(selectedWireframe?.name || "");
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        useEffect(() => {
          setHasMounted(true);
        }, []);

    // --- Prepare initialData Prop for Excalidraw ---
    const excalidrawInitialData = useMemo(() => {
      const defaultData: {
        elements: ReadonlyArray<ExcalidrawElement>;
        appState: Partial<ExcalidrawAppState>;
      } = {
        elements: [],
        appState: { collaborators: new Map() },
      };

      if (!selectedWireframe || !selectedWireframe.content) {
        console.log(
          "WireframeEditorPage: No initial content found, using default. [PROMPT]"
        );
        return defaultData;
      }

      const content = selectedWireframe.content;
      const initialAppState = content.appState ?? {};
      const { collaborators: initialCollaborators, ...restInitialAppState } =
        initialAppState;
      const preparedAppState: Partial<ExcalidrawAppState> = {
        ...restInitialAppState,
      };

      if (
        initialCollaborators &&
        typeof initialCollaborators === "object" &&
        !(initialCollaborators instanceof Map)
      ) {
        console.warn(
          "WireframeEditorPage: Initial appState.collaborators was an object. Initializing as empty Map for Excalidraw. [PROMPT]"
        );
        preparedAppState.collaborators = new Map();
      } else if (initialCollaborators instanceof Map) {
        preparedAppState.collaborators = initialCollaborators;
      } else {
        console.log(
          "WireframeEditorPage: Initializing collaborators as empty Map for Excalidraw. [PROMPT]"
        );
        preparedAppState.collaborators = new Map();
      }

      console.log(
        "WireframeEditorPage: Preparing initial data for Excalidraw component. [PROMPT]"
      );
      return {
        elements: content.elements ?? [],
        appState: preparedAppState,
      };
    }, [selectedWireframe]);

    // --- Define onChange Handler from Excalidraw ---
    const handleExcalidrawChange = useCallback(
      (elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState) => {
        if (!selectedWireframe) {
          console.warn("Cannot save: selectedWireframe missing. [PROMPT]");
          return;
        }

        console.log("Excalidraw content changed, preparing update payload for saving... [PROMPT]");

        // *** ADDED: Filter out deleted elements ***
        const filteredElements = elements.filter((element) => !element.isDeleted);

        const appStateForSaving: any = { ...appState };

        if (appStateForSaving.collaborators instanceof Map) {
          console.log(
            "WireframeEditorPage: Converting collaborators Map to Array before saving. [PROMPT]"
          );
          appStateForSaving.collaborators = Array.from(appState.collaborators.values());
        } else {
          console.warn(
            "WireframeEditorPage: collaborators received from Excalidraw was not a Map. Saving as empty array. [PROMPT]"
          );
          appStateForSaving.collaborators = [];
        }

        // Update the local state
        setSelectedWireframe((prev) => ({
          ...prev!,
          content: {
            elements: filteredElements,
            appState: appStateForSaving,
          },
        }));
      },
      [selectedWireframe]
    );

        const persist = useCallback(() => {
            if (!selectedWireframe) return;
            setSelectedWireframe((prev) => ({
                ...prev!,
                name: wireframeName,
            }));
        }, [wireframeName, selectedWireframe]);

         const debouncedPersist = useCallback(() => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                persist();
            }, 500);
        }, [persist]);

    // --- Debounce the Handler ---
    const debouncedHandleChange = useMemo(
      () => debounce(handleExcalidrawChange, 1000),
      [handleExcalidrawChange]
    );

    // --- Back Callback ---
    const editorOnBack = useCallback(() => {
      onBack();
    }, [onBack]);

      const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWireframeName(e.target.value);
        debouncedPersist();
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    // --- Form Submit handler ----
     const handleFormSubmit = async (data: any) => {
      console.log("handleFormSubmit called [PROMPT]");

      try {
           console.log("Data : " + data);
      } catch (error) {
        console.error("Error submitting form: [PROMPT]", error);
      }
    };

    // --- Loading State ---
    if (!hasMounted) {
      return null;
    }

    if (!selectedWireframe) {
        return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", padding: "1rem" }}>
                <p style={{ marginBottom: "1rem" }}>Wireframe not found or is unavailable.</p>
                <button onClick={editorOnBack}>Back</button>
            </div>
        );
    }

    // --- Main Render ---
    console.log({isModalOpen})
    return (
      <div style={{ display: "flex", flex: 1, padding: "0.25rem", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* === Updated Header section === */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexShrink: 0, gap: "0.5rem" }}>
          {/* 1. Back Arrow Button */}
          <button
            aria-label="Back"
            onClick={editorOnBack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Wand2 />
          </button>

          {/* 2. Wireframe Name */}
            <input
                type="text"
                value={wireframeName}
                onChange={handleNameChange}
                placeholder="Wireframe Name"
                style={{ height: "2.25rem", width: "16.25rem", fontSize: "1.125rem", fontWeight: "600", textAlign: "center" }}
            />

          {/* 3. Generate Code Button */}
          <button
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center"
            onClick={handleOpenModal}
            disabled={!excalidrawAPI}
          >
            <Wand2 size={16} className="mr-2" />
            Generate Prompt
          </button>
        </div>

        {/* Container for Excalidraw */}
        <div
          style={{
            flex: 1,
            borderWidth: "0px",
            borderColor: "gray",
            borderRadius: "0.375rem",
            overflow: "hidden",
            position: "relative",
            minHeight: 0,
          }}
        >
          <ExcalidrawWrapper
            initialData={excalidrawInitialData}
            onChange={debouncedHandleChange}
            setApi={setExcalidrawAPI}
            api={excalidrawAPI}
          />
        </div>


      </div>
    );
  }
);

WireframeEditorPage.displayName = "WireframeEditorPage";
export default WireframeEditorPage;
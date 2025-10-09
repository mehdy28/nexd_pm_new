"use client";
import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { Wand2, Loader2 } from "lucide-react";

import type { ExcalidrawAPI } from "./escalidraw/excalidraw";
import ExcalidrawWrapper from "./escalidraw/ExcalidrawWrapper";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  AppState as ExcalidrawAppState,
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/types";

import { useWireframeDetails, useProjectWireframes } from "@/hooks/useWireframes";

// --- Type definitions ---
interface WireframeAppState
  extends Partial<Omit<ExcalidrawAppState, "collaborators">> {
  collaborators?: Map<SocketId, Readonly<Collaborator>> | object;
}
interface WireframeContent {
  elements?: ReadonlyArray<ExcalidrawElement>;
  appState?: WireframeAppState;
}
interface WireframeEditorPageProps {
  wireframeId: string;
  onBack: () => void;
}

// --- Debounce Utility Function with cancel and flush ---
interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisType<T> | null = null;

  const debounced = function executedFunction(this: ThisType<T>, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    const later = () => {
      timeout = null;
      if (lastArgs) { // Only execute if there are pending arguments
        func.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
      }
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  debounced.flush = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
      if (lastArgs) { // Only execute if there are pending arguments
        func.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
      }
    }
  };

  return debounced;
}

const WireframeEditorPage: React.FC<WireframeEditorPageProps> = memo(
  ({ wireframeId, onBack }) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    const { wireframe, loading, error } = useWireframeDetails(wireframeId);

    const { updateWireframe } = useProjectWireframes(wireframe?.project?.id || "temp_project_for_editor");

    const [wireframeName, setWireframeName] = useState(wireframe?.title || "");

    useEffect(() => {
      if (wireframe && wireframe.title !== wireframeName) {
        setWireframeName(wireframe.title);
      }
    }, [wireframe, wireframeName]);

    useEffect(() => {
      setHasMounted(true);
    }, []);

    // --- Save Wireframe Data function for Excalidraw content ---
    const saveWireframeData = useCallback(async (
      elements: ReadonlyArray<ExcalidrawElement>,
      appState: ExcalidrawAppState,
      currentTitle: string
    ) => {
      if (!wireframeId) {
        console.warn("Cannot save: wireframeId is missing. [SENIOR_ENGINEER]");
        return;
      }

      console.log("Saving wireframe data to database... [SENIOR_ENGINEER]");

      const filteredElements = elements.filter((element) => !element.isDeleted);

      const appStateForSaving: any = { ...appState };

      if (appStateForSaving.collaborators instanceof Map) {
        appStateForSaving.collaborators = Array.from(appState.collaborators.values());
      } else {
        appStateForSaving.collaborators = [];
      }

      try {
        await updateWireframe(wireframeId, {
          title: currentTitle,
          data: {
            elements: filteredElements,
            appState: appStateForSaving,
          },
        });
        console.log("Wireframe data saved successfully. [SENIOR_ENGINEER]");
      } catch (err) {
        console.error("Error saving wireframe data: [SENIOR_ENGINEER]", err);
      }
    }, [wireframeId, updateWireframe]);

    // --- Debounced version of saveWireframeData ---
    const debouncedSaveWireframeData = useMemo(
      () => debounce(saveWireframeData, 1500),
      [saveWireframeData]
    );

    // --- Save Wireframe Name function ---
    const saveWireframeName = useCallback(async (id: string, title: string) => {
      try {
        await updateWireframe(id, { title });
        console.log(`Wireframe name updated to "${title}". [SENIOR_ENGINEER]`);
      } catch (err) {
        console.error("Error updating wireframe name: [SENIOR_ENGINEER]", err);
      }
    }, [updateWireframe]);

    // --- Debounced version of saveWireframeName ---
    const debouncedSaveWireframeName = useMemo(
      () => debounce(saveWireframeName, 1000),
      [saveWireframeName]
    );

    // --- Excalidraw onChange Handler ---
    const handleExcalidrawChange = useCallback(
      (elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState) => {
        debouncedSaveWireframeData(elements, appState, wireframeName);
      },
      [debouncedSaveWireframeData, wireframeName]
    );

    // --- Handle Wireframe Name Change Input ---
    const handleNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setWireframeName(newName);
        if (!wireframeId) {
          console.warn("Cannot rename: wireframeId is missing. [SENIOR_ENGINEER]");
          return;
        }
        debouncedSaveWireframeName(wireframeId, newName);
      },
      [wireframeId, debouncedSaveWireframeName]
    );

    // --- Back Callback ---
    const editorOnBack = useCallback(() => {
      // Flush any pending debounced changes before navigating back
      debouncedSaveWireframeData.flush();
      debouncedSaveWireframeName.flush();
      onBack();
    }, [onBack, debouncedSaveWireframeData, debouncedSaveWireframeName]); // Dependencies are correctly ordered now

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
    };

    const excalidrawInitialData = useMemo(() => {
      const defaultData: {
        elements: ReadonlyArray<ExcalidrawElement>;
        appState: Partial<ExcalidrawAppState>;
      } = {
        elements: [],
        appState: { collaborators: new Map(), viewBackgroundColor: "#ffffff" },
      };

      if (loading || !wireframe) {
        return defaultData;
      }

      const content = wireframe.data;
      const elements = content.elements ?? [];
      const appState = content.appState ?? {};

      const preparedAppState: Partial<ExcalidrawAppState> = { ...appState };
      if (Array.isArray(appState.collaborators)) {
        preparedAppState.collaborators = new Map(
          appState.collaborators.map((c: Collaborator) => [c.id, c])
        );
      } else if (!(appState.collaborators instanceof Map)) {
        preparedAppState.collaborators = new Map();
      }

      console.log(
        "WireframeEditorPage: Preparing initial data for Excalidraw component from fetched wireframe. [SENIOR_ENGINEER]"
      );
      return {
        elements: elements,
        appState: preparedAppState,
      };
    }, [wireframe, loading]);

    if (!hasMounted || loading) {
      return (
        <div className="page-scroller grid h-full place-items-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", padding: "1rem" }}>
          <p style={{ marginBottom: "1rem", color: "red" }}>Error loading wireframe: {error.message}</p>
          <button onClick={editorOnBack}>Back</button>
        </div>
      );
    }

    if (!wireframe) {
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", padding: "1rem" }}>
          <p style={{ marginBottom: "1rem" }}>Wireframe not found or is unavailable.</p>
          <button onClick={editorOnBack}>Back</button>
        </div>
      );
    }

    return (
      <div style={{
        display: "flex",
        flex: 1,
        padding: "0.25rem",
        flexDirection: "column",
        height: "87vh",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexShrink: 0, gap: "0.5rem" }}>
          <button
            aria-label="Back"
            onClick={editorOnBack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Wand2 />
          </button>

          <input
            type="text"
            value={wireframeName}
            onChange={handleNameChange}
            placeholder="Wireframe Name"
            style={{ height: "2.25rem", width: "16.25rem", fontSize: "1.125rem", fontWeight: "600", textAlign: "center" }}
          />

          <button
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center"
            onClick={handleOpenModal}
            disabled={!excalidrawAPI}
          >
            <Wand2 size={16} className="mr-2" />
            Generate Prompt
          </button>
        </div>

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
            onChange={handleExcalidrawChange}
            setApi={setExcalidrawAPI}
            api={excalidrawAPI}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>
    );
  }
);

WireframeEditorPage.displayName = "WireframeEditorPage";
export default WireframeEditorPage;
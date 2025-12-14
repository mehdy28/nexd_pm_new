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
import { exportToBlob } from "@excalidraw/excalidraw";

import type { ExcalidrawAPI } from "./escalidraw/excalidraw";
import ExcalidrawWrapper from "./escalidraw/ExcalidrawWrapper";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  AppState as ExcalidrawAppState,
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/types";

import { useWhiteboardDetails, useProjectWhiteboards } from "@/hooks/useWhiteboards";
import { GeneratePromptModal } from "@/components/modals/GeneratePromptModal";

// --- Type definitions ---
interface WhiteboardAppState
  extends Partial<Omit<Omit<ExcalidrawAppState, "collaborators">, "files">> {
  collaborators?: Map<SocketId, Readonly<Collaborator>> | object;
}
interface WhiteboardContent {
  elements?: ReadonlyArray<ExcalidrawElement>;
  appState?: WhiteboardAppState;
}
interface WhiteboardEditorPageProps {
  WhiteboardId: string;
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

const WhiteboardEditorPage: React.FC<WhiteboardEditorPageProps> = memo(
  ({ WhiteboardId, onBack }) => {
    console.log(`LOG: [WhiteboardEditorPage] Rendering with WhiteboardId: ${WhiteboardId}`);
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [WhiteboardImageForModal, setWhiteboardImageForModal] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const canSave = useRef(false);

    const { Whiteboard, loading, error } = useWhiteboardDetails(WhiteboardId);
    console.log(`LOG: [WhiteboardEditorPage] useWhiteboardDetails state:`, { loading, error, Whiteboard: !!Whiteboard });

    const [stableInitialData, setStableInitialData] = useState<{
        elements: ReadonlyArray<ExcalidrawElement>;
        appState: Partial<ExcalidrawAppState>;
    } | null>(null);

    const projectIdRef = useRef<string | undefined | null>(Whiteboard?.project?.id);
    if (Whiteboard && projectIdRef.current === undefined) {
      projectIdRef.current = Whiteboard.project?.id || null;
    }
    
    const { updateWhiteboard } = useProjectWhiteboards(
      projectIdRef.current || undefined
    );

    const [WhiteboardName, setWhiteboardName] = useState("");

    useEffect(() => {
      // Reset the save flag and stable data whenever the Whiteboard ID changes.
      canSave.current = false;
      setStableInitialData(null);
    }, [WhiteboardId]);

    useEffect(() => {
      if (Whiteboard) {
        if (Whiteboard.title !== WhiteboardName) {
            console.log(`LOG: [WhiteboardEditorPage] useEffect syncing WhiteboardName from fetched data. New name: "${Whiteboard.title}"`);
            setWhiteboardName(Whiteboard.title);
        }

        // Only compute and set the initial data ONCE when it first loads.
        if (!stableInitialData) {
            console.log("LOG: [WhiteboardEditorPage] Preparing STABLE initial data for Excalidraw component from fetched Whiteboard.");
            const content = Whiteboard.data;
            const elements = content.elements ?? [];
            const appState = content.appState ?? {};
            const preparedAppState: Partial<ExcalidrawAppState> = { ...appState };
            delete preparedAppState.collaborators;
            setStableInitialData({ elements, appState: preparedAppState });
        }
      }
    }, [Whiteboard]);


    useEffect(() => {
      console.log("LOG: [WhiteboardEditorPage] Component has mounted. Setting hasMounted to true.");
      setHasMounted(true);
    }, []);

    // --- Save Whiteboard Data function for Excalidraw content ---
    const saveWhiteboardData = useCallback(async (
      elements: ReadonlyArray<ExcalidrawElement>,
      appState: ExcalidrawAppState,
      currentTitle: string
    ) => {
      if (!WhiteboardId) {
        console.warn("LOG: [WhiteboardEditorPage] Cannot save: WhiteboardId is missing.");
        return;
      }

      console.log("LOG: [WhiteboardEditorPage] Executing saveWhiteboardData...");

      const filteredElements = elements.filter((element) => !element.isDeleted);

      const appStateToSave: Partial<ExcalidrawAppState> = {};
      const serializableAppStateKeys: (keyof ExcalidrawAppState)[] = [
        "viewBackgroundColor", "currentItemStrokeColor", "currentItemBackgroundColor",
        "currentItemFillStyle", "currentItemStrokeWidth", "currentItemStrokeStyle",
        "currentItemRoughness", "currentItemOpacity", "currentItemFontFamily",
        "currentItemFontSize", "currentItemTextAlign", "currentItemStartArrowhead",
        "currentItemEndArrowhead", "currentItemRoundness", "gridSize", "zoom",
        "scrollX", "scrollY"
      ];
      
      serializableAppStateKeys.forEach(key => {
        if (appState[key] !== undefined) {
          (appStateToSave as any)[key] = appState[key];
        }
      });

      try {
        await updateWhiteboard(WhiteboardId, {
          title: currentTitle,
          data: {
            elements: filteredElements,
            appState: appStateToSave,
          },
        });
        console.log("LOG: [WhiteboardEditorPage] Whiteboard data saved successfully.");
        // After a successful save, disable further saves until the next user interaction.
        // This prevents the re-render caused by the data update from immediately triggering another save.
        canSave.current = false;
      } catch (err) {
        console.error("LOG: [WhiteboardEditorPage] Error saving Whiteboard data:", err);
      }
    }, [WhiteboardId, updateWhiteboard]);

    // --- Debounced version of saveWhiteboardData ---
    const debouncedSaveWhiteboardData = useMemo(
      () => {
        console.log("LOG: [WhiteboardEditorPage] Creating debounced save function for Whiteboard data.");
        return debounce(saveWhiteboardData, 1500);
      },
      [saveWhiteboardData]
    );

    // --- Save Whiteboard Name function ---
    const saveWhiteboardName = useCallback(async (id: string, title: string) => {
      console.log(`LOG: [WhiteboardEditorPage] Executing saveWhiteboardName with title: "${title}"`);
      try {
        await updateWhiteboard(id, { title });
        console.log(`LOG: [WhiteboardEditorPage] Whiteboard name updated to "${title}".`);
      } catch (err) {
        console.error("LOG: [WhiteboardEditorPage] Error updating Whiteboard name:", err);
      }
    }, [updateWhiteboard]);

    // --- Debounced version of saveWhiteboardName ---
    const debouncedSaveWhiteboardName = useMemo(
      () => {
        console.log("LOG: [WhiteboardEditorPage] Creating debounced save function for Whiteboard name.");
        return debounce(saveWhiteboardName, 1000);
      },
      [saveWhiteboardName]
    );

    // --- Excalidraw onChange Handler ---
    const handleExcalidrawChange = useCallback(
      (elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState) => {
        console.log("LOG: [WhiteboardEditorPage] handleExcalidrawChange triggered.");

        if (!canSave.current) {
          console.log("LOG: [WhiteboardEditorPage] Ignoring onChange event: save not enabled yet.");
          return;
        }
        
        debouncedSaveWhiteboardData(elements, appState, WhiteboardName);
      },
      [debouncedSaveWhiteboardData, WhiteboardName]
    );
    
    const handlePointerDown = useCallback(() => {
        if (!canSave.current) {
            console.log("LOG: [WhiteboardEditorPage] First user interaction detected. Enabling save.");
            canSave.current = true;
        }
    }, []);

    // --- Handle Excalidraw API setup ---
    const handleSetApi = useCallback((api: ExcalidrawAPI | null) => {
        setExcalidrawAPI(api);
    }, []);


    // --- Handle Whiteboard Name Change Input ---
    const handleNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        console.log(`LOG: [WhiteboardEditorPage] handleNameChange. New value: "${newName}"`);
        setWhiteboardName(newName);
        if (!WhiteboardId) {
          console.warn("LOG: [WhiteboardEditorPage] Cannot rename: WhiteboardId is missing.");
          return;
        }
        debouncedSaveWhiteboardName(WhiteboardId, newName);
      },
      [WhiteboardId, debouncedSaveWhiteboardName]
    );

    // --- Back Callback ---
    const editorOnBack = useCallback(() => {
      console.log("LOG: [WhiteboardEditorPage] Back button clicked. Flushing pending saves.");
      debouncedSaveWhiteboardData.flush();
      debouncedSaveWhiteboardName.flush();
      onBack();
    }, [onBack, debouncedSaveWhiteboardData, debouncedSaveWhiteboardName]);

    const handleOpenModal = useCallback(async () => {
      if (!excalidrawAPI) {
        console.warn("LOG: [WhiteboardEditorPage] Cannot generate prompt: Excalidraw API not ready.");
        return;
      }
      console.log("LOG: [WhiteboardEditorPage] Generating image for prompt modal using exportToBlob...");
      try {
        const blob = await exportToBlob({
          elements: excalidrawAPI.getSceneElements(),
          appState: {
            ...excalidrawAPI.getAppState(),
            gridSize: null, // Hide grid for cleaner image
            viewBackgroundColor: 'transparent',
          },
          files: excalidrawAPI.getFiles(),
          mimeType: "image/png",
        });

        if (!blob) {
          console.error("LOG: [WhiteboardEditorPage] exportToBlob returned null or undefined.");
          return;
        }

        // Convert Blob to base64 Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setWhiteboardImageForModal(base64data);
          setIsModalOpen(true);
        };
        reader.onerror = (error) => {
          console.error("LOG: [WhiteboardEditorPage] FileReader error:", error);
        };
        reader.readAsDataURL(blob);

      } catch (error) {
        console.error("LOG: [WhiteboardEditorPage] Failed to export Whiteboard to blob:", error);
      }
    }, [excalidrawAPI]);

    const handleCloseModal = useCallback(() => {
      setIsModalOpen(false);
      setWhiteboardImageForModal(null);
    }, []);

    // Render loading state until Whiteboard data is fetched AND stable initial data is set.
    if (!hasMounted || loading || !stableInitialData) {
      console.log("LOG: [WhiteboardEditorPage] Rendering loading state (waiting for stableInitialData).");
      return (
        <div className="page-scroller grid h-full place-items-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      );
    }

    if (error) {
      console.log("LOG: [WhiteboardEditorPage] Rendering error state.", { error });
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", padding: "1rem" }}>
          <p style={{ marginBottom: "1rem", color: "red" }}>Error loading Whiteboard: {error.message}</p>
          <button onClick={editorOnBack}>Back</button>
        </div>
      );
    }

    if (!Whiteboard) {
      console.log("LOG: [WhiteboardEditorPage] Rendering 'not found' state.");
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", padding: "1rem" }}>
          <p style={{ marginBottom: "1rem" }}>Whiteboard not found or is unavailable.</p>
          <button onClick={editorOnBack}>Back</button>
        </div>
      );
    }

    console.log("LOG: [WhiteboardEditorPage] Rendering main editor view.");
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
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center"
            onClick={editorOnBack}
          >
            Return to list
          </button>
          <input
            type="text"
            value={WhiteboardName}
            onChange={handleNameChange}
            placeholder="Whiteboard Name"
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
            initialData={stableInitialData}
            onChange={handleExcalidrawChange}
            onPointerDown={handlePointerDown}
            setApi={handleSetApi}
            api={excalidrawAPI}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
        
        <GeneratePromptModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            WhiteboardImageBase64={WhiteboardImageForModal}
            WhiteboardId={WhiteboardId}
        />
      </div>
    );
  }
);

WhiteboardEditorPage.displayName = "WhiteboardEditorPage";
export default WhiteboardEditorPage;

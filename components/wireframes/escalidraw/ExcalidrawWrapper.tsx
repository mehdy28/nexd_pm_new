"use client"

import type React from "react"
import { memo, useEffect, useCallback, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { ExcalidrawAPI } from "./excalidraw"
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import type { AppState as ExcalidrawAppState } from "@excalidraw/excalidraw/types"
import "@excalidraw/excalidraw/index.css";
import { WelcomeScreen as OriginalWelcomeScreen } from '@excalidraw/excalidraw'; // Import for type





type DynamicWelcomeScreenType = React.ComponentType<{ children?: React.ReactNode }> & {
    Center: typeof OriginalWelcomeScreen.Center & { // Use OriginalWelcomeScreen
        MenuItemLink: typeof OriginalWelcomeScreen.Center.MenuItemLink; // Use OriginalWelcomeScreen
        // Add other sub-components of Center here, like Heading, Logo, etc. if needed
    };
    Hints: typeof OriginalWelcomeScreen.Hints;
    // Add other static properties here (e.g., MenuItem, etc.)
};

type DynamicMainMenuType = React.ComponentType<{ children?: React.ReactNode }> & {
    Item: any; // Replace `any` with a more specific type if possible
    ItemLink: any; // Replace `any` with a more specific type if possible
    ItemCustom: any; // Replace `any` with a more specific type if possible
};



const DynamicExcalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
    {
        ssr: false,
    }
);

interface ExcalidrawWrapperProps {
    initialData?: {
        elements?: ReadonlyArray<ExcalidrawElement>;
        appState?: Partial<ExcalidrawAppState>;
    } | null;
    onChange?: (
        elements: ReadonlyArray<ExcalidrawElement>,
        appState: ExcalidrawAppState
    ) => void;
    setApi: (api: ExcalidrawAPI | null) => void;
    api: ExcalidrawAPI | null;
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = memo(({
    initialData,
    onChange,
    setApi,
    api
}) => {
    console.log("[WelcomeScreen] ExcalidrawWrapper: Rendering");
    const [dynamicWelcomeScreenReady, setDynamicWelcomeScreenReady] = useState(false);
    const initialDataRef = useRef(initialData);
    const [DynamicWelcomeScreenComponent, setDynamicWelcomeScreenComponent] = useState<DynamicWelcomeScreenType | null>(null);

    const [dynamicMainMenuReady, setDynamicMainMenuReady] = useState(false);
    const [DynamicMainMenuComponent, setDynamicMainMenuComponent] = useState<DynamicMainMenuType | null>(null);

    useEffect(() => {
        let isMounted = true; // Track component mount status

        const loadWelcomeScreen = async () => {
            console.log("[WelcomeScreen] DynamicWelcomeScreen: Importing WelcomeScreen");
            const { WelcomeScreen } = await import('@excalidraw/excalidraw');

            if (!isMounted) return; // Prevent state updates on unmounted component

            const DynamicComponent = WelcomeScreen as any;
            DynamicComponent.Center = WelcomeScreen.Center;
            DynamicComponent.Hints = WelcomeScreen.Hints;

            console.log("[WelcomeScreen] DynamicWelcomeScreen: DynamicComponent.Center", DynamicComponent.Center);
            console.log("[WelcomeScreen] DynamicWelcomeScreen: WelcomeScreen imported and properties copied");

            setDynamicWelcomeScreenComponent(() => DynamicComponent); // Set the component
            setDynamicWelcomeScreenReady(true);
        };

        loadWelcomeScreen();

        return () => {
            isMounted = false; // Set mount status to false on unmount
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadMainMenu = async () => {
            const { MainMenu } = await import('@excalidraw/excalidraw');

            if (!isMounted) return;

            //You can adjust here to copy sub-properties of MenuItems if needed.
            const DynamicComponent = MainMenu as any;
            DynamicComponent.Item = MainMenu.Item;
            DynamicComponent.ItemLink = MainMenu.ItemLink;
            DynamicComponent.ItemCustom = MainMenu.ItemCustom;

            setDynamicMainMenuComponent(() => DynamicComponent);
            setDynamicMainMenuReady(true);
        };

        loadMainMenu();

        return () => {
            isMounted = false;
        };
    }, []);

    const onLoadLib = useCallback(async (signal: AbortSignal) => {
        if (!api) {
            console.log("[WelcomeScreen] ExcalidrawWrapper: API not ready for library load.");
            return;
        }
        console.log("[WelcomeScreen] ExcalidrawWrapper: API ready, attempting to load library.");
        try {
            const response = await fetch('/libraries/mehhdy.excalidrawlib', { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch library: ${response.status} ${response.statusText}`);
            }
            const libraryData = await response.json();

            if (api && typeof api.updateLibrary === 'function') {
                console.log("[WelcomeScreen] ExcalidrawWrapper: Updating library...");
                api.updateLibrary({
                    libraryItems: libraryData.libraryItems,
                });
                console.log("[WelcomeScreen] ExcalidrawWrapper: Library updated.");
            } else {
                console.warn("[WelcomeScreen] ExcalidrawWrapper: updateLibrary function not available on API.");
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("[WelcomeScreen] ExcalidrawWrapper: Fetch aborted.");
            } else {
              console.error("[WelcomeScreen] ExcalidrawWrapper: Error loading library:", error);
            }
        }
    }, [api]);

    useEffect(() => {
        if (!api) return;

        const abortController = new AbortController();

        const loadLibrary = async () => {
            await onLoadLib(abortController.signal);
        };

        loadLibrary();

        return () => {
            abortController.abort(); // Cancel the fetch request
        };
    }, [api, onLoadLib]);

    useEffect(() => {
        if (api && initialData !== initialDataRef.current) {
            console.log("[WelcomeScreen] ExcalidrawWrapper: initialData prop changed, updating scene.");
            const elements = initialData?.elements ?? [];
            const appState = initialData?.appState ?? {};

            api.updateScene({
                elements: elements,
                appState: appState,
            });
            initialDataRef.current = initialData;
            console.log("[WelcomeScreen] ExcalidrawWrapper: Scene updated with new initialData.");
        }
    }, [api, initialData]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
            <div style={{ flexGrow: 1, position: "relative" }}>
                <DynamicExcalidraw
                    excalidrawAPI={(apiInstance) => setApi(apiInstance)}
                    initialData={initialDataRef.current}
                    onChange={onChange}
                    UIOptions={{ canvasActions: { loadScene: false } }}
                >
                   {dynamicMainMenuReady && DynamicMainMenuComponent ? (
                        <DynamicMainMenuComponent>
                            <DynamicMainMenuComponent.Item
                                onSelect={() => {
                                    alert("Custom Item 1 Clicked!");
                                }}
                            >
                                Custom Item 1
                            </DynamicMainMenuComponent.Item>
                            <DynamicMainMenuComponent.ItemLink
                                href="https://youtu.be/dQw4w9WgXcQ"
                            >
                                Example Link
                            </DynamicMainMenuComponent.ItemLink>
                            <DynamicMainMenuComponent.ItemCustom>
                                <button onClick={() => alert("Custom Button Clicked!")}>
                                    Custom Button
                                </button>
                            </DynamicMainMenuComponent.ItemCustom>
                        </DynamicMainMenuComponent>
                    ) : (
                        <div>Loading Main Menu...</div>
                    )}
                    {dynamicWelcomeScreenReady && DynamicWelcomeScreenComponent ? (
                        <DynamicWelcomeScreenComponent>
                            <DynamicWelcomeScreenComponent.Center>

                                 <DynamicWelcomeScreenComponent.Center.Heading>
                                    One Piece 3amek!
                                </DynamicWelcomeScreenComponent.Center.Heading>
                                <DynamicWelcomeScreenComponent.Center.MenuItemLink href="https://youtu.be/dQw4w9WgXcQ">
                                    Click Me :D
                                </DynamicWelcomeScreenComponent.Center.MenuItemLink>
                            </DynamicWelcomeScreenComponent.Center>
                        </DynamicWelcomeScreenComponent>
                    ) : (
                        <div>Loading Welcome Screen...</div>
                    )}
                </DynamicExcalidraw>
            </div>
        </div>
    );
});

ExcalidrawWrapper.displayName = 'ExcalidrawWrapper';

export default ExcalidrawWrapper;

export type { ExcalidrawElement, ExcalidrawAppState };
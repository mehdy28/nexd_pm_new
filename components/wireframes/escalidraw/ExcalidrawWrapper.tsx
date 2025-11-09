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
    () => {
        console.log("LOG: [ExcalidrawWrapper] next/dynamic is importing @excalidraw/excalidraw");
        return import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw)
    },
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
    console.log("LOG: [ExcalidrawWrapper] Rendering component.", { hasApi: !!api, hasInitialData: !!initialData });
    const [dynamicWelcomeScreenReady, setDynamicWelcomeScreenReady] = useState(false);
    const initialDataRef = useRef(initialData);
    const [DynamicWelcomeScreenComponent, setDynamicWelcomeScreenComponent] = useState<DynamicWelcomeScreenType | null>(null);

    const [dynamicMainMenuReady, setDynamicMainMenuReady] = useState(false);
    const [DynamicMainMenuComponent, setDynamicMainMenuComponent] = useState<DynamicMainMenuType | null>(null);

    useEffect(() => {
        let isMounted = true; // Track component mount status
        console.log("LOG: [ExcalidrawWrapper] useEffect for WelcomeScreen loading triggered.");

        const loadWelcomeScreen = async () => {
            console.log("LOG: [ExcalidrawWrapper] Importing WelcomeScreen component...");
            try {
                const { WelcomeScreen } = await import('@excalidraw/excalidraw');

                if (!isMounted) {
                    console.log("LOG: [ExcalidrawWrapper] WelcomeScreen import finished, but component unmounted. Aborting state update.");
                    return;
                }

                const DynamicComponent = WelcomeScreen as any;
                DynamicComponent.Center = WelcomeScreen.Center;
                DynamicComponent.Hints = WelcomeScreen.Hints;

                console.log("LOG: [ExcalidrawWrapper] WelcomeScreen imported successfully. Setting state.");

                setDynamicWelcomeScreenComponent(() => DynamicComponent); // Set the component
                setDynamicWelcomeScreenReady(true);
            } catch (e) {
                console.error("LOG: [ExcalidrawWrapper] Failed to import WelcomeScreen:", e);
            }
        };

        loadWelcomeScreen();

        return () => {
            console.log("LOG: [ExcalidrawWrapper] Cleanup for WelcomeScreen useEffect.");
            isMounted = false; // Set mount status to false on unmount
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        console.log("LOG: [ExcalidrawWrapper] useEffect for MainMenu loading triggered.");

        const loadMainMenu = async () => {
            console.log("LOG: [ExcalidrawWrapper] Importing MainMenu component...");
            try {
                const { MainMenu } = await import('@excalidraw/excalidraw');

                if (!isMounted) {
                    console.log("LOG: [ExcalidrawWrapper] MainMenu import finished, but component unmounted. Aborting state update.");
                    return;
                }

                //You can adjust here to copy sub-properties of MenuItems if needed.
                const DynamicComponent = MainMenu as any;
                DynamicComponent.Item = MainMenu.Item;
                DynamicComponent.ItemLink = MainMenu.ItemLink;
                DynamicComponent.ItemCustom = MainMenu.ItemCustom;

                console.log("LOG: [ExcalidrawWrapper] MainMenu imported successfully. Setting state.");
                setDynamicMainMenuComponent(() => DynamicComponent);
                setDynamicMainMenuReady(true);
            } catch (e) {
                console.error("LOG: [ExcalidrawWrapper] Failed to import MainMenu:", e);
            }
        };

        loadMainMenu();

        return () => {
            console.log("LOG: [ExcalidrawWrapper] Cleanup for MainMenu useEffect.");
            isMounted = false;
        };
    }, []);

    const onLoadLib = useCallback(async (signal: AbortSignal) => {
        if (!api) {
            console.warn("LOG: [ExcalidrawWrapper] onLoadLib called, but API is not ready.");
            return;
        }
        console.log("LOG: [ExcalidrawWrapper] onLoadLib: API ready, attempting to fetch library.");
        try {
            const response = await fetch('/libraries/mehhdy.excalidrawlib', { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch library: ${response.status} ${response.statusText}`);
            }
            const libraryData = await response.json();

            if (api && typeof api.updateLibrary === 'function') {
                console.log("LOG: [ExcalidrawWrapper] onLoadLib: Calling api.updateLibrary...");
                api.updateLibrary({
                    libraryItems: libraryData.libraryItems,
                });
                console.log("LOG: [ExcalidrawWrapper] onLoadLib: Library updated successfully.");
            } else {
                console.warn("LOG: [ExcalidrawWrapper] onLoadLib: updateLibrary function not available on API.");
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log("LOG: [ExcalidrawWrapper] onLoadLib: Fetch aborted.");
            } else {
              console.error("LOG: [ExcalidrawWrapper] onLoadLib: Error loading library:", error);
            }
        }
    }, [api]);

    useEffect(() => {
        if (!api) {
            console.log("LOG: [ExcalidrawWrapper] useEffect for library loading: waiting for API.");
            return;
        }
        console.log("LOG: [ExcalidrawWrapper] useEffect for library loading: API is available. Firing onLoadLib.");

        const abortController = new AbortController();

        onLoadLib(abortController.signal);

        return () => {
            console.log("LOG: [ExcalidrawWrapper] Cleanup for library loading useEffect. Aborting fetch.");
            abortController.abort(); // Cancel the fetch request
        };
    }, [api, onLoadLib]);

    useEffect(() => {
        if (api && initialData !== initialDataRef.current) {
            console.log("LOG: [ExcalidrawWrapper] useEffect detected initialData prop change. Updating scene.");
            const elements = initialData?.elements ?? [];
            const appState = initialData?.appState ?? {};

            api.updateScene({
                elements: elements,
                appState: appState,
            });
            initialDataRef.current = initialData;
            console.log("LOG: [ExcalidrawWrapper] Scene updated with new initialData.");
        }
    }, [api, initialData]);

    const handleSetApi = useCallback((apiInstance: ExcalidrawAPI | null) => {
        console.log(`LOG: [ExcalidrawWrapper] excalidrawAPI callback fired. API is ${apiInstance ? 'available' : 'null'}.`);
        setApi(apiInstance);
    }, [setApi]);

    const handleOnChange = useCallback((elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState) => {
        console.log("LOG: [ExcalidrawWrapper] onChange from Excalidraw triggered.");
        if (onChange) {
            onChange(elements, appState);
        }
    }, [onChange]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
            <div style={{ flexGrow: 1, position: "relative" }}>
                <DynamicExcalidraw
                    excalidrawAPI={handleSetApi}
                    initialData={initialDataRef.current}
                    onChange={handleOnChange}
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
                        <div>{console.log("LOG: [ExcalidrawWrapper] Rendering 'Loading Main Menu...'")}Loading Main Menu...</div>
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
                        <div>{console.log("LOG: [ExcalidrawWrapper] Rendering 'Loading Welcome Screen...'")}Loading Welcome Screen...</div>
                    )}
                </DynamicExcalidraw>
            </div>
        </div>
    );
});

ExcalidrawWrapper.displayName = 'ExcalidrawWrapper';

export default ExcalidrawWrapper;

export type { ExcalidrawElement, ExcalidrawAppState };
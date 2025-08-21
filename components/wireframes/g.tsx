"use client";
import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  Flex,
  Heading,
  Text,
  Button,
  IconButton, // Added
} from "src/components/ui/atoms";
import { ArrowBackIcon, useDisclosure, useToast } from "@chakra-ui/icons"; // Added
import { Spinner, Box } from "@chakra-ui/react";
import { useWireframeCommands } from "src/store/app/wireframes/hooks/wireframeCommands";
import { useWireframeByIdQuery } from "src/hooks/wireframes/useWireframesQuery";
import { useSelectedWireframe } from "src/store/app/wireframes/hooks/useWireframe";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  AppState as ExcalidrawAppState,
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/types";
import { Wand2 } from "lucide-react";
import { usePromptCommands } from "@/store/app/prompt/hook/usePromptCommand";

// Assuming the ExcalidrawAPI type is correctly exported from your wrapper or its source
// Adjust the path if your ExcalidrawAPI type definition is elsewhere
import type { ExcalidrawAPI } from "./escalidraw/excalidraw";

import ExcalidrawWrapper from "./escalidraw/ExcalidrawWrapper";
// Import the modal component - Adjust path if necessary
import EnhancedPromptForm from "./escalidraw/PromptForm";

// --- Debounce Utility Function ---
// (Make sure this function exists and is correctly implemented)
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
  //useGraphQLPrompts: any; // No longer used
  teammateId: string | null; // Added teammateId prop
}

const WireframeEditorPage: React.FC<WireframeEditorPageProps> = memo(
  ({ wireframeId, onBack, teammateId }) => { // Removed useGraphQLPrompts and added teammateId prop
    // --- State for Excalidraw API ---
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
    // --- State for Modal ---
    const {
      isOpen: isModalOpen,
      onOpen: onModalOpen,
      onClose: onModalClose,
    } = useDisclosure();
    const [editingPrompt, setEditingPrompt] = useState<any>(null);

    const toast = useToast();

    // --- Existing Hooks ---
    const selectedWireframe = useSelectedWireframe() as SelectedWireframe | null;
    const { updateWireframe } = useWireframeCommands();
    const { loading, error } = useWireframeByIdQuery(wireframeId);
    const [hasMounted, setHasMounted] = useState(false);
    const { createPrompt } = usePromptCommands(); // Get the createPrompt function

        useEffect(() => {
          setHasMounted(true);
        }, []);

    //Move here - NO LONGER NEEDED
    // const [promptFunctions, setPromptFunctions] = useState<{ createPrompt: any } | null>(null);
    // const [isPromptFunctionsLoading, setIsPromptFunctionsLoading] = useState(true);

      //Move here
        //  useEffect(() => {
        //     let isMounted = true; // Add this line
        //     const initializePrompts = async () => {
        //         try {
        //             if (!isMounted) return;
        //             const { createPrompt } = useGraphQLPrompts("teammate");
        //             setPromptFunctions({ createPrompt });
        //             console.log("promptFunctions in useEffect [PROMPT]",{createPrompt})
        //         } catch (error) {
        //             console.error("Error initializing prompt functions: [PROMPT]", error);
        //         } finally {
        //             setIsPromptFunctionsLoading(false);
        //         }
        //     };

        //     initializePrompts();
        //     return () => {
        //         isMounted = false; // And this line
        //     };
        // }, [useGraphQLPrompts]);
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

    const handleFormSubmit = async (data: any) => {
      console.log("handleFormSubmit called [PROMPT]");

      try {
          if (!teammateId) {
              console.error("Teammate ID is required to create a prompt.");
              toast({
                  title: "Teammate ID is required",
                  description: "Please ensure you are logged in.",
                  status: "error",
                  duration: 5000,
                  isClosable: true,
              });
              return;
          }
          //Adjust input
          await createPrompt(data, teammateId); // Use createPrompt directly
          toast({
              title: "Prompt created.",
              status: "success",
              duration: 3000,
              isClosable: true,
          });
      } catch (error) {
          console.error("Error submitting form: [PROMPT]", error);
          toast({
              title: "Error submitting form.",
              status: "error",
              duration: 5000,
              isClosable: true,
          });
      }
    };

    // --- Define onChange Handler from Excalidraw ---
    const handleExcalidrawChange = useCallback(
      (elements: ReadonlyArray<ExcalidrawElement>, appState: ExcalidrawAppState) => {
        if (!wireframeId || !selectedWireframe) {
          console.warn("Cannot save: wireframeId or selectedWireframe missing. [PROMPT]");
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

        const currentId = wireframeId;
        const currentName = selectedWireframe.name || "Untitled Wireframe";
        const currentContent = {
          elements: filteredElements, // Use the filtered elements
          appState: appStateForSaving,
        };

        updateWireframe(currentId, currentName, currentContent);
      },
      [wireframeId, updateWireframe, selectedWireframe]
    );

    // --- Debounce the Handler ---
    const debouncedHandleChange = useMemo(
      () => debounce(handleExcalidrawChange, 1000),
      [handleExcalidrawChange]
    );

    // --- Back Callback ---
    const editorOnBack = useCallback(() => {
      onBack();
    }, [onBack]);

    // --- Loading State ---
          if (loading || !selectedWireframe) {
            return (
                <Flex justify="center" align="center" h="full" flex={1}>
                    <Spinner size="xl" />
                </Flex>
            );
        }

        if (!hasMounted) {
          return null; // Or a loading indicator
        }

    // --- Error State ---
    if (error) {
      return (
        <Flex direction="column" justify="center" align="center" h="full" flex={1} p={4}>
          <Text color="red.500" mb={4}>
            Error loading wireframe: {error.message}
          </Text>
          {/* Keep original button here or use IconButton like in main render */}
          <Button onClick={editorOnBack}>Back</Button>
        </Flex>
      );
    }

    // --- Wireframe Not Found State ---
    if (!selectedWireframe) {
      return (
        <Flex direction="column" justify="center" align="center" h="full" flex={1} p={4}>
          <Text mb={4}>Wireframe not found or is unavailable.</Text>
          {/* Keep original button here or use IconButton like in main render */}
          <Button onClick={editorOnBack}>Back</Button>
        </Flex>
      );
    }

    // --- Main Render ---
    console.log({isModalOpen})
    return (
      <Flex flex={1} p={1} flexDirection="column" h="full" overflow="hidden">
        {/* === Updated Header section === */}
        <Flex justify="space-between" align="center" mb={4} flexShrink={0} gap={3}>
          {/* 1. Back Arrow Button */}
          <IconButton
            aria-label="Back"
            icon={<ArrowBackIcon />}
            onClick={editorOnBack}
            variant="ghost" // Optional style
            size="lg" // Optional size adjustment
          />

          {/* 2. Wireframe Name */}
          <Heading
            size="lg"
            noOfLines={1}
            title={selectedWireframe.name}
            textAlign="center" // Optional alignment
            flexGrow={1} // Allows it to take available space
            mx={2} // Margin on sides
          >
            {selectedWireframe.name}
          </Heading>

          {/* 3. Generate Code Button */}
          <Button
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center"
            onClick={() =>{
              console.log("onModalOpen called [PROMPT]");
              onModalOpen()
            }} // Use modal control from this component
            isDisabled={!excalidrawAPI} // Disable based on API state here
            //minW="140px" // Give button reasonable width
            // size="md" // Optional size adjustment
          >
            <Wand2 size={16} className="mr-2" />
            Generate Prompt
          </Button>
        </Flex>

        {/* Container for Excalidraw */}
        <Box
          flex={1}
          borderWidth="0px"
          borderColor="gray.200"
          borderRadius="md"
          overflow="hidden"
          position="relative"
          minH={0} // Important for flex layout
        >
          <ExcalidrawWrapper
            initialData={excalidrawInitialData}
            onChange={debouncedHandleChange}
            // --- Pass the setter function and API state down ---
            setApi={setExcalidrawAPI}
            api={excalidrawAPI}
          />
        </Box>

        {/* Render the Modal controlled by this component's state */}
        {/* Ensure CodeGenerationModal accepts these props */}
        {console.log({ excalidrawAPI, createPrompt })}
        {excalidrawAPI && (
          <EnhancedPromptForm
            isOpen={isModalOpen}
            onClose={onModalClose}
            onSubmit={handleFormSubmit}
            type="USER"
            api={excalidrawAPI} // Pass the API state
            createPrompt={createPrompt} // Pass the createPrompt function
          />
        )}
      </Flex>
    );
  }
);

WireframeEditorPage.displayName = "WireframeEditorPage";
export default WireframeEditorPage;
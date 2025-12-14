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
import { useWhiteboardCommands } from "src/store/app/Whiteboards/hooks/WhiteboardCommands";
import { useWhiteboardByIdQuery } from "src/hooks/Whiteboards/useWhiteboardsQuery";
import { useSelectedWhiteboard } from "src/store/app/Whiteboards/hooks/useWhiteboard";
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
interface WhiteboardAppState
  extends Partial<Omit<ExcalidrawAppState, "collaborators">> {
  collaborators?: Map<SocketId, Readonly<Collaborator>> | object;
}
interface WhiteboardContent {
  elements?: ReadonlyArray<ExcalidrawElement>;
  appState?: WhiteboardAppState;
}
interface SelectedWhiteboard {
  id: string;
  name: string;
  content?: WhiteboardContent | null;
}
interface WhiteboardEditorPageProps {
  WhiteboardId: string | null;
  onBack: () => void;
  //useGraphQLPrompts: any; // No longer used
  teammateId: string | null; // Added teammateId prop
}

const WhiteboardEditorPage: React.FC<WhiteboardEditorPageProps> = memo(
  ({ WhiteboardId, onBack, teammateId }) => { // Removed useGraphQLPrompts and added teammateId prop
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
    const selectedWhiteboard = useSelectedWhiteboard() as SelectedWhiteboard | null;
    const { updateWhiteboard } = useWhiteboardCommands();
    const { loading, error } = useWhiteboardByIdQuery(WhiteboardId);
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

      if (!selectedWhiteboard || !selectedWhiteboard.content) {
        console.log(
          "WhiteboardEditorPage: No initial content found, using default. [PROMPT]"
        );
        return defaultData;
      }

      const content = selectedWhiteboard.content;
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
          "WhiteboardEditorPage: Initial appState.collaborators was an object. Initializing as empty Map for Excalidraw. [PROMPT]"
        );
        preparedAppState.collaborators = new Map();
      } else if (initialCollaborators instanceof Map) {
        preparedAppState.collaborators = initialCollaborators;
      } else {
        console.log(
          "WhiteboardEditorPage: Initializing collaborators as empty Map for Excalidraw. [PROMPT]"
        );
        preparedAppState.collaborators = new Map();
      }

      console.log(
        "WhiteboardEditorPage: Preparing initial data for Excalidraw component. [PROMPT]"
      );
      return {
        elements: content.elements ?? [],
        appState: preparedAppState,
      };
    }, [selectedWhiteboard]);

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
        if (!WhiteboardId || !selectedWhiteboard) {
          console.warn("Cannot save: WhiteboardId or selectedWhiteboard missing. [PROMPT]");
          return;
        }

        console.log("Excalidraw content changed, preparing update payload for saving... [PROMPT]");

        // *** ADDED: Filter out deleted elements ***
        const filteredElements = elements.filter((element) => !element.isDeleted);

        const appStateForSaving: any = { ...appState };

        if (appStateForSaving.collaborators instanceof Map) {
          console.log(
            "WhiteboardEditorPage: Converting collaborators Map to Array before saving. [PROMPT]"
          );
          appStateForSaving.collaborators = Array.from(appState.collaborators.values());
        } else {
          console.warn(
            "WhiteboardEditorPage: collaborators received from Excalidraw was not a Map. Saving as empty array. [PROMPT]"
          );
          appStateForSaving.collaborators = [];
        }

        const currentId = WhiteboardId;
        const currentName = selectedWhiteboard.name || "Untitled Whiteboard";
        const currentContent = {
          elements: filteredElements, // Use the filtered elements
          appState: appStateForSaving,
        };

        updateWhiteboard(currentId, currentName, currentContent);
      },
      [WhiteboardId, updateWhiteboard, selectedWhiteboard]
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
          if (loading || !selectedWhiteboard) {
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
            Error loading Whiteboard: {error.message}
          </Text>
          {/* Keep original button here or use IconButton like in main render */}
          <Button onClick={editorOnBack}>Back</Button>
        </Flex>
      );
    }

    // --- Whiteboard Not Found State ---
    if (!selectedWhiteboard) {
      return (
        <Flex direction="column" justify="center" align="center" h="full" flex={1} p={4}>
          <Text mb={4}>Whiteboard not found or is unavailable.</Text>
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

          {/* 2. Whiteboard Name */}
          <Heading
            size="lg"
            noOfLines={1}
            title={selectedWhiteboard.name}
            textAlign="center" // Optional alignment
            flexGrow={1} // Allows it to take available space
            mx={2} // Margin on sides
          >
            {selectedWhiteboard.name}
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

WhiteboardEditorPage.displayName = "WhiteboardEditorPage";
export default WhiteboardEditorPage;
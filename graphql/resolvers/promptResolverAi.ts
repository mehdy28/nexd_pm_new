import { GoogleGenerativeAI } from "@google/generative-ai";
import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";
import { WIREFRAME_TO_PROMPT_INSTRUCTIONS,ENHANCE_PROMPT_INSTRUCTIONS } from "@/lib/ai/instructions";

// Define context shape based on your setup
interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

// Ensure the API key is available
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");


// Function to convert image data from base64 to a format the API understands
function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

// Define the shape of the input for createPromptFromWireframe
interface CreatePromptFromWireframeInput {
  wireframeId: string;
  title: string;
  content?: { type: string; value: string; order: number }[];
  context?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  model?: string;
  variables?: any;
  versions?: any;
}

const promptResolversAi = {
  Mutation: {
    generatePromptFromWireframe: async (
      _parent: any,
      { input }: { input: { imageBase64: string; context: string } },
      context: GraphQLContext
    ) => {
      // 1. Authentication Check
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { imageBase64, context: userContext } = input;

      // 2. Input Validation
      if (!imageBase64 || !userContext) {
        throw new GraphQLError("Image data and context are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // 3. Process Image
      const base64Data = imageBase64.split(",")[1];
      if (!base64Data) {
        throw new GraphQLError("Invalid image format. Expected base64 data URL.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        // 4. Interact with Generative AI Model - Use the versioned model name for vision
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const fullPrompt = `${WIREFRAME_TO_PROMPT_INSTRUCTIONS}
    
    User-provided context:
    "${userContext}"
    
    Begin generating the prompt based on the instructions and the provided wireframe image.`;

        const imagePart = fileToGenerativePart(base64Data, "image/png");

        const result = await model.generateContent([fullPrompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // 5. Return Result
        return text;
      } catch (error: any) {
        console.error("Error in generatePromptFromWireframe resolver:", error);

        // Log more specific details if available
        if (error.response) {
          console.error("Google AI API Response Error:", error.response.data);
        }

        throw new GraphQLError("Failed to generate prompt content from AI service.", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            serviceError: error.message,
          },
        });
      }
    },

    createPromptFromWireframe: async (
      _parent: any,
      { input }: { input: CreatePromptFromWireframeInput },
      context: GraphQLContext
    ) => {
      // 1. Authentication Check
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { wireframeId, content, ...promptData } = input;

      // 2. Input Validation
      if (!wireframeId || !promptData.title) {
        throw new GraphQLError("Wireframe ID and title are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        // 3. Find the wireframe to get its project ID (if any)
        const wireframe = await prisma.wireframe.findUnique({
          where: {
            id: wireframeId,
          },
          select: {
            projectId: true,
            userId: true,
          },
        });

        // 4. Handle Wireframe Not Found
        if (!wireframe) {
          throw new GraphQLError("Wireframe not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (wireframe.userId && wireframe.userId !== context.user.id) {
          throw new GraphQLError("You are not authorized to create a prompt from this wireframe.", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        // 5. Prepare data for prompt creation
        const dataToCreate: any = {
          ...promptData,
          wireframeId: wireframeId,
          userId: context.user.id,
        };

        // 6. Conditionally add projectId if the wireframe is part of a project
        if (wireframe.projectId) {
          dataToCreate.projectId = wireframe.projectId;
        }

        // 7. Use Prisma's nested create syntax for relational content blocks
        if (content && content.length > 0) {
          dataToCreate.content = {
            create: content.map((block) => ({
              type: block.type,
              value: block.value,
              order: block.order,
            })),
          };
        }

        // 8. Create the prompt in the database
        const newPrompt = await prisma.prompt.create({
          data: dataToCreate,
          include: {
            content: true,
          },
        });

        // 9. Return the newly created prompt
        return newPrompt;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error("Error creating prompt from wireframe:", error);
        throw new GraphQLError("Could not create the prompt.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    
    updatePromptAiEnhancedContent: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string; content: string } },
      context: GraphQLContext
    ) => {
      // 1. Authentication Check
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
    
      const { promptId, versionId, content } = input;
    
      // 2. Input Validation
      if (!promptId || !versionId || !content) {
        throw new GraphQLError("Prompt ID, version ID, and content are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
    
      // 3. Verify Prompt and Version Existence
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
      });
    
      if (!prompt) {
        throw new GraphQLError("Prompt not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
    
      const versions = prompt.versions as any[];
      const versionIndex = versions.findIndex(v => v.id === versionId);
    
      if (versionIndex === -1) {
        throw new GraphQLError("Version not found for this prompt.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
    
      // 4. Interact with Generative AI for Text Enhancement
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
        const fullPromptForAI = `${ENHANCE_PROMPT_INSTRUCTIONS}
    
    User's original prompt:
    "${content}"
    
    Now, generate the enhanced version.`;
    
        const result = await model.generateContent(fullPromptForAI);
        const response = await result.response;
        const enhancedText = response.text();
    
        // 5. Update the specific version within the versions array
        const updatedVersions = [...versions];
        updatedVersions[versionIndex] = {
          ...updatedVersions[versionIndex],
          aiEnhancedContent: enhancedText,
        };
    
        // 6. Save the updated versions array back to the database
        await prisma.prompt.update({
          where: { id: promptId },
          data: {
            versions: updatedVersions,
            updatedAt: new Date(),
          },
        });
    
        // 7. Return the new enhanced text
        return enhancedText;
    
      } catch (error: any) {
        console.error("Error in updatePromptAiEnhancedContent resolver:", error);
        throw new GraphQLError("Failed to enhance prompt content with AI service.", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            serviceError: error.message,
          },
        });
      }
    },
  },
};

export default promptResolversAi;











//graphql/resolvers/promptResolverAi.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";
import { WIREFRAME_TO_PROMPT_INSTRUCTIONS,ENHANCE_PROMPT_INSTRUCTIONS } from "@/lib/ai/instructions";

// Define context shape based on your setup
interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

// Ensure the API key is available
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");


// Function to convert image data from base64 to a format the API understands
function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

// Define the shape of the input for createPromptFromWireframe
// Relying on CreatePromptFromWireframeInput defined in schema.graphql (which includes versions)
interface ContentBlockInput {
  type: string;
  value?: string;
  varId?: string;
  placeholder?: string;
  name?: string;
  order: number;
}
interface PromptVariableInput {
  id?: string;
  name: string;
  placeholder: string;
  description?: string;
  type: string; // Assuming PromptVariableType enum maps to string
  defaultValue?: string;
  source?: any; // Assuming PromptVariableSourceInput maps to JSON/any
}
interface CreateVersionInput {
  content?: ContentBlockInput[];
  context: string;
  variables?: PromptVariableInput[];
  notes?: string;
  description?: string;
}

interface CreatePromptFromWireframeInput {
  wireframeId: string;
  title: string;
  context?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  model?: string;
  variables?: PromptVariableInput[];
  content?: ContentBlockInput[]; // Kept for backward compatibility parsing in the component, but structure suggests we should use 'versions'
  versions?: CreateVersionInput[];
}

const promptResolversAi = {
  Mutation: {
    generatePromptFromWireframe: async (
      _parent: any,
      { input }: { input: { imageBase64: string; context: string } },
      context: GraphQLContext
    ) => {
      // 1. Authentication Check
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { imageBase64, context: userContext } = input;

      // 2. Input Validation
      if (!imageBase64 || !userContext) {
        throw new GraphQLError("Image data and context are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // 3. Process Image
      const base64Data = imageBase64.split(",")[1];
      if (!base64Data) {
        throw new GraphQLError("Invalid image format. Expected base64 data URL.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        // 4. Interact with Generative AI Model - Use the versioned model name for vision
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const fullPrompt = `${WIREFRAME_TO_PROMPT_INSTRUCTIONS}
    
    User-provided context:
    "${userContext}"
    
    Begin generating the prompt based on the instructions and the provided wireframe image.`;

        const imagePart = fileToGenerativePart(base64Data, "image/png");

        const result = await model.generateContent([fullPrompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // 5. Return Result
        return text;
      } catch (error: any) {
        console.error("Error in generatePromptFromWireframe resolver:", error);

        // Log more specific details if available
        if (error.response) {
          console.error("Google AI API Response Error:", error.response.data);
        }

        throw new GraphQLError("Failed to generate prompt content from AI service.", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            serviceError: error.message,
          },
        });
      }
    },

    createPromptFromWireframe: async (
      _parent: any,
      { input }: { input: CreatePromptFromWireframeInput },
      context: GraphQLContext
    ) => {
      // 1. Authentication Check
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { wireframeId, content, context: versionContext, variables: versionVariables, ...promptData } = input;

      // 2. Input Validation
      if (!wireframeId || !promptData.title) {
        throw new GraphQLError("Wireframe ID and title are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // 3. Normalize version data (Handle content/context/variables passed outside of the 'versions' array for simplicity)
      let initialVersion: CreateVersionInput;
      
      if (input.versions && input.versions.length > 0) {
        initialVersion = input.versions[0];
      } else {
        // Fallback or primary logic if the client sends content/context/variables directly
        initialVersion = {
          context: versionContext || promptData.description || "",
          content: content,
          variables: versionVariables,
        };
      }

      if (!initialVersion.context) {
        throw new GraphQLError("Version context is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        // 4. Find the wireframe to get its project ID (if any)
        const wireframe = await prisma.wireframe.findUnique({
          where: {
            id: wireframeId,
          },
          select: {
            projectId: true,
            userId: true,
          },
        });

        // 5. Handle Wireframe Not Found
        if (!wireframe) {
          throw new GraphQLError("Wireframe not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (wireframe.userId && wireframe.userId !== context.user.id) {
          throw new GraphQLError("You are not authorized to create a prompt from this wireframe.", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        // 6. Prepare data for prompt and nested version creation
        const dataToCreate: any = {
          ...promptData,
          wireframeId: wireframeId,
          userId: context.user.id,
          projectId: wireframe.projectId, // Will be null if not in a project
          versions: {
            create: [
              {
                // This is the initial version, set it as active
                isActive: true,
                context: initialVersion.context,
                notes: initialVersion.notes,
                description: initialVersion.description,
                // Nested creation for Content Blocks
                content: initialVersion.content && initialVersion.content.length > 0 ? {
                  create: initialVersion.content.map((block) => ({
                    type: block.type,
                    value: block.value,
                    varId: block.varId,
                    placeholder: block.placeholder,
                    name: block.name,
                    order: block.order,
                  })),
                } : undefined,
                // Nested creation for Variables (assuming variables are stored as JSON/map if not using a separate table)
                // NOTE: PromptVariable is defined as a type, suggesting a separate table/model is used. 
                // Since the schema shows 'Version' has 'variables: [PromptVariable!]'. We must ensure Prisma handles this.
                // Assuming `variables` field on Version model is managed via JSON for simplicity, as there's no explicit relation in the type definitions shown.
                variables: initialVersion.variables, // Assuming this maps to JSON or a related list structure handled by your ORM configuration
              },
            ],
          },
        };

        // 7. Create the prompt in the database
        const newPrompt = await prisma.prompt.create({
          data: dataToCreate,
          include: {
            activeVersion: true, // Include the active version
            versions: {
              include: {
                content: true,
                variables: true
              }
            }
          },
        });

        // 8. Return the newly created prompt
        return newPrompt;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error("Error creating prompt from wireframe:", error);
        throw new GraphQLError("Could not create the prompt.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    
    // ... updatePromptAiEnhancedContent remains unchanged ...
// ...
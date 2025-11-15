import { GoogleGenerativeAI } from "@google/generative-ai";
import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";
import { WIREFRAME_TO_PROMPT_INSTRUCTIONS } from "@/lib/ai/instructions";

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
  content?: any;
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
      // The format is "data:image/png;base64,iVBORw0KGgo..."
      // We need to strip the prefix for the API.
      const base64Data = imageBase64.split(",")[1];
      if (!base64Data) {
        throw new GraphQLError("Invalid image format. Expected base64 data URL.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
  
      try {
        // 4. Interact with Generative AI Model
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  
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
  
      } catch (error) {
        console.error("Error in generatePromptFromWireframe resolver:", error);
        throw new GraphQLError("Failed to generate prompt content from AI service.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
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
  
      const { wireframeId, ...promptData } = input;
  
      // 2. Input Validation
      if (!wireframeId || !promptData.title) {
          throw new GraphQLError("Wireframe ID and title are required.", {
              extensions: { code: "BAD_USER_INPUT" },
          });
      }
  
      try {
          // 3. Find the wireframe to get its project ID (if any)
          const wireframe = await context.prisma.wireframe.findUnique({
              where: {
                  id: wireframeId,
              },
              select: {
                  projectId: true,
                  userId: true, 
              }
          });
  
          // 4. Handle Wireframe Not Found
          if (!wireframe) {
              throw new GraphQLError("Wireframe not found.", {
                  extensions: { code: "NOT_FOUND" },
              });
          }
          
          // Basic Authorization check: This part might need to be more complex
          // depending on your business logic (e.g., checking project membership).
          // For now, we ensure the wireframe isn't a personal one belonging to someone else.
          if (wireframe.userId && wireframe.userId !== context.user.id) {
               throw new GraphQLError("You are not authorized to create a prompt from this wireframe.", {
                  extensions: { code: "FORBIDDEN" },
              });
          }
  
          // 5. Prepare data for prompt creation
          const dataToCreate: any = {
              ...promptData,
              wireframeId: wireframeId,
              userId: context.user.id, // The creator of the prompt is the current user
          };
  
          // 6. Conditionally add projectId if the wireframe is part of a project
          if (wireframe.projectId) {
              dataToCreate.projectId = wireframe.projectId;
          }
  
          // 7. Create the prompt in the database
          const newPrompt = await context.prisma.prompt.create({
              data: dataToCreate
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
  },


};

export default promptResolversAi;



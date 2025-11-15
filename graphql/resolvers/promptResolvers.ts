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

export const promptMutations = {
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

  // ... your other prompt-related mutations like createPrompt would go here
};
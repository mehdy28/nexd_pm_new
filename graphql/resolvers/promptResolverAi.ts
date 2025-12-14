// //graphql/resolvers/promptResolverAi.ts

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { GraphQLError } from "graphql";
// import { prisma } from "@/lib/prisma";
// import { WHITEBOARD_TO_PROMPT_INSTRUCTIONS,ENHANCE_PROMPT_INSTRUCTIONS } from "@/lib/ai/instructions";

// Define context shape based on your setup
// interface GraphQLContext {
//   prisma: typeof prisma;
//   user?: { id: string; email: string; role: string };
// }

// Ensure the API key is available
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");


// Function to convert image data from base64 to a format the API understands
// function fileToGenerativePart(base64: string, mimeType: string) {
//   return {
//     inlineData: {
//       data: base64,
//       mimeType,
//     },
//   };
// }

// Define the shape of the input for createPromptFromWhiteboard
// interface ContentBlockInput {
//   type: string;
//   value?: string;
//   varId?: string;
//   placeholder?: string;
//   name?: string;
//   order: number;
// }
// interface PromptVariableInput {
//   id?: string;
//   name: string;
//   placeholder: string;
//   description?: string;
//   type: string; // Assuming PromptVariableType enum maps to string
//   defaultValue?: string;
//   source?: any; // Assuming PromptVariableSourceInput maps to JSON/any
// }
// interface CreateVersionInput {
//   content?: ContentBlockInput[];
//   context: string;
//   variables?: PromptVariableInput[];
//   notes?: string;
//   description?: string;
// }

// interface CreatePromptFromWhiteboardInput {
//   WhiteboardId: string;
//   title: string;
//   context?: string;
//   description?: string;
//   category?: string;
//   tags?: string[];
//   isPublic?: boolean;
//   model?: string;
//   variables?: PromptVariableInput[];
//   content?: ContentBlockInput[]; 
//   versions?: CreateVersionInput[];
// }

// const promptResolversAi = {
//   Mutation: {
//     generatePromptFromWhiteboard: async (
//       _parent: any,
//       { input }: { input: { imageBase64: string; context: string } },
//       context: GraphQLContext
//     ) => {
//       1. Authentication Check
//       if (!context.user) {
//         throw new GraphQLError("You must be logged in to perform this action.", {
//           extensions: { code: "UNAUTHENTICATED" },
//         });
//       }

//       const { imageBase64, context: userContext } = input;

//       2. Input Validation
//       if (!imageBase64 || !userContext) {
//         throw new GraphQLError("Image data and context are required.", {
//           extensions: { code: "BAD_USER_INPUT" },
//         });
//       }

//       3. Process Image
//       const base64Data = imageBase64.split(",")[1];
//       if (!base64Data) {
//         throw new GraphQLError("Invalid image format. Expected base64 data URL.", {
//           extensions: { code: "BAD_USER_INPUT" },
//         });
//       }

//       try {
//         4. Interact with Generative AI Model - Use the versioned model name for vision
//         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//         const fullPrompt = `${WHITEBOARD_TO_PROMPT_INSTRUCTIONS}
    
//     User-provided context:
//     "${userContext}"
    
//     Begin generating the prompt based on the instructions and the provided Whiteboard image.`;

//         const imagePart = fileToGenerativePart(base64Data, "image/png");

//         const result = await model.generateContent([fullPrompt, imagePart]);
//         const response = await result.response;
//         const text = response.text();

//         5. Return Result
//         return text;
//       } catch (error: any) {
//         console.error("Error in generatePromptFromWhiteboard resolver:", error);

//         Log more specific details if available
//         if (error.response) {
//           console.error("Google AI API Response Error:", error.response.data);
//         }

//         throw new GraphQLError("Failed to generate prompt content from AI service.", {
//           extensions: {
//             code: "INTERNAL_SERVER_ERROR",
//             serviceError: error.message,
//           },
//         });
//       }
//     },

//     createPromptFromWhiteboard: async (
//       _parent: any,
//       { input }: { input: CreatePromptFromWhiteboardInput },
//       context: GraphQLContext
//     ) => {
//       1. Authentication Check
//       if (!context.user) {
//         throw new GraphQLError("You must be logged in to perform this action.", {
//           extensions: { code: "UNAUTHENTICATED" },
//         });
//       }

//       const { WhiteboardId, content, context: versionContext, variables: versionVariables, ...promptData } = input;

//       2. Input Validation
//       if (!WhiteboardId || !promptData.title) {
//         throw new GraphQLError("Whiteboard ID and title are required.", {
//           extensions: { code: "BAD_USER_INPUT" },
//         });
//       }

//       3. Normalize version data
//       let initialVersion: CreateVersionInput;
      
//       if (input.versions && input.versions.length > 0) {
//         initialVersion = input.versions[0];
//       } else {
//         initialVersion = {
//           context: versionContext || promptData.description || "",
//           content: content,
//           variables: versionVariables,
//         };
//       }

//       if (!initialVersion.context) {
//         throw new GraphQLError("Version context is required.", {
//           extensions: { code: "BAD_USER_INPUT" },
//         });
//       }

//       try {
//         4. Find the Whiteboard to get its project ID (if any)
//         const Whiteboard = await prisma.whiteboard.findUnique({
//           where: {
//             id: WhiteboardId,
//           },
//           select: {
//             projectId: true,
//             userId: true,
//           },
//         });

//         5. Handle Whiteboard Not Found
//         if (!Whiteboard) {
//           throw new GraphQLError("Whiteboard not found.", {
//             extensions: { code: "NOT_FOUND" },
//           });
//         }

//         if (Whiteboard.userId && Whiteboard.userId !== context.user.id) {
//           throw new GraphQLError("You are not authorized to create a prompt from this Whiteboard.", {
//             extensions: { code: "FORBIDDEN" },
//           });
//         }

//         6. Construct nested Version creation payload
//         const versionCreateData: any = {
//           isActive: true,
//           context: initialVersion.context,
//           notes: initialVersion.notes,
//           description: initialVersion.description,
//         };

//         Nested creation for Content Blocks
//         if (initialVersion.content && initialVersion.content.length > 0) {
//           versionCreateData.content = {
//             create: initialVersion.content.map((block) => ({
//               type: block.type,
//               value: block.value,
//               varId: block.varId,
//               placeholder: block.placeholder,
//               name: block.name,
//               order: block.order,
//             })),
//           };
//         }

//         Nested creation for Variables
//         if (initialVersion.variables && initialVersion.variables.length > 0) {
//           versionCreateData.variables = {
//             create: initialVersion.variables.map(variable => ({
//               Mapping fields to PromptVariable model
//               name: variable.name,
//               placeholder: variable.placeholder,
//               type: variable.type,
//               defaultValue: variable.defaultValue,
//               source: variable.source,
//               description: variable.description,
//             })),
//           };
//         }


//         7. Prepare data for prompt creation
//         const dataToCreate: any = {
//           ...promptData,
//           WhiteboardId: WhiteboardId,
//           userId: context.user.id,
//           projectId: Whiteboard.projectId,
//           versions: {
//             create: [versionCreateData],
//           },
//         };

//         8. Create the prompt in the database
//         const newPrompt = await prisma.prompt.create({
//           data: dataToCreate,
//           include: {
//             versions: {
//               include: {
//                 content: true,
//                 variables: true
//               }
//             }
//           },
//         });

//         9. Return the newly created prompt
//         return newPrompt;
//       } catch (error) {
//         if (error instanceof GraphQLError) {
//           throw error;
//         }
//         console.error("Error creating prompt from Whiteboard:", error);
//         throw new GraphQLError("Could not create the prompt.", {
//           extensions: { code: "INTERNAL_SERVER_ERROR" },
//         });
//       }
//     },
    

// updatePromptAiEnhancedContent: async (
//   _parent: any,
//   { input }: { input: { promptId: string; versionId: string; content: string } },
//   context: GraphQLContext
// ) => {
//   1. Authentication Check
//   if (!context.user) {
//     throw new GraphQLError("You must be logged in to perform this action.", {
//       extensions: { code: "UNAUTHENTICATED" },
//     });
//   }

//   const { promptId, versionId, content } = input;

//   2. Input Validation
//   if (!promptId || !versionId || !content) {
//     throw new GraphQLError("Prompt ID, version ID, and content are required.", {
//       extensions: { code: "BAD_USER_INPUT" },
//     });
//   }

//   3. Verify Prompt and User authorization (Check if the prompt belongs to the user or their project/workspace)
//   We will perform an authorization check on the Prompt first.
//   const prompt = await prisma.prompt.findUnique({
//     where: { id: promptId },
//     select: {
//       userId: true,
//       projectId: true,
//     },
//   });

//   if (!prompt) {
//     throw new GraphQLError("Prompt not found.", {
//       extensions: { code: "NOT_FOUND" },
//     });
//   }

//   Basic authorization check (This assumes necessary Project/Workspace authorization is handled elsewhere 
//   or that personal/owned project check is sufficient. If this is a personal prompt, ensure user matches.)
//   if (prompt.userId && prompt.userId !== context.user.id && !prompt.projectId) {
//      throw new GraphQLError("You are not authorized to modify this personal prompt.", {
//         extensions: { code: "FORBIDDEN" },
//       });
//   }
  
//   4. Interact with Generative AI for Text Enhancement
//   try {
//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//     const fullPromptForAI = `${ENHANCE_PROMPT_INSTRUCTIONS}

// User's original prompt:
// "${content}"

// Now, generate the enhanced version.`;

//     const result = await model.generateContent(fullPromptForAI);
//     const response = await result.response;
//     const enhancedText = response.text();

//     5. Update the specific Version record in the database
//     await prisma.version.update({
//       where: { 
//         id: versionId,
//         promptId: promptId // Ensure the version belongs to the prompt
//       },
//       data: {
//         aiEnhancedContent: enhancedText,
//         updatedAt: new Date(), // Update the version's updated timestamp if available, otherwise update prompt's.
//       },
//     });

//     Also update the parent prompt's updatedAt field
//     await prisma.prompt.update({
//       where: { id: promptId },
//       data: {
//         updatedAt: new Date(),
//       },
//     });

//     6. Return the new enhanced text
//     return enhancedText;

//   } catch (error: any) {
//     if (error.code === 'P2025') {
//          throw new GraphQLError("Version not found for this prompt.", {
//             extensions: { code: "NOT_FOUND" },
//          });
//     }
//     console.error("Error in updatePromptAiEnhancedContent resolver:", error);
//     throw new GraphQLError("Failed to enhance prompt content with AI service.", {
//       extensions: {
//         code: "INTERNAL_SERVER_ERROR",
//         serviceError: error.message,
//       },
//     });
//   }
// },
//   },
// };

// export default promptResolversAi;














import { GoogleGenerativeAI } from "@google/generative-ai";
import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";
import { WHITEBOARD_TO_PROMPT_INSTRUCTIONS,ENHANCE_PROMPT_INSTRUCTIONS } from "@/lib/ai/instructions";

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

// Define the shape of the input for createPromptFromWhiteboard
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

interface CreatePromptFromWhiteboardInput {
  WhiteboardId: string;
  title: string;
  context?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  model?: string;
  variables?: PromptVariableInput[];
  content?: ContentBlockInput[]; 
  versions?: CreateVersionInput[];
}

const promptResolversAi = {
  Mutation: {
    generatePromptFromWhiteboard: async (
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

        const fullPrompt = `${WHITEBOARD_TO_PROMPT_INSTRUCTIONS}
    
    User-provided context:
    "${userContext}"
    
    Begin generating the prompt based on the instructions and the provided Whiteboard image.`;

        const imagePart = fileToGenerativePart(base64Data, "image/png");

        const result = await model.generateContent([fullPrompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // 5. Return Result
        return text;
      } catch (error: any) {
        console.error("Error in generatePromptFromWhiteboard resolver:", error);

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

    createPromptFromWhiteboard: async (
      _parent: any,
      { input }: { input: CreatePromptFromWhiteboardInput },
      context: GraphQLContext
    ) => {
      // 1. Authentication Check
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { WhiteboardId, content, context: versionContext, variables: versionVariables, ...promptData } = input;

      // 2. Input Validation
      if (!WhiteboardId || !promptData.title) {
        throw new GraphQLError("Whiteboard ID and title are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // 3. Normalize version data
      let initialVersion: CreateVersionInput;
      
      if (input.versions && input.versions.length > 0) {
        initialVersion = input.versions[0];
      } else {
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
        // 4. Find the Whiteboard to get its project ID (if any)
        const Whiteboard = await prisma.whiteboard.findUnique({
          where: {
            id: WhiteboardId,
          },
          select: {
            projectId: true,
            userId: true,
          },
        });

        // 5. Handle Whiteboard Not Found
        if (!Whiteboard) {
          throw new GraphQLError("Whiteboard not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (Whiteboard.userId && Whiteboard.userId !== context.user.id) {
          throw new GraphQLError("You are not authorized to create a prompt from this Whiteboard.", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        // 6. Construct nested Version creation payload
        const versionCreateData: any = {
          isActive: true,
          context: initialVersion.context,
          notes: initialVersion.notes,
          description: initialVersion.description,
        };

        // Nested creation for Content Blocks
        if (initialVersion.content && initialVersion.content.length > 0) {
          versionCreateData.content = {
            create: initialVersion.content.map((block) => ({
              type: block.type,
              value: block.value,
              varId: block.varId,
              placeholder: block.placeholder,
              name: block.name,
              order: block.order,
            })),
          };
        }

        // Nested creation for Variables
        if (initialVersion.variables && initialVersion.variables.length > 0) {
          versionCreateData.variables = {
            create: initialVersion.variables.map(variable => ({
              // Mapping fields to PromptVariable model
              name: variable.name,
              placeholder: variable.placeholder,
              type: variable.type,
              defaultValue: variable.defaultValue,
              source: variable.source,
              description: variable.description,
            })),
          };
        }


        // 7. Prepare data for prompt creation
        const dataToCreate: any = {
          ...promptData,
          WhiteboardId: WhiteboardId,
          userId: context.user.id,
          projectId: Whiteboard.projectId,
          versions: {
            create: [versionCreateData],
          },
        };

        // 8. Create the prompt in the database
        const newPrompt = await prisma.prompt.create({
          data: dataToCreate,
          include: {
            versions: {
              include: {
                content: true,
                variables: true
              }
            }
          },
        });

        // 9. Return the newly created prompt
        return newPrompt;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error("Error creating prompt from Whiteboard:", error);
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
    
      // 3. Verify Prompt and User authorization
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: {
          userId: true,
          projectId: true,
        },
      });
    
      if (!prompt) {
        throw new GraphQLError("Prompt not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Basic authorization check
      if (prompt.userId && prompt.userId !== context.user.id && !prompt.projectId) {
         throw new GraphQLError("You are not authorized to modify this personal prompt.", {
            extensions: { code: "FORBIDDEN" },
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
    
        // 5. Update the specific Version record in the database
        await prisma.version.update({
          where: { 
            id: versionId,
            promptId: promptId // Ensure the version belongs to the prompt
          },
          data: {
            aiEnhancedContent: enhancedText,
            // Removed updatedAt: new Date() as Version model does not have this field.
          },
        });

        // Update the parent prompt's updatedAt field
        await prisma.prompt.update({
          where: { id: promptId },
          data: {
            updatedAt: new Date(),
          },
        });
    
        // 6. Return the new enhanced text
        return enhancedText;
    
      } catch (error: any) {
        if (error.code === 'P2025') {
             throw new GraphQLError("Version not found for this prompt.", {
                extensions: { code: "NOT_FOUND" },
             });
        }
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

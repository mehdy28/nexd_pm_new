import { GoogleGenerativeAI } from "@google/generative-ai";
import { GraphQLError } from "graphql";
import { prisma } from "../../lib/prisma.js";
import { WHITEBOARD_TO_PROMPT_INSTRUCTIONS } from "../../lib/ai/instructions.js";
// Ensure the API key is available
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
// Function to convert image data from base64 to a format the API understands
function fileToGenerativePart(base64, mimeType) {
    return {
        inlineData: {
            data: base64,
            mimeType,
        },
    };
}
const promptResolversAi = {
    Mutation: {
        generatePromptFromWhiteboard: async (_parent, { input }, context) => {
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
            }
            catch (error) {
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
        createPromptFromWhiteboard: async (_parent, { input }, context) => {
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
            let initialVersion;
            if (input.versions && input.versions.length > 0) {
                initialVersion = input.versions[0];
            }
            else {
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
                const versionCreateData = {
                    isActive: true,
                    context: initialVersion.context,
                    notes: initialVersion.notes,
                    description: initialVersion.description,
                };
                // Nested creation for Content Blocks
                if (initialVersion.content && initialVersion.content.length > 0) {
                    versionCreateData.content = {
                        create: initialVersion.content.map(block => ({
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
                const dataToCreate = {
                    ...promptData,
                    user: {
                        connect: {
                            id: context.user.id,
                        },
                    },
                    Whiteboard: {
                        connect: {
                            id: WhiteboardId,
                        },
                    },
                    versions: {
                        create: [versionCreateData],
                    },
                };
                if (Whiteboard.projectId) {
                    dataToCreate.project = {
                        connect: {
                            id: Whiteboard.projectId,
                        },
                    };
                }
                let finalModelProfileId = promptData.modelProfileId;
                if (!finalModelProfileId) {
                    const genericModel = await prisma.modelProfile.findFirst({
                        where: { name: "Generic Model" },
                        select: { id: true },
                    });
                    if (genericModel) {
                        finalModelProfileId = genericModel.id;
                    }
                }
                if (finalModelProfileId) {
                    dataToCreate.modelProfile = {
                        connect: { id: finalModelProfileId },
                    };
                }
                // 8. Create the prompt in the database
                const newPrompt = await prisma.prompt.create({
                    data: dataToCreate,
                    include: {
                        versions: {
                            include: {
                                content: true,
                                variables: true,
                            },
                        },
                    },
                });
                // 9. Return the newly created prompt
                return newPrompt;
            }
            catch (error) {
                if (error instanceof GraphQLError) {
                    throw error;
                }
                console.error("Error creating prompt from Whiteboard:", error);
                throw new GraphQLError("Could not create the prompt.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        },
        updatePromptAiEnhancedContent: async (_parent, { input }, context) => {
            // 1. Authentication Check
            if (!context.user) {
                throw new GraphQLError("You must be logged in to perform this action.", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }
            const { promptId, versionId, content, modelProfileId } = input;
            // 2. Input Validation
            if (!promptId || !versionId || !content || !modelProfileId) {
                throw new GraphQLError("Prompt ID, version ID, content, and model are required.", {
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
            if (prompt.userId && prompt.userId !== context.user.id && !prompt.projectId) {
                throw new GraphQLError("You are not authorized to modify this personal prompt.", {
                    extensions: { code: "FORBIDDEN" },
                });
            }
            // 4. Interact with Generative AI using the Meta-Prompting Strategy
            try {
                // Fetch the model profile from the database
                let modelProfile = await prisma.modelProfile.findUnique({
                    where: { id: modelProfileId },
                });
                // If the specific model isn't found, try to find a generic fallback
                if (!modelProfile) {
                    modelProfile = await prisma.modelProfile.findFirst({
                        where: { name: "Generic Model" },
                    });
                }
                // If still no model profile, throw an error
                if (!modelProfile) {
                    throw new GraphQLError("Target model profile not found and no generic fallback is available.", {
                        extensions: { code: "NOT_FOUND" },
                    });
                }
                const modelProfileName = modelProfile.name;
                const modelProfileInstructions = modelProfile.enhancementInstructions ||
                    "Focus on general prompt engineering best practices. Ensure the prompt is specific, provides sufficient context, and clearly defines the desired output format. Use clear and simple language. Avoid ambiguity.";
                const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const metaPrompt = `You are a world-class Prompt Engineering expert AI. Your task is to analyze and rewrite a given user's prompt to make it more effective for a specific target AI model.

**Target AI Model:** ${modelProfileName}

**Guidelines for this Specific Model:**
${modelProfileInstructions}

**User's Original Prompt:**
---
${content}
---

**Your Task:**
Rewrite the user's prompt based on the guidelines above. The new prompt should be clear, efficient, and tailored to get the best possible response from the target model. Return ONLY the final, rewritten prompt and nothing else. Do not add any conversational text or explanations.`;
                const result = await aiModel.generateContent(metaPrompt);
                const response = await result.response;
                const enhancedText = response.text();
                // 5. Update the specific Version record in the database
                await prisma.version.update({
                    where: {
                        id: versionId,
                        promptId: promptId, // Ensure the version belongs to the prompt
                    },
                    data: {
                        aiEnhancedContent: enhancedText,
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
            }
            catch (error) {
                if (error instanceof GraphQLError) {
                    throw error;
                }
                if (error.code === "P2025") {
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

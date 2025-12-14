//hooks/usePromptsAi.ts
import { useMutation } from "@apollo/client";
import { 
  CREATE_PROMPT_FROM_WHITEBOARD_MUTATION,
  GENERATE_PROMPT_FROM_WHITEBOARD_MUTATION,
  UPDATE_PROMPT_AI_ENHANCED_CONTENT_MUTATION
} from "@/graphql/mutations/promptMutations";

// --- Hook to use the generatePromptFromWhiteboard mutation ---
export const useGeneratePromptContent = () => {
  const [generate, { data, loading, error }] = useMutation(
    GENERATE_PROMPT_FROM_WHITEBOARD_MUTATION
  );

  const generatedContent = data?.generatePromptFromWhiteboard || null;

  return { generate, generatedContent, loading, error };
};


// --- Hook to use the createPrompt mutation ---
export const useCreatePrompt = () => {
  const [createPrompt, { data, loading, error }] = useMutation(
    CREATE_PROMPT_FROM_WHITEBOARD_MUTATION
  );

  return { createPrompt, data, loading, error };
};





// --- Hook to use the updatePromptAiEnhancedContent mutation ---
export const useUpdatePromptAiEnhancedContent = () => {
  const [updatePrompt, { data, loading, error }] = useMutation(
    UPDATE_PROMPT_AI_ENHANCED_CONTENT_MUTATION
  );

  const enhancedContent = data?.updatePromptAiEnhancedContent || null;

  return { updatePrompt, enhancedContent, loading, error };
};
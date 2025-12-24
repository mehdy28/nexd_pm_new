//graphql/mutations/promptMutations.ts
import { gql } from "@apollo/client";
export const GENERATE_PROMPT_FROM_WHITEBOARD_MUTATION = gql `
  mutation GeneratePromptFromWhiteboard($input: GeneratePromptFromWhiteboardInput!) {
    generatePromptFromWhiteboard(input: $input)
  }
`;
export const CREATE_PROMPT_FROM_WHITEBOARD_MUTATION = gql `
  mutation CreatePromptFromWhiteboard($input: CreatePromptFromWhiteboardInput!) {
    createPromptFromWhiteboard(input: $input) {
      id
      title
      description
      modelProfileId
      WhiteboardId
      activeVersion {
        id
        context
        isActive
        content {
          id
          type
          value
          order
        }
      }
      versions {
        id
        notes
      }
    }
  }
`;
export const UPDATE_PROMPT_AI_ENHANCED_CONTENT_MUTATION = gql `
  mutation UpdatePromptAiEnhancedContent($input: UpdatePromptAiEnhancedContentInput!) {
    updatePromptAiEnhancedContent(input: $input)
  }
`;

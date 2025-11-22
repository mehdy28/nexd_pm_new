//graphql/mutations/promptMutations.ts

import { gql } from "@apollo/client";

export const GENERATE_PROMPT_FROM_WIREFRAME_MUTATION = gql`
  mutation GeneratePromptFromWireframe($input: GeneratePromptFromWireframeInput!) {
    generatePromptFromWireframe(input: $input)
  }
`;

export const CREATE_PROMPT_FROM_WIREFRAME_MUTATION = gql`
  mutation CreatePromptFromWireframe($input: CreatePromptFromWireframeInput!) {
    createPromptFromWireframe(input: $input) {
      id
      title
      description
      model
      wireframeId
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




export const UPDATE_PROMPT_AI_ENHANCED_CONTENT_MUTATION = gql`
  mutation UpdatePromptAiEnhancedContent($input: UpdatePromptAiEnhancedContentInput!) {
    updatePromptAiEnhancedContent(input: $input)
  }
`;
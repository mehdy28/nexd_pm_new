import { gql } from "@apollo/client";

export const GENERATE_PROMPT_FROM_WIREFRAME_MUTATION = gql`
  mutation GeneratePromptFromWireframe($input: GeneratePromptFromWireframeInput!) {
    generatePromptFromWireframe(input: $input)
  }
`;

export const CREATE_PROMPT_MUTATION = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      title
      description
      model
      projectId
      content {
        id
        type
        value
      }
      versions {
        id
        notes
      }
    }
  }
`;
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
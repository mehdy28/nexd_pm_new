 import { gql } from 'graphql-tag'; // Or your equivalent for GQL queries
 
// --- Prompt Queries ---

export const GET_PROJECT_PROMPTS_QUERY = gql`
  query GetProjectPrompts($projectId: ID) {
    getProjectPrompts(projectId: $projectId) {
      id
      title
      description
      tags
      updatedAt
      isPublic
      projectId # Now valid after schema update
      # We don't need content, context, variables, versions for the list view
    }
  }
`;

export const GET_PROMPT_DETAILS_QUERY = gql`
  query GetPromptDetails($id: ID!) {
    getPromptDetails(id: $id) {
      id
      title
      content
      context
      description
      category
      tags
      isPublic
      createdAt
      updatedAt
      model
      projectId
      user { # Include user for personal prompts
        id
        firstName
        lastName
      }
      variables {
        id
        name
        placeholder
        description
        type
        defaultValue
        source
      }
      versions {
        id
        content
        context
        variables {
          id
          name
          placeholder
          description
          type
          defaultValue
          source
        }
        createdAt
        notes
      }
    }
  }
`;

// --- Variable Resolver Query ---
export const RESOLVE_PROMPT_VARIABLE_QUERY = gql`
  query ResolvePromptVariable($projectId: ID, $variableSource: JSON!, $promptVariableId: ID) {
    resolvePromptVariable(projectId: $projectId, variableSource: $variableSource, promptVariableId: $promptVariableId)
  }
`;
import { gql } from 'graphql-tag';

// --- Prompt Queries ---

export const GET_PROJECT_PROMPTS_QUERY = gql`
  query GetProjectPrompts($projectId: ID, $skip: Int, $take: Int, $q: String) { # ADDED: $q
    getProjectPrompts(projectId: $projectId, skip: $skip, take: $take, q: $q) { # ADDED: q
      prompts {
        id
        title
        description
        tags
        updatedAt
        isPublic
        projectId
        model
      }
      totalCount
    }
  }
`;

export const GET_PROMPT_DETAILS_QUERY = gql`
  query GetPromptDetails($id: ID!) {
    getPromptDetails(id: $id) {
      id
      title
      description
      category
      tags
      isPublic
      createdAt
      updatedAt
      model
      projectId
      aiEnhancedContent # Fetches the enhanced content from the latest version
      user {
        id
        firstName
        lastName
      }
      # Fetches the active prompt's content
      content {
        id
        type
        value
        varId
        placeholder
        name
      }
      context # Fetches the active prompt's context
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
        createdAt
        notes
        description
      }
    }
  }
`;

// NEW: Query to get specific version's content, context, and variables
export const GET_PROMPT_VERSION_CONTENT_QUERY = gql`
  query GetPromptVersionContent($promptId: ID!, $versionId: ID!) {
    getPromptVersionContent(promptId: $promptId, versionId: $versionId) {
      id # The version ID
      aiEnhancedContent
      content {
        id
        type
        value
        varId
        placeholder
        name
      }
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
    }
  }
`;

// --- Variable Resolver Query ---
export const RESOLVE_PROMPT_VARIABLE_QUERY = gql`
  query ResolvePromptVariable($projectId: ID, $variableSource: JSON!, $promptVariableId: ID) {
    resolvePromptVariable(
      projectId: $projectId
      variableSource: $variableSource
      promptVariableId: $promptVariableId
    )
  }
`;
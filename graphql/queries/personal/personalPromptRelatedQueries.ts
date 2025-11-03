import { gql } from "graphql-tag"

// --- Prompt Queries ---

export const GET_MY_PROMPTS_QUERY = gql`
  query GetMyPrompts($skip: Int, $take: Int, $q: String) {
    getMyPrompts(skip: $skip, take: $take, q: $q) {
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
`

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
      user {
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
        createdAt
        notes
        description
      }
    }
  }
`

export const GET_PROMPT_VERSION_CONTENT_QUERY = gql`
  query GetPromptVersionContent($promptId: ID!, $versionId: ID!) {
    getPromptVersionContent(promptId: $promptId, versionId: $versionId) {
      id # The version ID
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
`

// --- Variable Resolver Query ---
export const RESOLVE_PROMPT_VARIABLE_QUERY = gql`
  query ResolvePromptVariable(
    $projectId: ID
    $workspaceId: ID
    $variableSource: JSON!
    $promptVariableId: ID
  ) {
    resolvePromptVariable(
      projectId: $projectId
      workspaceId: $workspaceId
      variableSource: $variableSource
      promptVariableId: $promptVariableId
    )
  }
`
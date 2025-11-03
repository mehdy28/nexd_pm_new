import gql from "graphql-tag"

// NOTE: Personal context lookups primarily rely on workspace-level data or general user data.
// There are no direct personal equivalents for project-specific lookups like sprints or project members in the current schema.

export const GET_WORKSPACE_DATA_LOOKUP_QUERY = gql`
  query GetWorkspaceDataLookup($workspaceId: ID!) {
    getWorkspaceDataLookup(workspaceId: $workspaceId) {
      id
      name
      owner {
        id
        firstName
        lastName
      }
      members {
        id
        role
        user {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`

// The Prompt Variable Resolver Query is generic and can be used in a personal context
// by providing a workspaceId instead of a projectId.
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
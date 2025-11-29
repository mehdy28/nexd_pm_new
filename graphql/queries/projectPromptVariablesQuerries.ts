import gql from 'graphql-tag';

export const GET_PROJECT_SPRINTS_LOOKUP_QUERY = gql`
  query GetProjectSprintsLookup($projectId: ID!) {
    getProjectSprintsLookup(projectId: $projectId) {
      id
      name
      status # Include status for potential filtering/display
      startDate
      endDate
    }
  }
`;

export const GET_PROJECT_MEMBERS_LOOKUP_QUERY = gql`
  query GetProjectMembersLookup($projectId: ID!) {
    getProjectMembersLookup(projectId: $projectId) {
      id # ProjectMember ID
      role
      user {
        id # User ID
        firstName
        lastName
        email
        avatar
      }
    }
  }
`;

export const GET_PROJECT_TASKS_LOOKUP_QUERY = gql`
  query GetProjectTasksLookup($projectId: ID!, $sprintId: ID) {
    getProjectTasksLookup(projectId: $projectId, sprintId: $sprintId) {
      id
      title
      status
      priority
      endDate
      assignee {
        id
        firstName
        lastName
      }
      sprint {
        id
        name
      }
    }
  }
`;

export const GET_PROJECT_DOCUMENTS_LOOKUP_QUERY = gql`
  query GetProjectDocumentsLookup($projectId: ID!) {
    getProjectDocumentsLookup(projectId: $projectId) {
      id
      title
      updatedAt
    }
  }
`;

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
`;

// Existing Prompt Variable Resolver Query (as in your component)
export const RESOLVE_PROMPT_VARIABLE_QUERY = gql`
  query ResolvePromptVariable($projectId: ID, $workspaceId: ID, $variableSource: JSON!, $promptVariableId: ID) {
    resolvePromptVariable(
      projectId: $projectId
      workspaceId: $workspaceId
      variableSource: $variableSource
      promptVariableId: $promptVariableId
    )
  }
`;
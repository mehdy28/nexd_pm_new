import { gql } from 'graphql-tag'; // Or your equivalent for GQL mutations
// --- Prompt Mutations ---
export const CREATE_PROMPT_MUTATION = gql `
mutation CreatePrompt($input: CreatePromptInput!) {
  createPrompt(input: $input) {
    id
    title
    description
    category
    tags
    isPublic
    createdAt
    updatedAt
    modelProfileId
    projectId
    versions {
      id
      createdAt
      notes
      description
      isActive
    }
    activeVersion {
      id
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
        type
        defaultValue
        source
      }
    }
  }
}
`;
export const UPDATE_PROMPT_MUTATION = gql `
mutation UpdatePrompt($input: UpdatePromptInput!) {
  updatePrompt(input: $input) {
    id
    title
    description
    category
    tags
    isPublic
    updatedAt
    modelProfileId
  }
}
`;
export const DELETE_PROMPT_MUTATION = gql `
  mutation DeletePrompt($id: ID!) {
    deletePrompt(id: $id) {
      id
    }
  }
`;
export const SNAPSHOT_PROMPT_MUTATION = gql `
  mutation SnapshotPrompt($input: SnapshotPromptInput!) {
    snapshotPrompt(input: $input) {
      id
      versions {
        id
        createdAt
        notes
        description
        isActive
        content {
          id
          type
          value
        }
        context
        variables {
          id
          name
          placeholder
        }
      }
    }
  }
`;
export const SET_ACTIVE_PROMPT_VERSION_MUTATION = gql `
  mutation SetActivePromptVersion($promptId: ID!, $versionId: ID!) {
    setActivePromptVersion(promptId: $promptId, versionId: $versionId) {
      id
      title
      description
      category
      tags
      isPublic
      createdAt
      updatedAt
      modelProfileId
      projectId
      user {
        id
        firstName
        lastName
      }
      activeVersion {
        id
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
      versions {
        id
        createdAt
        notes
        description
        isActive
      }
    }
  }
`;
export const UPDATE_VERSION_DESCRIPTION_MUTATION = gql `
  mutation UpdateVersionDescription($input: UpdateVersionDescriptionInput!) {
    updateVersionDescription(input: $input) {
      id
      versions {
        id
        notes
        description
        createdAt
        isActive
      }
    }
  }
`;
export const UPDATE_PROMPT_VERSION_MUTATION = gql `
  mutation UpdatePromptVersion($input: UpdatePromptVersionInput!) {
    updatePromptVersion(input: $input) {
      id
      versions {
        id
        notes
        description
        createdAt
        isActive
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
            type
            defaultValue
            source
        }
      }
    }
  }
`;

import { gql } from "graphql-tag"


// This mutation can create a personal prompt by omitting the `projectId` in the input.
export const CREATE_PROMPT_MUTATION = gql`
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
      model
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
`

// This mutation updates any prompt by its ID, regardless of whether it's personal or project-based.
export const UPDATE_PROMPT_MUTATION = gql`
  mutation UpdatePrompt($input: UpdatePromptInput!) {
    updatePrompt(input: $input) {
      id
      title
      description
      tags
      isPublic
      updatedAt
      model
    }
  }
`

export const DELETE_PROMPT_MUTATION = gql`
  mutation DeletePrompt($id: ID!) {
    deletePrompt(id: $id) {
      id
    }
  }
`

export const DELETE_MANY_PROMPTS_MUTATION = gql`
  mutation DeleteManyPrompts($ids: [ID!]!) {
    deleteManyPrompts(ids: $ids) {
      count
    }
  }
`

export const SNAPSHOT_PROMPT_MUTATION = gql`
  mutation SnapshotPrompt($input: SnapshotPromptInput!) {
    snapshotPrompt(input: $input) {
      id
      versions {
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
        createdAt
        notes
        description
        isActive
      }
    }
  }
`

export const SET_ACTIVE_PROMPT_VERSION_MUTATION = gql`
  mutation SetActivePromptVersion($promptId: ID!, $versionId: ID!) {
    setActivePromptVersion(promptId: $promptId, versionId: $versionId) {
      id
      versions {
        id
        notes
        description
        createdAt
        isActive
      }
       activeVersion {
        id
      }
    }
  }
`

export const UPDATE_VERSION_DESCRIPTION_MUTATION = gql`
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
`
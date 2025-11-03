import { gql } from "graphql-tag"

// --- Prompt Mutations (Generic for both Project and Personal) ---

// This mutation can create a personal prompt by omitting the `projectId` in the input.
export const CREATE_PROMPT_MUTATION = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      title
      content {
        id
        type
        value
        varId
        placeholder
        name
      }
      context
      description
      category
      tags
      isPublic
      createdAt
      updatedAt
      model
      projectId
      variables {
        id
        name
        placeholder
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

// This mutation updates any prompt by its ID, regardless of whether it's personal or project-based.
export const UPDATE_PROMPT_MUTATION = gql`
  mutation UpdatePrompt($input: UpdatePromptInput!) {
    updatePrompt(input: $input) {
      id
      title
      content {
        id
        type
        value
        varId
        placeholder
        name
      }
      context
      description
      tags
      isPublic
      updatedAt
      model
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
`

export const DELETE_PROMPT_MUTATION = gql`
  mutation DeletePrompt($id: ID!) {
    deletePrompt(id: $id) {
      id
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
      }
    }
  }
`

export const RESTORE_PROMPT_VERSION_MUTATION = gql`
  mutation RestorePromptVersion($input: RestorePromptVersionInput!) {
    restorePromptVersion(input: $input) {
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
      }
    }
  }
`
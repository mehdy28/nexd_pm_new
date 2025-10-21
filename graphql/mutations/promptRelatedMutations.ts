import { gql } from 'graphql-tag'; // Or your equivalent for GQL mutations

// --- Prompt Mutations ---

export const CREATE_PROMPT_MUTATION = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      title
      content { # CHANGED: Querying fields of ContentBlock
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
        content { # CHANGED: Querying fields of ContentBlock for versions
          id
          type
          value
          varId
          placeholder
          name
        }
        createdAt
        notes
      }
    }
  }
`;

export const UPDATE_PROMPT_MUTATION = gql`
  mutation UpdatePrompt($input: UpdatePromptInput!) {
    updatePrompt(input: $input) {
      id
      title
      content { # CHANGED: Querying fields of ContentBlock
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
      variables { # Return updated variables
        id
        name
        placeholder
        type
        defaultValue
        source
      }
    }
  }
`;

export const DELETE_PROMPT_MUTATION = gql`
  mutation DeletePrompt($id: ID!) {
    deletePrompt(id: $id) {
      id
    }
  }
`;

export const SNAPSHOT_PROMPT_MUTATION = gql`
  mutation SnapshotPrompt($input: SnapshotPromptInput!) {
    snapshotPrompt(input: $input) {
      id
      versions { # Return all versions to update UI
        id
        content { # CHANGED: Querying fields of ContentBlock for versions
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
      }
    }
  }
`;

export const RESTORE_PROMPT_VERSION_MUTATION = gql`
  mutation RestorePromptVersion($input: RestorePromptVersionInput!) {
    restorePromptVersion(input: $input) {
      id
      content { # CHANGED: Querying fields of ContentBlock
        id
        type
        value
        varId
        placeholder
        name
      }
      context
      variables { # Return updated content and variables
        id
        name
        placeholder
        type
        defaultValue
        source
      }
    }
  }
`;
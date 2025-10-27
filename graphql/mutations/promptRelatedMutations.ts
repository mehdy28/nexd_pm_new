// graphql/mutations/promptRelatedMutations.ts
import { gql } from 'graphql-tag'; // Or your equivalent for GQL mutations

// --- Prompt Mutations ---

export const CREATE_PROMPT_MUTATION = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      title
      content { # Now expecting ContentBlock subfields
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
        description # ADDED: Request description for new versions
      }
    }
  }
`;

export const UPDATE_PROMPT_MUTATION = gql`
  mutation UpdatePrompt($input: UpdatePromptInput!) {
    updatePrompt(input: $input) {
      id
      title
      content { # CHANGED: Requesting subfields for ContentBlock
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
        content { # Now expecting ContentBlock subfields
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
        description # ADDED: Request description for snapped versions
      }
    }
  }
`;

export const RESTORE_PROMPT_VERSION_MUTATION = gql`
  mutation RestorePromptVersion($input: RestorePromptVersionInput!) {
    restorePromptVersion(input: $input) {
      id
      content { # Now expecting ContentBlock subfields
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

// NEW: Mutation for updating a specific version's description
export const UPDATE_VERSION_DESCRIPTION_MUTATION = gql`
  mutation UpdateVersionDescription($input: UpdateVersionDescriptionInput!) {
    updateVersionDescription(input: $input) {
      id
      versions {
        id
        notes
        description # ADDED: Ensure description is returned
        createdAt
      }
    }
  }
`;
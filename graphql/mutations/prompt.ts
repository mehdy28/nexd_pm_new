import { gql } from "@apollo/client"

export const CREATE_PROMPT = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      title
      content
      description
      category
      tags
      isPublic
      createdAt
      project {
        id
        name
      }
    }
  }
`

export const UPDATE_PROMPT = gql`
  mutation UpdatePrompt($id: ID!, $input: UpdatePromptInput!) {
    updatePrompt(id: $id, input: $input) {
      id
      title
      content
      description
      category
      tags
      isPublic
      updatedAt
    }
  }
`

export const DELETE_PROMPT = gql`
  mutation DeletePrompt($id: ID!) {
    deletePrompt(id: $id)
  }
`
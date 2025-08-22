import { gql } from "@apollo/client"

export const GET_PROMPTS = gql`
  query GetPrompts($projectId: ID, $userId: ID, $personal: Boolean) {
    prompts(projectId: $projectId, userId: $userId, personal: $personal) {
      id
      title
      description
      category
      tags
      isPublic
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
    }
  }
`

export const GET_PROMPT = gql`
  query GetPrompt($id: ID!) {
    prompt(id: $id) {
      id
      title
      content
      description
      category
      tags
      isPublic
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
      comments {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
      }
    }
  }
`
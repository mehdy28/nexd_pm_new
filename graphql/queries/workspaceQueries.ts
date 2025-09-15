import { gql } from "graphql-tag";

export const GET_WORKSPACE_PAGE_DATA = gql`
  query GetWorkspacePageData($userId: ID!) {
    workspacePageData(userId: $userId) {
      workspace {
        id
        name
        description
        slug
        plan
        createdAt
        updatedAt
        owner { id name avatar role }
      }
      projects {
        id
        name
        description
        members {
          id
          role
          user { id name avatar role }
        }
      }
      members {
        id
        role
        user { id name avatar role }
      }
    }
  }
`;

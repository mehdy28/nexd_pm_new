import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      avatar
      avatarColor
      role
      ownedWorkspaces {
        id
        name
      }
      workspaceMembers {
        workspace {
          id
        }
      }
    }
  }
`;
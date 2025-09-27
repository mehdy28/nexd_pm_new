import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
  me {
    id
    email
    lastName
    firstName
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

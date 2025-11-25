import { gql } from "@apollo/client"

export const GET_ME_BASIC = gql`
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
`

// export const GET_ACCOUNT_PAGE_DATA = gql`
//   query GetAccountPageData {
//     getWorkspaceData {
//       id
//       name
//       plan
//       owner {
//         id
//       }
//       members {
//         id
//       }
//       projects {
//         id
//       }
//       subscription {
//         status
//         plan
//         currentPeriodEnd
//       }
//     }
//   }
// `

export const GET_WORKSPACE_AUDIT_LOGS = gql`
  query GetWorkspaceAuditLogs($workspaceId: ID!, $skip: Int, $take: Int) {
    getWorkspaceAuditLogs(workspaceId: $workspaceId, skip: $skip, take: $take) {
      logs {
        id
        action
        data
        createdAt
        user {
          id
          firstName
          lastName
          email
          avatar
        }
      }
      totalCount
    }
  }
`
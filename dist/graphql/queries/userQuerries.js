import { gql } from 'graphql-tag';
// We define the query here to ensure the hook is self-contained for this context
export const GET_ACCOUNT_PAGE_DATA = gql `
  query GetAccountPageData {
    getWorkspaceData {
      id
      name
      owner {
        id
      }
      plan
    }
    getMyNotificationSettings {
      atMention
      taskAssigned
      projectUpdates
      productNews
    }
  }
`;

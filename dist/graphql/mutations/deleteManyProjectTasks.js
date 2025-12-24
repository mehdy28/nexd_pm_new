import { gql } from "@apollo/client";
export const DELETE_MANY_PROJECT_TASKS_MUTATION = gql `
  mutation DeleteManyProjectTasks($ids: [ID!]!) {
    deleteManyProjectTasks(ids: $ids) {
      id
      sectionId
    }
  }
`;

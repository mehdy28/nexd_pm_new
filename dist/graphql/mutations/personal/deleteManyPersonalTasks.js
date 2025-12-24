import { gql } from "@apollo/client";
export const DELETE_MANY_PERSONAL_TASKS_MUTATION = gql `
  mutation DeleteManyPersonalTasks($ids: [ID!]!) {
    deleteManyPersonalTasks(ids: $ids) {
      id
      personalSectionId
    }
  }
`;

import { gql } from "@apollo/client";
export const CREATE_PERSONAL_SECTION_MUTATION = gql `
  mutation CreatePersonalSection($name: String!, $order: Int) {
    createPersonalSection(name: $name, order: $order) {
      id
      name
      tasks {
        id
        title
        status
        priority
        dueDate
        points
        assignee {
          id
          firstName
          lastName
          avatar
        }
      }
    }
  }
`;

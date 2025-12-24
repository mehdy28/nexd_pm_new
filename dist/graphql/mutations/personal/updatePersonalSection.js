import { gql } from "@apollo/client";
export const UPDATE_PERSONAL_SECTION_MUTATION = gql `
  mutation UpdatePersonalSection($id: ID!, $name: String, $order: Int) {
    updatePersonalSection(id: $id, name: $name, order: $order) {
      id
      name
      order
    }
  }
`;

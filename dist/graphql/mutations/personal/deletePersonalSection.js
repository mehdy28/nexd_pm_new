import { gql } from "@apollo/client";
export const DELETE_PERSONAL_SECTION_MUTATION = gql `
  mutation DeletePersonalSection($id: ID!, $options: DeleteSectionOptions!) {
    deletePersonalSection(id: $id, options: $options) {
      id
      name
      order
    }
  }
`;

// graphql/mutations/deleteProjectSection.ts
import { gql } from '@apollo/client';
export const DELETE_PROJECT_SECTION_MUTATION = gql `
  mutation DeleteProjectSection($id: ID!, $options: DeleteSectionOptions!) {
    deleteProjectSection(id: $id, options: $options) {
      id # Returns the ID of the deleted section, or new default section if created
      name # Name of the deleted section, or new default section
      order
      # Include other fields as needed for cache updates (e.g., tasks of new section)
    }
  }
`;

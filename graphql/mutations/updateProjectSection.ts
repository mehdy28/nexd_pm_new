// graphql/mutations/updateProjectSection.ts

import { gql } from '@apollo/client';

export const UPDATE_PROJECT_SECTION_MUTATION = gql`
  mutation UpdateProjectSection($id: ID!, $name: String, $order: Int) {
    updateProjectSection(id: $id, name: $name, order: $order) {
      id
      name
      order
      # Include other fields needed for UI display or cache update
      # For renaming, name and ID are most critical
    }
  }
`;
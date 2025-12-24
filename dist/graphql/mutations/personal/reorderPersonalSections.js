import { gql } from "@apollo/client";
export const REORDER_PERSONAL_SECTIONS_MUTATION = gql `
  mutation ReorderPersonalSections($sections: [ReorderPersonalSectionInput!]!) {
    reorderPersonalSections(sections: $sections) {
      id
      order
    }
  }
`;

import { gql } from "@apollo/client"

export const REORDER_PROJECT_SECTIONS_MUTATION = gql`
  mutation ReorderProjectSections($projectId: ID!, $sections: [ReorderProjectSectionInput!]!) {
    reorderProjectSections(projectId: $projectId, sections: $sections) {
      id
      order
    }
  }
`
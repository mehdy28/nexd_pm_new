// graphql/queries/documents.ts
import { gql } from "@apollo/client";

// Minimal data for listing documents
export const GET_PROJECT_DOCUMENTS = gql`
  query GetProjectDocuments($projectId: ID!) {
    getProjectDocuments(projectId: $projectId) {
      id
      title
      updatedAt
      type # "doc" or "pdf"
      projectId
    }
  }
`;

// Full data for displaying a single document
export const GET_DOCUMENT_DETAILS = gql`
 query GetDocumentDetails($id: ID!) {
  getDocumentDetails(id: $id) {
    id
    title
    content
    # dataUrl should be removed if you removed it from your schema
    createdAt
    updatedAt
    project { # Query the 'project' field
      id     # Select the 'id' from the Project object
      # You can select other project fields here if needed, e.g., name
      __typename
    }
    personalUser {
      id
      firstName
      lastName
      __typename
    }
    __typename
  }
}
`;
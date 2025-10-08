import { gql } from "@apollo/client";

// Assuming you have a 'JSON' scalar defined in your GraphQL schema for the content field
// If not, you might need to add it or use String and JSON.parse/stringify
export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      id
      title
      updatedAt
      type
      projectId
    }
  }
`;

export const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      id
      title
      updatedAt
      type
      projectId
    }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id) {
      id
      title
      updatedAt
      type
      projectId
    }
  }
`;
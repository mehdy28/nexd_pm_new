import { gql } from "@apollo/client";

export const CREATE_DOCUMENT_COMMENT = gql`
  mutation CreateDocumentComment($documentId: ID!, $content: String!) {
    createDocumentComment(documentId: $documentId, content: $content) {
      id
      content
      createdAt
      author {
        id
        firstName
        lastName
        avatar
        avatarColor
      }
    }
  }
`;

export const DELETE_DOCUMENT_COMMENT = gql`
  mutation DeleteDocumentComment($id: ID!) {
    deleteDocumentComment(id: $id) {
      id
    }
  }
`;
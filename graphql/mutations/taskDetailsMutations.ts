// graphql/mutations/taskDetailsMutations.ts
import { gql } from "@apollo/client";

// --- Comment Mutations ---

export const CREATE_TASK_COMMENT_MUTATION = gql`
  mutation CreateTaskComment($taskId: ID!, $content: String!) {
    createTaskComment(taskId: $taskId, content: $content) {
      id
      content
      createdAt
      author {
        id
        firstName
        lastName
        avatar
      }
    }
  }
`;

export const DELETE_TASK_COMMENT_MUTATION = gql`
  mutation DeleteTaskComment($id: ID!) {
    deleteTaskComment(id: $id) {
      id
    }
  }
`;

// --- Attachment Mutations (UPDATED for Cloudinary) ---

export const GET_ATTACHMENT_UPLOAD_SIGNATURE_MUTATION = gql`
  mutation GetAttachmentUploadSignature($taskId: ID!) {
    getAttachmentUploadSignature(taskId: $taskId) {
      signature
      timestamp
      apiKey
      cloudName
    }
  }
`;

export const CONFIRM_ATTACHMENT_UPLOAD_MUTATION = gql`
  mutation ConfirmAttachmentUpload($input: ConfirmAttachmentInput!) {
    confirmAttachmentUpload(input: $input) {
      id
      publicId
      fileName
      fileType
      fileSize
      url
      createdAt
      uploader {
        id
        firstName
        lastName
        avatar
      }
    }
  }
`;

export const DELETE_ATTACHMENT_MUTATION = gql`
  mutation DeleteAttachment($id: ID!) {
    deleteAttachment(id: $id) {
      id
    }
  }
`;
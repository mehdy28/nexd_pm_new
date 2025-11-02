// graphql/queries/getTaskDetails.ts
import { gql } from "@apollo/client";

// THE FIX IS HERE: The fragment is now defined on the 'User' type, which matches the schema.
const USER_AVATAR_FRAGMENT = gql`
  fragment UserAvatarPartial on User {
    id
    firstName
    lastName
    avatar
  }
`;

export const GET_TASK_DETAILS_QUERY = gql`
  query GetTaskDetails($id: ID!) {
    task(id: $id) {
      id
      title
      description
      status
      priority
      dueDate
      points
      completed
      assignee {
        ...UserAvatarPartial
      }
      creator {
        ...UserAvatarPartial
      }
      sprint {
        id
        name
      }
      section {
        id
        name
      }
      comments {
        id
        content
        createdAt
        author {
          ...UserAvatarPartial
        }
      }
      attachments {
        id
        publicId
        fileName
        fileType
        fileSize
        url
        createdAt
        uploader {
          ...UserAvatarPartial
        }
      }
      activities {
        id
        type
        data
        createdAt
        user {
          ...UserAvatarPartial
        }
      }
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;
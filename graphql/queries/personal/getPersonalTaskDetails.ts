// graphql/queries/getPersonalTaskDetails.ts
import { gql } from "@apollo/client";

const USER_AVATAR_FRAGMENT = gql`
  fragment UserAvatarPartial on User {
    id
    firstName
    lastName
    avatar
  }
`;

export const GET_PERSONAL_TASK_DETAILS_QUERY = gql`
  query GetPersonalTaskDetails($id: ID!) {
    personalTask(id: $id) {
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
// graphql/queries/getPersonalTaskDetails.ts
import { gql } from "@apollo/client";
import { USER_AVATAR_FRAGMENT } from "../getTaskDetails";
export const GET_PERSONAL_TASK_DETAILS_QUERY = gql `
  query GetPersonalTaskDetails($id: ID!) {
    personalTask(id: $id) {
      id
      title
      description
      status
      priority
      endDate
      startDate
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

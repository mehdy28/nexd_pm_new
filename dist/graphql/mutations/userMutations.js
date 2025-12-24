// graphql/mutations/userMutations.ts
import { gql } from "@apollo/client";
export const UPDATE_MY_PROFILE = gql `
  mutation UpdateMyProfile($firstName: String, $lastName: String, $avatar: String, $avatarColor: String) {
    updateMyProfile(firstName: $firstName, lastName: $lastName, avatar: $avatar, avatarColor: $avatarColor) {
      id
      firstName
      lastName
      avatar
      avatarColor
    }
  }
`;
export const UPDATE_MY_NOTIFICATION_SETTINGS = gql `
  mutation UpdateMyNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateMyNotificationSettings(input: $input) {
      atMention
      taskAssigned
      projectUpdates
      productNews
    }
  }
`;

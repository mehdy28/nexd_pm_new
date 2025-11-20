import { gql } from "@apollo/client"

export const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($firstName: String, $lastName: String, $avatar: String) {
    updateMyProfile(firstName: $firstName, lastName: $lastName, avatar: $avatar) {
      id
      firstName
      lastName
      avatar
    }
  }
`

export const UPDATE_MY_NOTIFICATION_SETTINGS = gql`
  mutation UpdateMyNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateMyNotificationSettings(input: $input) {
      atMention
      taskAssigned
      projectUpdates
      productNews
    }
  }
`
import { gql } from "@apollo/client";

export const CREATE_USER = gql`
  mutation CreateUser(
    $email: String!
    $firstName: String
    $lastName: String
    $role: UserRole
    $invitationToken: String
  ) {
    createUser(
      email: $email
      firstName: $firstName
      lastName: $lastName
      role: $role
      invitationToken: $invitationToken
    ) {
      id
      email
      firstName
      lastName
      avatar
      avatarColor
      role
    }
  }
`;

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      id
      email
      emailVerified
    }
  }
`;


export const RESEND_VERIFICATION_EMAIL = gql`
  mutation ResendVerificationEmail($email: String!) {
    resendVerificationEmail(email: $email)
  }
`;
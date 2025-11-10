import { gql } from '@apollo/client';

export const USER_LOOKUP_PARTIAL_FRAGMENT = gql`
  fragment UserLookupPartialFragment on UserLookupPartial {
    id
    firstName
    lastName
    email
    avatar
  }
`;

export const USER_FULL_DETAILS_FRAGMENT = gql`
  fragment UserFullDetailsFragment on UserFullDetails {
    id
    firstName
    lastName
    email
    avatar
  }
`;

export const WORKSPACE_MEMBER_DETAILS_FRAGMENT = gql`
  fragment WorkspaceMemberDetailsFragment on WorkspaceMemberDetails {
    id
    role
    user {
      ...UserLookupPartialFragment
    }
  }
  ${USER_LOOKUP_PARTIAL_FRAGMENT}
`;

export const WORKSPACE_INVITATION_FRAGMENT = gql`
  fragment WorkspaceInvitationFragment on WorkspaceInvitation {
    id
    email
    role
    status
    expiresAt
    createdAt
    invitedBy {
      id
      email
      firstName
      lastName
    }
  }
`;

export const GET_WORKSPACE_MEMBERS_AND_INVITATIONS = gql`
  query GetWorkspaceMembersAndInvitations($workspaceId: ID!) {
    getWorkspaceMembers(workspaceId: $workspaceId) {
      ...WorkspaceMemberDetailsFragment
    }
    getWorkspaceInvitations(workspaceId: $workspaceId) {
      ...WorkspaceInvitationFragment
    }
  }
  ${WORKSPACE_MEMBER_DETAILS_FRAGMENT}
  ${WORKSPACE_INVITATION_FRAGMENT}
`;

export const INVITE_WORKSPACE_MEMBERS = gql`
  mutation InviteWorkspaceMembers($workspaceId: ID!, $invitations: [WorkspaceInvitationInput!]!) {
    inviteWorkspaceMembers(workspaceId: $workspaceId, invitations: $invitations) {
      ...WorkspaceInvitationFragment
    }
  }
  ${WORKSPACE_INVITATION_FRAGMENT}
`;

export const REVOKE_WORKSPACE_INVITATION = gql`
  mutation RevokeWorkspaceInvitation($invitationId: ID!) {
    revokeWorkspaceInvitation(invitationId: $invitationId) {
      id
      status
    }
  }
`;

export const UPDATE_WORKSPACE_MEMBER_ROLE = gql`
  mutation UpdateWorkspaceMemberRole($memberId: ID!, $role: WorkspaceRole!) {
    updateWorkspaceMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;

export const REMOVE_WORKSPACE_MEMBERS = gql`
  mutation RemoveWorkspaceMembers($memberIds: [ID!]!) {
    removeWorkspaceMembers(memberIds: $memberIds) {
      id
    }
  }
`;

export const GET_WORKSPACE_MEMBERS_FOR_PROJECT_ASSIGNMENT = gql`
  query GetWorkspaceMembersForProjectAssignment($workspaceId: ID!, $projectId: ID!) {
    getWorkspaceMembers(workspaceId: $workspaceId) {
      id
      user {
        ...UserLookupPartialFragment
      }
    }
  }
  ${USER_LOOKUP_PARTIAL_FRAGMENT}
`;


export const ADD_PROJECT_MEMBERS = gql`
  mutation AddProjectMembers($projectId: ID!, $members: [ProjectMemberInput!]!) {
    addProjectMembers(projectId: $projectId, members: $members) {
      id
      role
      user {
        ...UserFullDetailsFragment
      }
    }
  }
  ${USER_FULL_DETAILS_FRAGMENT}
`;

export const UPDATE_PROJECT_MEMBER_ROLE = gql`
  mutation UpdateProjectMemberRole($memberId: ID!, $role: ProjectRole!) {
    updateProjectMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;

export const REMOVE_PROJECT_MEMBERS = gql`
  mutation RemoveProjectMembers($memberIds: [ID!]!) {
    removeProjectMembers(memberIds: $memberIds) {
      id
    }
  }
`;



export const ACCEPT_WORKSPACE_INVITATION = gql`
  mutation AcceptWorkspaceInvitation($token: String!) {
    acceptWorkspaceInvitation(token: $token) {
      id # The ID of the new WorkspaceMember record
      workspace {
        id
        slug
      }
    }
  }
`;
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_WORKSPACE_MEMBERS_AND_INVITATIONS,
  INVITE_WORKSPACE_MEMBERS,
  REVOKE_WORKSPACE_INVITATION,
  UPDATE_WORKSPACE_MEMBER_ROLE,
  REMOVE_WORKSPACE_MEMBERS,
  ADD_PROJECT_MEMBERS,
  UPDATE_PROJECT_MEMBER_ROLE,
  REMOVE_PROJECT_MEMBERS,
  GET_WORKSPACE_MEMBERS_FOR_PROJECT_ASSIGNMENT,
} from '@/graphql/operations/members';
import { WorkspaceRole, ProjectRole } from '@/types/workspace';

interface InvitationInput {
  email: string;
  role: WorkspaceRole;
}

interface ProjectMemberInput {
  userId: string;
  role: ProjectRole;
}

export const useMemberManagement = (workspaceId: string, projectId?: string) => {
  // --- QUERIES ---
  const {
    data: workspaceMembersData,
    loading: workspaceMembersLoading,
    error: workspaceMembersError,
    refetch: refetchWorkspaceMembers,
  } = useQuery(GET_WORKSPACE_MEMBERS_AND_INVITATIONS, {
    variables: { workspaceId },
    skip: !workspaceId,
  });
  
  const {
    data: assignableMembersData,
    loading: assignableMembersLoading,
    error: assignableMembersError,
  } = useQuery(GET_WORKSPACE_MEMBERS_FOR_PROJECT_ASSIGNMENT, {
      variables: { workspaceId, projectId },
      skip: !workspaceId || !projectId,
  });


  // --- MUTATIONS ---
  const [inviteMembers, { loading: inviteLoading, error: inviteError }] = useMutation(
    INVITE_WORKSPACE_MEMBERS,
    {
      onCompleted: () => {
        refetchWorkspaceMembers();
      },
    }
  );

  const [revokeInvitation, { loading: revokeLoading, error: revokeError }] = useMutation(
    REVOKE_WORKSPACE_INVITATION,
    {
      update(cache, { data: { revokeWorkspaceInvitation } }) {
        cache.modify({
          id: cache.identify({ __typename: 'WorkspaceInvitation', id: revokeWorkspaceInvitation.id }),
          fields: {
            status() {
              return revokeWorkspaceInvitation.status;
            },
          },
        });
      },
    }
  );

  const [updateWorkspaceRole, { loading: updateWorkspaceRoleLoading, error: updateWorkspaceRoleError }] =
    useMutation(UPDATE_WORKSPACE_MEMBER_ROLE);

  const [removeWorkspaceMembers, { loading: removeWorkspaceMembersLoading, error: removeWorkspaceMembersError }] =
    useMutation(REMOVE_WORKSPACE_MEMBERS, {
      onCompleted: () => {
        refetchWorkspaceMembers();
      }
    });

  const [addProjectMembers, { loading: addProjectMembersLoading, error: addProjectMembersError }] = useMutation(
    ADD_PROJECT_MEMBERS
  );

  const [updateProjectRole, { loading: updateProjectRoleLoading, error: updateProjectRoleError }] =
    useMutation(UPDATE_PROJECT_MEMBER_ROLE);

  const [removeProjectMembers, { loading: removeProjectMembersLoading, error: removeProjectMembersError }] =
    useMutation(REMOVE_PROJECT_MEMBERS);

  // --- WRAPPER FUNCTIONS ---
  const handleInviteMembers = async (invitations: InvitationInput[]) => {
    return inviteMembers({ variables: { workspaceId, invitations } });
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    return revokeInvitation({ variables: { invitationId } });
  };
  
  const handleUpdateWorkspaceRole = async (memberId: string, role: WorkspaceRole) => {
    return updateWorkspaceRole({ variables: { memberId, role } });
  };
  
  const handleRemoveWorkspaceMembers = async (memberIds: string[]) => {
    return removeWorkspaceMembers({ variables: { memberIds } });
  };

  const handleAddProjectMembers = async (members: ProjectMemberInput[]) => {
      if (!projectId) return;
      return addProjectMembers({ variables: { projectId, members } });
  };
  
  const handleUpdateProjectRole = async (memberId: string, role: ProjectRole) => {
      return updateProjectRole({ variables: { memberId, role } });
  };

  const handleRemoveProjectMembers = async (memberIds: string[]) => {
      if (!projectId) return;
      return removeProjectMembers({ variables: { memberIds } });
  };


  return {
    members: workspaceMembersData?.getWorkspaceMembers || [],
    invitations: workspaceMembersData?.getWorkspaceInvitations || [],
    assignableMembers: assignableMembersData?.getWorkspaceMembers || [],
    loading: workspaceMembersLoading || assignableMembersLoading,
    error: workspaceMembersError || assignableMembersError,
    
    inviteMembers: handleInviteMembers,
    inviteLoading,
    inviteError,

    revokeInvitation: handleRevokeInvitation,
    revokeLoading,
    revokeError,

    updateWorkspaceRole: handleUpdateWorkspaceRole,
    updateWorkspaceRoleLoading,
    updateWorkspaceRoleError,

    removeWorkspaceMembers: handleRemoveWorkspaceMembers,
    removeWorkspaceMembersLoading,
    removeWorkspaceMembersError,

    addProjectMembers: handleAddProjectMembers,
    addProjectMembersLoading,
    addProjectMembersError,

    updateProjectRole: handleUpdateProjectRole,
    updateProjectRoleLoading,
    updateProjectRoleError,
    
    removeProjectMembers: handleRemoveProjectMembers,
    removeProjectMembersLoading,
    removeProjectMembersError,

    refetchWorkspaceMembers,
  };
};
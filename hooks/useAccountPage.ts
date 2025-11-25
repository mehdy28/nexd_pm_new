// hooks/useAccountPage.ts
import { useQuery, useMutation, gql } from "@apollo/client";
import { useMemo } from "react";
import { useUser } from "@/hooks/useUser";
import { UPDATE_MY_PROFILE, UPDATE_MY_NOTIFICATION_SETTINGS } from "@/graphql/mutations/userMutations";
import { GET_ACCOUNT_PAGE_DATA } from "@/graphql/queries/userQuerries";


export const useAccountPage = () => {
  const { user, isLoading: userLoading } = useUser();
  
  const { data, loading: dataLoading, error, refetch } = useQuery(GET_ACCOUNT_PAGE_DATA, {
    fetchPolicy: "network-only"
  });

  const [updateProfile, { loading: updateProfileLoading }] = useMutation(UPDATE_MY_PROFILE);
  const [updateNotifications, { loading: updateNotificationsLoading }] = useMutation(UPDATE_MY_NOTIFICATION_SETTINGS);

  const workspace = data?.getWorkspaceData;
  const notificationSettings = data?.getMyNotificationSettings;

  const isOwner = useMemo(() => {
    if (!user || !workspace) return false;
    // user.id from useUser vs workspace.owner.id
    return user.id === workspace.owner.id;
  }, [user, workspace]);

  return {
    user,
    workspace,
    notificationSettings,
    isOwner,
    loading: userLoading || dataLoading,
    error,
    refetch,
    // Mutations
    updateProfile,
    updateProfileLoading,
    updateNotifications,
    updateNotificationsLoading
  };
};
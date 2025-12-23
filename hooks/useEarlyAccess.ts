import { useCallback } from "react";
import { useMutation, useLazyQuery } from "@apollo/client";
import { CREATE_EARLY_ACCESS_USER } from "@/graphql/mutations/earlyAccess";
import { GET_EARLY_ACCESS_USERS } from "@/graphql/queries/earlyAccess";

interface EarlyAccessUserInput {
  name: string;
  email: string;
}

export interface EarlyAccessUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function useEarlyAccess() {
  const [
    createEarlyAccessUserMutation,
    { loading: mutationLoading, error: mutationError },
  ] = useMutation(CREATE_EARLY_ACCESS_USER);

  const [
    getEarlyAccessUsersQuery,
    { loading: queryLoading, error: queryError, data: queryData },
  ] = useLazyQuery< { earlyAccessUsers: EarlyAccessUser[] } >(GET_EARLY_ACCESS_USERS, {
    fetchPolicy: "network-only", // Always fetch the latest list from the server
  });

  const joinWaitlist = useCallback(
    async ({ name, email }: EarlyAccessUserInput) => {
      console.log("[useEarlyAccess][joinWaitlist] Attempting to sign up:", email);
      try {
        const response = await createEarlyAccessUserMutation({
          variables: { name, email },
        });
        if (response.data?.createEarlyAccessUser) {
          console.log("[useEarlyAccess][joinWaitlist] Success:", response.data.createEarlyAccessUser);
          return { success: true, data: response.data.createEarlyAccessUser };
        }
        // This case should ideally not be hit if the mutation is set up correctly
        throw new Error("Failed to add to waitlist. No data returned.");
      } catch (err: any) {
        console.error("[useEarlyAccess][joinWaitlist] Error:", err.message);
        return { success: false, error: err.message };
      }
    },
    [createEarlyAccessUserMutation]
  );

  const fetchWaitlist = useCallback(async () => {
    console.log("[useEarlyAccess][fetchWaitlist] Fetching waitlist...");
    try {
      await getEarlyAccessUsersQuery();
    } catch (err: any) {
      console.error("[useEarlyAccess][fetchWaitlist] Error fetching list:", err.message);
      // The error state from the hook will be populated automatically
    }
  }, [getEarlyAccessUsersQuery]);

  return {
    // Mutation-related exports
    joinWaitlist,
    mutationLoading,
    mutationError,

    // Query-related exports
    fetchWaitlist,
    waitlistUsers: queryData?.earlyAccessUsers,
    queryLoading,
    queryError,
  };
}
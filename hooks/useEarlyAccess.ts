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
      try {
        const response = await createEarlyAccessUserMutation({
          variables: { name, email },
        });

        // This check is now robust. It only passes if data exists and is not null.
        if (response.data?.createEarlyAccessUser) {
          return { success: true, data: response.data.createEarlyAccessUser };
        }
        

      } catch (err: any) {
        // This is the critical change. When the server returns a GraphQL error (like the duplicate email),
        // the mutation throws, and we land here. We now correctly extract the server's message.
        console.error("[useEarlyAccess][joinWaitlist] Error:", err.message);
        return { success: false, error: err.message };
      }
    },
    [createEarlyAccessUserMutation]
  );

  const fetchWaitlist = useCallback(async () => {
    try {
      await getEarlyAccessUsersQuery();
    } catch (err: any) {
      console.error("[useEarlyAccess][fetchWaitlist] Error fetching list:", err.message);
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
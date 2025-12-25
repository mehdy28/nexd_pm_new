//hooks/useEarlyAccess.ts
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
  ] = useLazyQuery<{ earlyAccessUsers: EarlyAccessUser[] }>(
    GET_EARLY_ACCESS_USERS,
    {
      fetchPolicy: "network-only", // Always fetch the latest list from the server
    }
  );

  const joinWaitlist = useCallback(
    async ({ name, email }: EarlyAccessUserInput) => {
      try {
        const response = await createEarlyAccessUserMutation({
          variables: { name, email },
        });

        if (response.data?.createEarlyAccessUser) {
          return { success: true, data: response.data.createEarlyAccessUser };
        }

        // Handle cases where the mutation technically succeeds but returns no data,
        // preventing an implicit 'undefined' return which would crash the component.
        const errorMessage =
          mutationError?.message || "An unexpected error occurred.";
        console.error(
          "[useEarlyAccess][joinWaitlist] Mutation succeeded but returned no data.",
          response
        );
        return { success: false, error: errorMessage };
      } catch (err: any) {
        // This correctly catches GraphQL errors (like duplicate email) and network errors.
        console.error("[useEarlyAccess][joinWaitlist] Error:", err.message);
        return { success: false, error: err.message };
      }
    },
    [createEarlyAccessUserMutation, mutationError]
  );

  const fetchWaitlist = useCallback(async () => {
    try {
      await getEarlyAccessUsersQuery();
    } catch (err: any) {
      console.error(
        "[useEarlyAccess][fetchWaitlist] Error fetching list:",
        err.message
      );
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
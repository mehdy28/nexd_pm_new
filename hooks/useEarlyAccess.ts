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
  ] = useMutation(CREATE_EARLY_ACCESS_USER, {
    // FIX: This policy ensures that if the server returns GraphQL errors,
    // the mutation promise will be rejected, forcing execution into the catch block.
    errorPolicy: 'none',
  });

  const [
    getEarlyAccessUsersQuery,
    { loading: queryLoading, error: queryError, data: queryData },
  ] = useLazyQuery<{ earlyAccessUsers: EarlyAccessUser[] }>(
    GET_EARLY_ACCESS_USERS,
    {
      fetchPolicy: 'network-only', // Always fetch the latest list from the server
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

        const errorMessage = mutationError?.message || "An unexpected error occurred.";
        console.error(
          "[useEarlyAccess][joinWaitlist] LOGICAL ERROR: Mutation succeeded but returned no data.",
          response
        );
        return { success: false, error: errorMessage };

      } catch (err: any) {
        console.error("[useEarlyAccess][joinWaitlist] CATCH BLOCK: Full error object caught:", JSON.stringify(err, null, 2));

        const specificErrorMessage =
          err.graphQLErrors && err.graphQLErrors.length > 0
            ? err.graphQLErrors[0].message
            : err.message;
        

        return { success: false, error: specificErrorMessage };
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
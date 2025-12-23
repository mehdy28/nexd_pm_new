import { useMutation } from "@apollo/client";
import { GET_WORKSPACE_DATA_QUERY } from "@/graphql/queries/getWorkspaceData";
import { UPDATE_WORKSPACE_MUTATION } from "@/graphql/mutations/updateWorkspace";
import { UpdateWorkspaceInput, UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables } from "@/graphql/types";

export function useWorkspaceMutations() {
  const [mutate, { loading, error }] = useMutation<UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables>(UPDATE_WORKSPACE_MUTATION, {
    refetchQueries: [{ query: GET_WORKSPACE_DATA_QUERY }],
    awaitRefetchQueries: true,
  });

  const updateWorkspace = (payload: UpdateWorkspaceInput) => {
    
    const variables = {
      input: payload,
    };
    

    return mutate({
      variables,
    });
  };

  return { updateWorkspace, loading, error };
}
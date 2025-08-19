import { useQuery, useMutation } from "@apollo/client"
import { GET_WORKSPACES, GET_WORKSPACE } from "@/graphql/queries/workspace"
import { CREATE_WORKSPACE, UPDATE_WORKSPACE, DELETE_WORKSPACE } from "@/graphql/mutations/workspace"

export function useWorkspaces() {
  const { data, loading, error, refetch } = useQuery(GET_WORKSPACES)

  return {
    workspaces: data?.workspaces || [],
    loading,
    error,
    refetch,
  }
}

export function useWorkspace(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_WORKSPACE, {
    variables: { id },
    skip: !id,
  })

  return {
    workspace: data?.workspace,
    loading,
    error,
    refetch,
  }
}

export function useCreateWorkspace() {
  const [createWorkspace, { loading, error }] = useMutation(CREATE_WORKSPACE, {
    refetchQueries: [{ query: GET_WORKSPACES }],
  })

  return {
    createWorkspace,
    loading,
    error,
  }
}

export function useUpdateWorkspace() {
  const [updateWorkspace, { loading, error }] = useMutation(UPDATE_WORKSPACE)

  return {
    updateWorkspace,
    loading,
    error,
  }
}

export function useDeleteWorkspace() {
  const [deleteWorkspace, { loading, error }] = useMutation(DELETE_WORKSPACE, {
    refetchQueries: [{ query: GET_WORKSPACES }],
  })

  return {
    deleteWorkspace,
    loading,
    error,
  }
}

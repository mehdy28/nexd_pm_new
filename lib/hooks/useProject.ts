import { useQuery, useMutation } from "@apollo/client"
import { GET_PROJECTS, GET_PROJECT } from "@/graphql/queries/project"
import { CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT } from "@/graphql/mutations/project"

export function useProjects(workspaceId?: string) {
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS, {
    variables: { workspaceId },
    skip: !workspaceId,
  })

  return {
    projects: data?.projects || [],
    loading,
    error,
    refetch,
  }
}

export function useProject(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_PROJECT, {
    variables: { id },
    skip: !id,
  })

  return {
    project: data?.project,
    loading,
    error,
    refetch,
  }
}

export function useCreateProject() {
  const [createProject, { loading, error }] = useMutation(CREATE_PROJECT)

  return {
    createProject,
    loading,
    error,
  }
}

export function useUpdateProject() {
  const [updateProject, { loading, error }] = useMutation(UPDATE_PROJECT)

  return {
    updateProject,
    loading,
    error,
  }
}

export function useDeleteProject() {
  const [deleteProject, { loading, error }] = useMutation(DELETE_PROJECT)

  return {
    deleteProject,
    loading,
    error,
  }
}

import { useQuery, useMutation } from "@apollo/client"
import { GET_TASKS, GET_TASK } from "@/graphql/queries/task"
import { CREATE_TASK, UPDATE_TASK, DELETE_TASK } from "@/graphql/mutations/task"

export function useTasks(projectId?: string, userId?: string, personal?: boolean) {
  const { data, loading, error, refetch } = useQuery(GET_TASKS, {
    variables: { projectId, userId, personal },
  })

  return {
    tasks: data?.tasks || [],
    loading,
    error,
    refetch,
  }
}

export function useTask(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_TASK, {
    variables: { id },
    skip: !id,
  })

  return {
    task: data?.task,
    loading,
    error,
    refetch,
  }
}

export function useCreateTask() {
  const [createTask, { loading, error }] = useMutation(CREATE_TASK)

  return {
    createTask,
    loading,
    error,
  }
}

export function useUpdateTask() {
  const [updateTask, { loading, error }] = useMutation(UPDATE_TASK)

  return {
    updateTask,
    loading,
    error,
  }
}

export function useDeleteTask() {
  const [deleteTask, { loading, error }] = useMutation(DELETE_TASK)

  return {
    deleteTask,
    loading,
    error,
  }
}

export function usePersonalTasks(userId: string) {
  const { data, loading, error, refetch } = useQuery(GET_TASKS, {
    variables: { userId, personal: true },
    skip: !userId,
  })

  return {
    tasks: data?.tasks || [],
    loading,
    error,
    refetch,
  }
}

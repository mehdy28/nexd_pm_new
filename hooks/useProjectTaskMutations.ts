import { useMutation, useApolloClient, gql } from "@apollo/client"
import { useCallback } from "react"
import { CREATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/createProjectTask"
import { UPDATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/updateProjectTask"
import { DELETE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/deleteProjectTask"
import { DELETE_MANY_PROJECT_TASKS_MUTATION } from "@/graphql/mutations/deleteManyProjectTasks"
import { Priority, TaskStatus } from "@prisma/client"
import { TaskStatusUI } from "./useProjectTasksAndSections"

// --- Mutation Variable Interfaces ---
interface CreateProjectTaskVariables {
  input: {
    projectId: string
    sectionId: string
    title: string
    description?: string | null
    status?: TaskStatus
    priority?: Priority
    endDate?: string | null
    assigneeId?: string | null
    sprintId?: string | null
    points?: number | null
  }
}

interface UpdateProjectTaskVariables {
  input: {
    id: string
    title?: string | null
    description?: string | null
    status?: TaskStatus
    priority?: Priority
    endDate?: string | null
    assigneeId?: string | null
    sprintId?: string | null
    points?: number | null
    sectionId?: string | null
  }
}

interface TaskWithSectionId {
  taskId: string
  sectionId: string
}

// --- Main Hook ---
export function useProjectTaskMutations(projectId: string, currentSprintId?: string | null) {
  const client = useApolloClient()

  const [createProjectTaskApolloMutation, { loading: createLoading, error: createError }] = useMutation(
    CREATE_PROJECT_TASK_MUTATION
  )

  const [updateProjectTaskApolloMutation, { loading: updateLoading, error: updateError }] = useMutation(
    UPDATE_PROJECT_TASK_MUTATION
  )

  const [deleteProjectTaskApolloMutation, { loading: deleteLoading, error: deleteError }] = useMutation(
    DELETE_PROJECT_TASK_MUTATION
  )

  const [deleteManyProjectTasksApolloMutation, { loading: deleteManyLoading, error: deleteManyError }] = useMutation(
    DELETE_MANY_PROJECT_TASKS_MUTATION
  )

  const createTask = useCallback(
    async (sectionId: string, input: Omit<CreateProjectTaskVariables["input"], "projectId" | "sectionId">) => {
      const optimisticId = `optimistic-${Date.now()}`

      const mutationVariables = {
        input: {
          projectId,
          sectionId,
          ...input,
          sprintId: input.sprintId ?? currentSprintId,
        },
      }

      const optimisticResponsePayload = {
        createProjectTask: {
          __typename: "TaskListView",
          id: optimisticId,
          title: input.title,
          description: input.description || null,
          status: input.status || "TODO",
          priority: input.priority || "MEDIUM",
          endDate: input.endDate || null,
          points: input.points || null,
          assignee: null,
          sprintId: mutationVariables.input.sprintId,
          sectionId: sectionId,
          completed: false,
          commentCount: 0,
          attachmentCount: 0,
        },
      }

      return createProjectTaskApolloMutation({
        variables: mutationVariables,
        optimisticResponse: optimisticResponsePayload,
        update: (cache, { data }) => {
          const newTask = data?.createProjectTask
          if (!newTask) return

          const sectionCacheId = cache.identify({ __typename: "SectionWithTasks", id: sectionId })
          if (!sectionCacheId) return

          cache.modify({
            id: sectionCacheId,
            fields: {
              tasks(existingTasks = [], { readField }) {
                const withoutOptimistic = existingTasks.filter(t => readField("id", t) !== optimisticId)
                const newTaskRef = cache.identify(newTask)
                return [...withoutOptimistic, { __ref: newTaskRef }]
              },
            },
          })
        },
      })
    },
    [projectId, currentSprintId, createProjectTaskApolloMutation]
  )

  const updateTask = useCallback(
    async (taskId: string, currentSectionId: string, input: Omit<UpdateProjectTaskVariables["input"], "id">) => {

      // WORKAROUND: Remove sprintId from the fragment to ensure the read succeeds even if the cache is inconsistent.
      const fragment = gql`
        fragment ExistingProjectTaskData on TaskListView {
          id
          title
          description
          status
          priority
          endDate
          points
          completed
          sectionId
          commentCount
          attachmentCount
          assignee {
            id
            firstName
            lastName
            avatar
            __typename
          }
        }
      `
      const fragmentId = `TaskListView:${taskId}`
      const taskFragment = client.readFragment({ id: fragmentId, fragment })

      if (!taskFragment) {
        console.error(`❌ [updateTask] FATAL: Could not find task ${taskId} in cache. Aborting optimistic update.`)
        return updateProjectTaskApolloMutation({ variables: { input: { id: taskId, ...input } } })
      }

      const optimisticResponsePayload = {
        __typename: "TaskListView",
        ...taskFragment,
        // WORKAROUND: Manually add sprintId back to the payload using the hook's current sprintId.
        // This ensures the object being written to the cache is complete.
        sprintId: (taskFragment as any).sprintId || currentSprintId,
        ...input,
      }

      try {
        return await updateProjectTaskApolloMutation({
          variables: { input: { id: taskId, ...input } },
          optimisticResponse: {
            updateProjectTask: optimisticResponsePayload,
          },
          update: (cache, { data }) => {
            const updatedTask = data?.updateProjectTask
            if (!updatedTask) return

            const newSectionId = input.sectionId
            if (newSectionId && newSectionId !== currentSectionId) {
              const oldSectionCacheId = cache.identify({ __typename: "SectionWithTasks", id: currentSectionId })
              if (oldSectionCacheId) {
                cache.modify({
                  id: oldSectionCacheId,
                  fields: {
                    tasks: (existingTaskRefs = [], { readField }) =>
                      existingTaskRefs.filter(ref => readField("id", ref) !== updatedTask.id),
                  },
                })
              }

              const newSectionCacheId = cache.identify({ __typename: "SectionWithTasks", id: newSectionId })
              if (newSectionCacheId) {
                cache.modify({
                  id: newSectionCacheId,
                  fields: {
                    tasks(existingTaskRefs = [], { readField }) {
                      const newTaskRef = cache.identify(updatedTask)
                      if (existingTaskRefs.some(ref => readField("id", ref) === updatedTask.id)) {
                        return existingTaskRefs
                      }
                      return [{ __ref: newTaskRef }, ...existingTaskRefs]
                    },
                  },
                })
              }
            }
          },
        })
      } catch (error) {
        console.error(`❌ [updateTask] Error during mutation for task ${taskId}:`, error)
        throw error
      }
    },
    [updateProjectTaskApolloMutation, client, currentSprintId]
  )

  const toggleTaskCompleted = useCallback(
    async (taskId: string, sectionId: string, currentStatus: TaskStatusUI) => {
      const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
      return updateTask(taskId, sectionId, { status: newStatus })
    },
    [updateTask]
  )

  const deleteTask = useCallback(
    async (taskId: string, sectionId: string) => {

      return deleteProjectTaskApolloMutation({
        variables: { id: taskId },
        // THIS IS THE FIX: Optimistic response is removed to prevent reactivity issues.
        // The update function will now run only once with the final server data.
        update: (cache, { data }) => {
          const deletedTask = data?.deleteProjectTask

          if (!deletedTask || !deletedTask.id) {
            console.warn("[deleteTask Cache Update] No deleted task data returned. Aborting cache update.")
            return
          }

          if (sectionId) {
            const sectionCacheId = cache.identify({ __typename: "SectionWithTasks", id: sectionId })
            if (sectionCacheId) {
              const currentSectionData = cache.readFragment<{ tasks: { id: string }[] }>({
                id: sectionCacheId,
                fragment: gql`
                  fragment SectionTasks on SectionWithTasks {
                    tasks {
                      id
                    }
                  }
                `,
              })
              const taskIdsBefore = currentSectionData?.tasks.map(t => t.id) || ["CACHE READ FAILED"]


              cache.modify({
                id: sectionCacheId,
                fields: {
                  tasks: (existingTaskRefs = [], { readField }) => {
                    const initialCount = existingTaskRefs.length
                    const updatedTaskRefs = existingTaskRefs.filter(ref => readField("id", ref) !== deletedTask.id)

                    return updatedTaskRefs
                  },
                },
              })

              const sectionDataAfter = cache.readFragment<{ tasks: { id: string }[] }>({
                id: sectionCacheId,
                fragment: gql`
                  fragment SectionTasksAfter on SectionWithTasks {
                    tasks {
                      id
                    }
                  }
                `,
              })
              const taskIdsAfter = sectionDataAfter?.tasks.map(t => t.id) || ["CACHE READ FAILED"]

            } else {
              console.warn(`[deleteTask Cache Update] Could not find section ${sectionId} in cache.`)
            }
          } else {
            console.warn("[deleteTask Cache Update] sectionId was not provided. Cannot update section tasks.")
          }

          const taskCacheId = cache.identify({ __typename: "TaskListView", id: deletedTask.id })
          if (taskCacheId) {
            const evicted = cache.evict({ id: taskCacheId })
            cache.gc()
          }
        },
      })
    },
    [deleteProjectTaskApolloMutation]
  )

  const deleteManyTasks = useCallback(
    async (tasks: TaskWithSectionId[]) => {
      const taskIds = tasks.map(t => t.taskId)

      return deleteManyProjectTasksApolloMutation({
        variables: { ids: taskIds },
        update: (cache, { data }) => {
          const deletedTasks = data?.deleteManyProjectTasks
          if (!deletedTasks || deletedTasks.length === 0) {
            console.warn(`[deleteManyTasks Cache Update] No deleted tasks data returned. Aborting cache update.`)
            return
          }

          const tasksBySection = deletedTasks.reduce(
            (acc, task) => {
              if (task.sectionId) {
                if (!acc[task.sectionId]) {
                  acc[task.sectionId] = []
                }
                acc[task.sectionId].push(task.id)
              }
              return acc
            },
            {} as Record<string, string[]>
          )


          for (const sectionId in tasksBySection) {
            const deletedIds = new Set(tasksBySection[sectionId])
            const sectionCacheId = cache.identify({ __typename: "SectionWithTasks", id: sectionId })

            if (sectionCacheId) {
              cache.modify({
                id: sectionCacheId,
                fields: {
                  tasks(existingTaskRefs = [], { readField }) {
                    const updatedTasks = existingTaskRefs.filter(
                      taskRef => !deletedIds.has(readField("id", taskRef))
                    )
                    return updatedTasks
                  },
                },
              })
            }
          }

          deletedTasks.forEach(task => {
            const taskCacheId = cache.identify({ __typename: "TaskListView", id: task.id })
            if (taskCacheId) {
              cache.evict({ id: taskCacheId })
            }
          })
          cache.gc()
        },
      })
    },
    [deleteManyProjectTasksApolloMutation]
  )

  return {
    createTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    deleteManyTasks,
    createLoading,
    deleteManyLoading,
    deleteLoading,
    updateLoading,
    taskMutationError: createError || updateError || deleteError || deleteManyError,
  }
}
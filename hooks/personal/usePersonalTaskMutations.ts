//hooks/personal/usePersonalTaskMutations.ts
import { useMutation, useApolloClient, gql } from "@apollo/client"
import { useCallback } from "react"
import { CREATE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/createPersonalTask"
import { UPDATE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/updatePersonalTask"
import { DELETE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/deletePersonalTask"
import { DELETE_MANY_PERSONAL_TASKS_MUTATION } from "@/graphql/mutations/personal/deleteManyPersonalTasks"
import { Priority } from "@prisma/client"
import { TaskStatusUI } from "./useMyTasksAndSections"

// --- Mutation Variable Interfaces ---
interface CreatePersonalTaskVariables {
  input: {
    personalSectionId?: string
    title?: string
    description?: string | null
    status?: "TODO" | "DONE"
    priority?: Priority
    endDate?: string | null
    points?: number | null
  }
}

interface UpdatePersonalTaskVariables {
  input: {
    id: string
    title?: string | null
    description?: string | null
    status?: "TODO" | "DONE"
    priority?: Priority
    endDate?: string | null
    startDate?: string | null
    points?: number | null
    personalSectionId?: string | null
  }
}

interface TaskWithSectionId {
  taskId: string
  personalSectionId: string
}

// --- Main Hook ---
export function usePersonalTaskmutations() {
  const client = useApolloClient()

  const [createPersonalTaskApolloMutation, { loading: createLoading, error: createError }] = useMutation(
    CREATE_PERSONAL_TASK_MUTATION
  )

  const [updatePersonalTaskApolloMutation, { loading: updateLoading, error: updateError }] =
    useMutation(UPDATE_PERSONAL_TASK_MUTATION)

  const [deletePersonalTaskApolloMutation, { loading: deleteLoading, error: deleteError }] = useMutation(
    DELETE_PERSONAL_TASK_MUTATION
  )

  const [deleteManyPersonalTasksApolloMutation, { loading: deleteManyLoading, error: deleteManyError }] = useMutation(
    DELETE_MANY_PERSONAL_TASKS_MUTATION
  )

  const createTask = useCallback(
    async (personalSectionId: string, input: Omit<CreatePersonalTaskVariables["input"], "personalSectionId">) => {
      const optimisticId = `optimistic-${Date.now()}`

      const mutationVariables = {
        input: {
          personalSectionId: personalSectionId,
          ...input,
        },
      }

      const optimisticResponsePayload = {
        createPersonalTask: {
          __typename: "TaskListView",
          id: optimisticId,
          description: input.description || null,
          endDate: input.endDate || null,
          points: input.points || null,
          priority: input.priority || "MEDIUM",
          status: input.status || "TODO",
          title: input.title,
          personalSectionId: personalSectionId,
          completed: false,
          sprintId: null,
          startDate: null,
          assignee: null,
        },
      }

      return createPersonalTaskApolloMutation({
        variables: mutationVariables,
        optimisticResponse: optimisticResponsePayload,
        update: (cache, { data }) => {
          const newTask = data?.createPersonalTask
          if (!newTask) {
            console.warn(`[createTask Cache Update] No new task data returned. Aborting cache update.`)
            return
          }

          // FIX: Use the correct typename for the section object.
          const sectionCacheId = cache.identify({ __typename: "PersonalSectionWithTasks", id: personalSectionId })
          if (!sectionCacheId) {
            console.error(`[createTask Cache Update] Could not identify section with ID ${personalSectionId} in cache.`)
            return
          }

          cache.modify({
            id: sectionCacheId,
            fields: {
              tasks(existingTasks = [], { readField }) {
                const withoutOptimistic = existingTasks.filter((t: any) => readField("id", t) !== optimisticId)
                const newTaskRef = cache.identify(newTask)
                const updatedTasks = [...withoutOptimistic, { __ref: newTaskRef }]
                return updatedTasks
              },
            },
          })
        },
      })
    },
    [createPersonalTaskApolloMutation]
  )

  const updateTask = useCallback(
    async (
      taskId: string,
      currentSectionId: string,
      input: Omit<UpdatePersonalTaskVariables["input"], "id">
    ) => {
      // LOG 1: Log the initial call to see what's being updated.

      // FIX: Removed sprintId as it causes cache miss if not fetched by main query.
      // Kept startDate as it is needed for UI sorting/priority logic.
      const fragment = gql`
        fragment ExistingTaskData on TaskListView {
          id
          title
          description
          status
          priority
          endDate
          startDate
          points
          completed
          personalSectionId
          assignee {
            id
            firstName
            lastName
            avatar
            __typename
          }
        }
      `

      // LOG 2: Announce the attempt to read from cache.

      const taskFragment = client.readFragment({
        id: `TaskListView:${taskId}`,
        fragment,
      })

      // LOG 3: Log the result of the fragment read.

      if (!taskFragment) {
        console.error(
          `❌ [updateTask] FATAL: Could not find task with ID ${taskId} in the cache. The fragment query might be wrong or the task is not in the store. Aborting optimistic update.`
        )
        return updatePersonalTaskApolloMutation({ variables: { input: { id: taskId, ...input } } })
      }

      // FIX: Determine the correct personalSectionId for the optimistic response.
      const resolvedSectionId =
        input.personalSectionId !== undefined
          ? input.personalSectionId
          : taskFragment.personalSectionId ?? currentSectionId

      const optimisticResponsePayload = {
        __typename: "TaskListView",
        ...taskFragment,
        ...input,
        personalSectionId: resolvedSectionId,
      }

      // LOG 4: Log the complete object that will be used for the optimistic update.

      try {
        return await updatePersonalTaskApolloMutation({
          variables: { input: { id: taskId, ...input } },
          optimisticResponse: {
            updatePersonalTask: optimisticResponsePayload,
          },
          update: (cache, { data }) => {
            // LOG 5: Log what the update function receives after the mutation.

            const updatedTask = data?.updatePersonalTask
            if (!updatedTask) {
              console.warn("🔄 [updateTask Cache Update] No updated task data returned. Aborting cache update.")
              return
            }

            const newSectionId = input.personalSectionId
            if (newSectionId && newSectionId !== currentSectionId) {


              // FIX: Use the correct typename for the section object.
              const oldSectionCacheId = cache.identify({
                __typename: "PersonalSectionWithTasks",
                id: currentSectionId,
              })
              if (oldSectionCacheId) {

                cache.modify({
                  id: oldSectionCacheId,
                  fields: {
                    tasks(existingTaskRefs = [], { readField }) {
                      const filteredTasks = existingTaskRefs.filter(
                        taskRef => readField("id", taskRef) !== updatedTask.id
                      )

                      return filteredTasks
                    },
                  },
                })
              } else {
                console.warn(
                  `🔄 [updateTask Cache Update] Could not find old section ${currentSectionId} in cache to remove task from.`
                )
              }

              // FIX: Use the correct typename for the section object.
              const newSectionCacheId = cache.identify({ __typename: "PersonalSectionWithTasks", id: newSectionId })
              if (newSectionCacheId) {

                cache.modify({
                  id: newSectionCacheId,
                  fields: {
                    tasks(existingTaskRefs = [], { readField }) {
                      const newTaskRef = cache.identify(updatedTask)
                      if (existingTaskRefs.some(ref => readField("id", ref) === updatedTask.id)) {

                        return existingTaskRefs
                      }
                      const updatedTasks = [{ __ref: newTaskRef }, ...existingTaskRefs]

                      return updatedTasks
                    },
                  },
                })
              } else {
                console.warn(
                  `🔄 [updateTask Cache Update] Could not find new section ${newSectionId} in cache to add task to.`
                )
              }
            } else {

            }
          },
        })
      } catch (error) {
        // LOG 6: Catch and log any errors from the mutation call itself.
        console.error(`❌ [updateTask] Error during mutation for task ${taskId}:`, error)
        throw error
      }
    },
    [updatePersonalTaskApolloMutation, client]
  )

  const toggleTaskCompleted = useCallback(
    async (taskId: string, personalSectionId: string, currentStatus: TaskStatusUI) => {

      const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
      return updateTask(taskId, personalSectionId, { status: newStatus })
    },
    [updateTask]
  )

  const deleteTask = useCallback(
    async (taskId: string, personalSectionId: string) => {

      if (!personalSectionId) {
        console.error(
          `[deleteTask] CRITICAL: personalSectionId was not provided. The task will be deleted from the server, but the UI may not update correctly because the parent section's cache cannot be modified.`
        )
      }

      const mutationVariables = { id: taskId }

      return deletePersonalTaskApolloMutation({
        variables: mutationVariables,
        // THIS IS THE FIX: optimisticResponse is removed.
        update: (cache, { data }) => {
          const deletedTask = data?.deletePersonalTask
          if (!deletedTask || !deletedTask.id) {
            console.warn(`[deleteTask Cache Update] No deleted task data returned. Aborting cache update.`)
            return
          }
          const deletedTaskId = deletedTask.id

          if (personalSectionId) {
            // FIX: Use the correct typename for the section object.
            const sectionCacheId = cache.identify({ __typename: "PersonalSectionWithTasks", id: personalSectionId })
            if (sectionCacheId) {
              cache.modify({
                id: sectionCacheId,
                fields: {
                  tasks(existingTaskRefs = [], { readField }) {

                    const updatedTasks = existingTaskRefs.filter(taskRef => readField("id", taskRef) !== deletedTaskId)
                    return updatedTasks
                  },
                },
              })
            } else {
              console.warn(
                `[deleteTask Cache Update] Could not identify section with ID ${personalSectionId} in cache. Cannot remove task from section's task list.`
              )
            }
          } else {
            console.warn(
              `[deleteTask Cache Update] No personalSectionId provided to update function. Cannot remove task from any section's task list.`
            )
          }

          const taskCacheId = cache.identify({ __typename: "TaskListView", id: deletedTaskId })
          if (taskCacheId) {
            cache.evict({ id: taskCacheId })
          } else {
            console.warn(`[deleteTask Cache Update] Could not find task ${deletedTaskId} in cache to evict.`)
          }
          cache.gc()
        },
      })
    },
    [deletePersonalTaskApolloMutation]
  )

  const deleteManyTasks = useCallback(
    async (tasks: TaskWithSectionId[]) => {
      const taskIds = tasks.map(t => t.taskId)

      return deleteManyPersonalTasksApolloMutation({
        variables: { ids: taskIds },
        update: (cache, { data }) => {
          const deletedTasks = data?.deleteManyPersonalTasks
          if (!deletedTasks || deletedTasks.length === 0) {
            console.warn(`[deleteManyTasks Cache Update] No deleted tasks data returned. Aborting cache update.`)
            return
          }

          // Group tasks by section ID for efficient cache updates
          const tasksBySection = deletedTasks.reduce(
            (acc, task) => {
              if (task.personalSectionId) {
                if (!acc[task.personalSectionId]) {
                  acc[task.personalSectionId] = []
                }
                acc[task.personalSectionId].push(task.id)
              }
              return acc
            },
            {} as Record<string, string[]>
          )


          // Update each affected section
          for (const sectionId in tasksBySection) {
            const deletedIds = new Set(tasksBySection[sectionId])
            const sectionCacheId = cache.identify({ __typename: "PersonalSectionWithTasks", id: sectionId })

            if (sectionCacheId) {
              cache.modify({
                id: sectionCacheId,
                fields: {
                  tasks(existingTaskRefs = [], { readField }) {
                    const originalCount = existingTaskRefs.length
                    const updatedTasks = existingTaskRefs.filter(
                      taskRef => !deletedIds.has(readField("id", taskRef))
                    )

                    return updatedTasks
                  },
                },
              })
            } else {
              console.warn(`[deleteManyTasks Cache Update] Could not identify section with ID ${sectionId} in cache.`)
            }
          }

          // Evict all deleted tasks from the root cache
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
    [deleteManyPersonalTasksApolloMutation]
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
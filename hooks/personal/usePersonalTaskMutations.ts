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
  console.log("[usePersonalTaskmutations] Hook initialized.")
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
      console.log(`[createTask] Initiated. Section ID: ${personalSectionId}, Input:`, input)
      const optimisticId = `optimistic-${Date.now()}`
      console.log(`[createTask] Generated optimistic ID: ${optimisticId}`)

      const mutationVariables = {
        input: {
          personalSectionId: personalSectionId,
          ...input,
        },
      }
      console.log(`[createTask] Mutation variables:`, mutationVariables)

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
      console.log(`[createTask] Optimistic response payload:`, optimisticResponsePayload)

      return createPersonalTaskApolloMutation({
        variables: mutationVariables,
        optimisticResponse: optimisticResponsePayload,
        update: (cache, { data }) => {
          console.log(`[createTask Cache Update] Received data from mutation:`, data)
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

          console.log(`[createTask Cache Update] Modifying cache for section: ${sectionCacheId}`)
          cache.modify({
            id: sectionCacheId,
            fields: {
              tasks(existingTasks = [], { readField }) {
                console.log(
                  `[createTask Cache Update] Updating tasks field. Found ${existingTasks.length} existing tasks.`
                )
                const withoutOptimistic = existingTasks.filter((t: any) => readField("id", t) !== optimisticId)
                const newTaskRef = cache.identify(newTask)
                console.log(`[createTask Cache Update] Adding new task ref: ${newTaskRef}`)
                const updatedTasks = [...withoutOptimistic, { __ref: newTaskRef }]
                console.log(`[createTask Cache Update] New task list length: ${updatedTasks.length}`)
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
      console.log(`🚀 [updateTask] Initiated. Task ID: ${taskId}, Input:`, input)

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
      console.log(`🔍 [updateTask] Reading fragment from cache for ID: TaskListView:${taskId}`)

      const taskFragment = client.readFragment({
        id: `TaskListView:${taskId}`,
        fragment,
      })

      // LOG 3: Log the result of the fragment read.
      console.log("📦 [updateTask] Fragment read result:", taskFragment)

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
      console.log("✨ [updateTask] Constructed optimistic response payload:", optimisticResponsePayload)

      try {
        return await updatePersonalTaskApolloMutation({
          variables: { input: { id: taskId, ...input } },
          optimisticResponse: {
            updatePersonalTask: optimisticResponsePayload,
          },
          update: (cache, { data }) => {
            // LOG 5: Log what the update function receives after the mutation.
            console.log("🔄 [updateTask Cache Update] Received data:", data)

            const updatedTask = data?.updatePersonalTask
            if (!updatedTask) {
              console.warn("🔄 [updateTask Cache Update] No updated task data returned. Aborting cache update.")
              return
            }

            const newSectionId = input.personalSectionId
            if (newSectionId && newSectionId !== currentSectionId) {
              console.log(
                `🔄 [updateTask Cache Update] Task moved from section ${currentSectionId} to ${newSectionId}.`
              )

              // FIX: Use the correct typename for the section object.
              const oldSectionCacheId = cache.identify({
                __typename: "PersonalSectionWithTasks",
                id: currentSectionId,
              })
              if (oldSectionCacheId) {
                console.log(
                  `🔄 [updateTask Cache Update] Removing task ${updatedTask.id} from old section ${oldSectionCacheId}.`
                )
                cache.modify({
                  id: oldSectionCacheId,
                  fields: {
                    tasks(existingTaskRefs = [], { readField }) {
                      const filteredTasks = existingTaskRefs.filter(
                        taskRef => readField("id", taskRef) !== updatedTask.id
                      )
                      console.log(
                        `🔄 [updateTask Cache Update] Old section task count changed from ${existingTaskRefs.length} to ${filteredTasks.length}.`
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
                console.log(
                  `🔄 [updateTask Cache Update] Adding task ${updatedTask.id} to new section ${newSectionCacheId}.`
                )
                cache.modify({
                  id: newSectionCacheId,
                  fields: {
                    tasks(existingTaskRefs = [], { readField }) {
                      const newTaskRef = cache.identify(updatedTask)
                      if (existingTaskRefs.some(ref => readField("id", ref) === updatedTask.id)) {
                        console.log(
                          `🔄 [updateTask Cache Update] Task already exists in new section. No change needed.`
                        )
                        return existingTaskRefs
                      }
                      const updatedTasks = [{ __ref: newTaskRef }, ...existingTaskRefs]
                      console.log(
                        `🔄 [updateTask Cache Update] New section task count changed from ${existingTaskRefs.length} to ${updatedTasks.length}. Task added to the top.`
                      )
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
              console.log(
                "🔄 [updateTask Cache Update] Task updated within the same section. No section move logic needed."
              )
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
      console.log(
        `[toggleTaskCompleted] Initiated for task ID: ${taskId} from section ${personalSectionId} with current status: ${currentStatus}`
      )
      const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
      console.log(`[toggleTaskCompleted] New status will be: ${newStatus}`)
      console.log(`[toggleTaskCompleted] Calling updateTask to apply the status change.`)
      return updateTask(taskId, personalSectionId, { status: newStatus })
    },
    [updateTask]
  )

  const deleteTask = useCallback(
    async (taskId: string, personalSectionId: string) => {
      console.log(`[deleteTask] Initiated. Task ID: ${taskId}, Section ID: ${personalSectionId}`)

      if (!personalSectionId) {
        console.error(
          `[deleteTask] CRITICAL: personalSectionId was not provided. The task will be deleted from the server, but the UI may not update correctly because the parent section's cache cannot be modified.`
        )
      }

      const mutationVariables = { id: taskId }
      console.log(`[deleteTask] Mutation variables:`, mutationVariables)

      return deletePersonalTaskApolloMutation({
        variables: mutationVariables,
        // THIS IS THE FIX: optimisticResponse is removed.
        update: (cache, { data }) => {
          console.log(`[deleteTask Cache Update] Received data from mutation:`, data)
          const deletedTask = data?.deletePersonalTask
          if (!deletedTask || !deletedTask.id) {
            console.warn(`[deleteTask Cache Update] No deleted task data returned. Aborting cache update.`)
            return
          }
          const deletedTaskId = deletedTask.id
          console.log(`[deleteTask Cache Update] Task to remove from cache: ${deletedTaskId}`)

          if (personalSectionId) {
            // FIX: Use the correct typename for the section object.
            const sectionCacheId = cache.identify({ __typename: "PersonalSectionWithTasks", id: personalSectionId })
            if (sectionCacheId) {
              console.log(`[deleteTask Cache Update] Modifying cache for section: ${sectionCacheId}`)
              cache.modify({
                id: sectionCacheId,
                fields: {
                  tasks(existingTaskRefs = [], { readField }) {
                    console.log(
                      `[deleteTask Cache Update] Filtering tasks field. Found ${existingTaskRefs.length} existing tasks.`
                    )
                    const updatedTasks = existingTaskRefs.filter(taskRef => readField("id", taskRef) !== deletedTaskId)
                    console.log(`[deleteTask Cache Update] New task list length: ${updatedTasks.length}`)
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
            console.log(`[deleteTask Cache Update] Evicting task object from cache: ${taskCacheId}`)
            cache.evict({ id: taskCacheId })
          } else {
            console.warn(`[deleteTask Cache Update] Could not find task ${deletedTaskId} in cache to evict.`)
          }
          console.log(`[deleteTask Cache Update] Triggering garbage collection.`)
          cache.gc()
        },
      })
    },
    [deletePersonalTaskApolloMutation]
  )

  const deleteManyTasks = useCallback(
    async (tasks: TaskWithSectionId[]) => {
      const taskIds = tasks.map(t => t.taskId)
      console.log(`[deleteManyTasks] Initiated. Task IDs:`, taskIds)

      return deleteManyPersonalTasksApolloMutation({
        variables: { ids: taskIds },
        update: (cache, { data }) => {
          console.log(`[deleteManyTasks Cache Update] Received data from mutation:`, data)
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

          console.log(`[deleteManyTasks Cache Update] Grouped deleted tasks by section:`, tasksBySection)

          // Update each affected section
          for (const sectionId in tasksBySection) {
            const deletedIds = new Set(tasksBySection[sectionId])
            const sectionCacheId = cache.identify({ __typename: "PersonalSectionWithTasks", id: sectionId })

            if (sectionCacheId) {
              console.log(`[deleteManyTasks Cache Update] Modifying cache for section: ${sectionCacheId}`)
              cache.modify({
                id: sectionCacheId,
                fields: {
                  tasks(existingTaskRefs = [], { readField }) {
                    const originalCount = existingTaskRefs.length
                    const updatedTasks = existingTaskRefs.filter(
                      taskRef => !deletedIds.has(readField("id", taskRef))
                    )
                    console.log(
                      `[deleteManyTasks Cache Update] Section ${sectionId}: task count changed from ${originalCount} to ${updatedTasks.length}`
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
              console.log(`[deleteManyTasks Cache Update] Evicted task ${task.id} from cache.`)
            }
          })

          console.log(`[deleteManyTasks Cache Update] Triggering garbage collection.`)
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
// // hooks/useGanttMutations.ts
// import { useMutation, useApolloClient } from "@apollo/client";
// import { useCallback, useEffect } from "react";
// import {
//   GET_GANTT_DATA_QUERY,
// } from "@/graphql/queries/getGanttData";
// import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails";

// import {
//   CREATE_GANTT_TASK_MUTATION,
//   UPDATE_GANTT_TASK_MUTATION,
//   UPDATE_SPRINT_MUTATION,
// } from "@/graphql/mutations/ganttMutations";

// import { TaskStatus, Priority } from "@prisma/client";
// import { GanttDataResponse } from "./useGanttData";

// // --- Input Interfaces for Mutations ---
// interface CreateGanttTaskVariables {
//   input: {
//     projectId: string;
//     sprintId: string;
//     name: string;
//     description?: string | null;
//     startDate: string; // ISO string
//     endDate: string;   // ISO string
//     assigneeId?: string | null;
//     progress?: number | null;
//     type: "task" | "milestone"; // "task" or "milestone" (from Gantt chart type)
//   };
// }

// interface UpdateGanttTaskVariables {
//   input: {
//     id: string; // ID of the original Task or Milestone
//     type: "TASK" | "MILESTONE"; // "TASK" or "MILESTONE" (Prisma model name)
//     name?: string | null;
//     description?: string | null;
//     startDate?: string | null;
//     endDate?: string | null; // For task.endDate or milestone.dueDate
//     assigneeId?: string | null;
//     progress?: number | null;
//   };
// }

// interface UpdateGanttTaskResult {
//   updateGanttTask: {
//     id: string;
//     __typename: "GanttTaskData"; // <--- ADDED __typename HERE
//     name: string;
//     start: string;
//     end: string;
//     progress: number;
//     type: string;
//     sprint?: string;
//     hideChildren?: boolean;
//     displayOrder?: number;
//     description?: string;
//     assignee?: {
//       id: string;
//       firstName?: string | null;
//       lastName?: string | null;
//       avatar?: string | null;
//       __typename: "UserAvatarPartial"; // <--- Add for nested types if they are also distinct GraphQL types
//     } | null;
//     originalTaskId?: string;
//     originalType?: string;
//   };
// }


// interface UpdateSprintVariables {
//   input: {
//     id: string;
//     name?: string | null;
//     description?: string | null;
//     startDate?: string | null;
//     endDate?: string | null;
//     isCompleted?: boolean;
//     status?: string; // Prisma SprintStatus enum
//   };
// }

// // --- Main Hook ---
// export function useGanttMutations(projectId: string, currentSelectedSprintId?: string | null) {
//   console.log(`[useGanttMutations Hook] Initializing/Re-running for projectId: ${projectId}, currentSelectedSprintId: ${currentSelectedSprintId}`);

//   const client = useApolloClient();

//   const getGanttRefetchQueries = useCallback(() => {
//     const queries = [];

//     queries.push({
//       query: GET_GANTT_DATA_QUERY,
//       variables: { projectId, sprintId: currentSelectedSprintId || null },
//     });

//     queries.push({
//       query: GET_PROJECT_DETAILS_QUERY,
//       variables: { projectId },
//     });

//     console.log(`[useGanttMutations Hook] Preparing refetchQueries for currentSelectedSprintId: ${currentSelectedSprintId || 'null'}.`);
//     return queries;
//   }, [projectId, currentSelectedSprintId]);

//   // --- Apollo useMutation Hooks ---
//   const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] = useMutation<{ createGanttTask: any }, CreateGanttTaskVariables>(
//     CREATE_GANTT_TASK_MUTATION,
//     { refetchQueries: getGanttRefetchQueries }
//   );

//   const [updateGanttTaskMutation, { loading: updateGanttTaskLoading, error: updateGanttTaskError }] = useMutation<UpdateGanttTaskResult, UpdateGanttTaskVariables>(
//     UPDATE_GANTT_TASK_MUTATION,
//     {
//       update(cache, { data }) {
//         const updatedItem = data?.updateGanttTask;
//         if (!updatedItem) {
//           console.warn("[useGanttMutations] Cache update for updateGanttTask: No data returned from mutation.");
//           return;
//         }

//         const queryOptions = {
//           query: GET_GANTT_DATA_QUERY,
//           variables: { projectId, sprintId: currentSelectedSprintId || null },
//         };
//         const cachedGanttData = cache.readQuery<GanttDataResponse>(queryOptions);

//         if (cachedGanttData && cachedGanttData.getGanttData) {
//           const newTasks = cachedGanttData.getGanttData.tasks.map(task => {
//             if (task.originalTaskId === updatedItem.id && task.originalType === updatedItem.type) {
//               console.log(`[useGanttMutations] Cache update: Found matching task in cache to update: ${task.name} (originalId: ${task.originalTaskId})`);
//               return {
//                 ...task,
//                 name: updatedItem.name ?? task.name,
//                 start: updatedItem.start ?? task.start,
//                 end: updatedItem.end ?? task.end,
//                 progress: updatedItem.progress ?? task.progress,
//                 type: updatedItem.type ?? task.type,
//                 sprint: updatedItem.sprint ?? task.sprint,
//                 description: updatedItem.description ?? task.description,
//                 assignee: updatedItem.assignee ?? task.assignee, // Ensure nested __typename if assignee is complex
//                 hideChildren: updatedItem.hideChildren ?? task.hideChildren,
//                 displayOrder: updatedItem.displayOrder ?? task.displayOrder,
//               };
//             }
//             return task;
//           });

//           cache.writeQuery({
//             ...queryOptions,
//             data: {
//               getGanttData: {
//                 ...cachedGanttData.getGanttData,
//                 tasks: newTasks,
//               },
//             },
//           });
//           console.log(`[useGanttMutations] Apollo Cache for Gantt data updated after updateGanttTask. `);
//         } else {
//           console.warn(`[useGanttMutations] Could not find Gantt data in cache for project ${projectId} and sprint ${currentSelectedSprintId || 'null'} to update after updateGanttTask.`);
//         }
//       },
//       onError: (error) => {
//         console.error("[useGanttMutations] Error updating Gantt task:", error);
//       },
//     }
//   );

//   const [updateSprintMutation, { loading: updateSprintLoading, error: updateSprintError }] = useMutation<{ updateSprint: any }, UpdateSprintVariables>(
//     UPDATE_SPRINT_MUTATION,
//     { refetchQueries: getGanttRefetchQueries }
//   );


//   // --- LOGGING: Mutation loading/error states ---
//   useEffect(() => {
//     if (createGanttTaskLoading) console.log("[useGanttMutations Hook] createGanttTaskMutation loading TRUE.");
//     if (updateGanttTaskLoading) console.log("[useGanttMutations Hook] updateGanttTaskMutation loading TRUE.");
//     if (updateSprintLoading) console.log("[useGanttMutations Hook] updateSprintMutation loading TRUE.");

//     if (createGanttTaskError) console.error("[useGanttMutations Hook] createGanttTaskMutation error:", createGanttTaskError);
//     if (updateGanttTaskError) console.error("[useGanttMutations Hook] updateGanttTaskMutation error:", updateGanttTaskError);
//     if (updateSprintError) console.error("[useGanttMutations Hook] updateSprintMutation error:", updateSprintError);

//     if (!createGanttTaskLoading && !updateGanttTaskLoading && !updateSprintLoading) {
//         // console.log("[useGanttMutations Hook] All mutations loading state FALSE (i.e., complete or idle).");
//     }
//   }, [createGanttTaskLoading, updateGanttTaskLoading, updateSprintLoading, createGanttTaskError, updateGanttTaskError, updateSprintError]);
//   // --- END LOGGING ---


//   // --- Exposed Functions ---

//   const createGanttTask = useCallback(async (input: CreateGanttTaskVariables['input']): Promise<any> => {
//     console.log(`[useGanttMutations Hook] createGanttTask called. Input:`, input);
//     try {
//       const response = await createGanttTaskMutation({
//         variables: { input: {
//           ...input,
//           progress: input.progress ?? 0,
//           description: input.description ?? null,
//           assigneeId: input.assigneeId ?? null,
//         }},
//       });
//       console.log(`[useGanttMutations Hook] createGanttTask successful. Response:`, response.data);
//       return response.data?.createGanttTask;
//     } catch (err: any) {
//       console.error("[useGanttMutations Hook] Error creating Gantt task:", err);
//       throw err;
//     }
//   }, [createGanttTaskMutation]);


//   const updateGanttTask = useCallback(async (input: UpdateGanttTaskVariables['input']): Promise<any> => {
//     console.log(`[useGanttMutations Hook] updateGanttTask called. Input:`, input);
//     try {
//       const cleanedInput: Partial<UpdateGanttTaskVariables['input']> = {};
//       for (const key in input) {
//         if (Object.prototype.hasOwnProperty.call(input, key) && (input as any)[key] !== undefined) {
//           (cleanedInput as any)[key] = (input as any)[key];
//         }
//       }

//       const queryOptions = {
//         query: GET_GANTT_DATA_QUERY,
//         variables: { projectId, sprintId: currentSelectedSprintId || null },
//       };
//       const cachedGanttData = client.readQuery<GanttDataResponse>(queryOptions);
//       const currentTaskInCache = cachedGanttData?.getGanttData?.tasks.find(
//         t => t.originalTaskId === cleanedInput.id && t.originalType === cleanedInput.type
//       );

//       if (!currentTaskInCache) {
//           console.warn(`[useGanttMutations] Optimistic update: Could not find task with originalTaskId=${cleanedInput.id} and type=${cleanedInput.type} in cache. Skipping optimisticResponse.`);
//           const response = await updateGanttTaskMutation({
//             variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
//           });
//           console.log(`[useGanttMutations Hook] updateGanttTask successful (no optimisticResponse). Response:`, response.data);
//           return response.data?.updateGanttTask;
//       }

//       const assigneeOptimistic = currentTaskInCache.assignee ? {
//           ...currentTaskInCache.assignee,
//           __typename: "UserAvatarPartial" // Add __typename for nested objects
//       } : null;

//       const optimisticResponse: UpdateGanttTaskResult = {
//         updateGanttTask: {
//           __typename: "GanttTaskData", // <--- CRITICAL: ADD THIS HERE
//           id: currentTaskInCache.originalTaskId,
//           type: currentTaskInCache.originalType, // Ensure this reflects 'task' or 'milestone' as a string
//           name: cleanedInput.name ?? currentTaskInCache.name,
//           start: cleanedInput.startDate ?? currentTaskInCache.start,
//           end: cleanedInput.endDate ?? currentTaskInCache.end,
//           progress: cleanedInput.progress ?? currentTaskInCache.progress ?? 0,
//           sprint: currentTaskInCache.sprint,
//           description: cleanedInput.description ?? currentTaskInCache.description,
//           assignee: assigneeOptimistic,
//           hideChildren: currentTaskInCache.hideChildren,
//           displayOrder: currentTaskInCache.displayOrder,
//           originalTaskId: currentTaskInCache.originalTaskId,
//           originalType: currentTaskInCache.originalType,
//         },
//       };

//       const response = await updateGanttTaskMutation({
//         variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
//         optimisticResponse,
//       });
//       console.log(`[useGanttMutations Hook] updateGanttTask successful. Response:`, response.data);
//       return response.data?.updateGanttTask;
//     } catch (err: any) {
//       console.error("[useGanttMutations Hook] Error updating Gantt task:", err);
//       throw err;
//     }
//   }, [updateGanttTaskMutation, projectId, currentSelectedSprintId, client]);


//   const updateSprintDates = useCallback(async (sprintId: string, startDate: Date, endDate: Date): Promise<any> => {
//     console.log(`[useGanttMutations Hook] updateSprintDates called for sprint: ${sprintId}, new dates: ${startDate.toISOString()} - ${endDate.toISOString()}`);
//     try {
//       const response = await updateSprintMutation({
//         variables: {
//           input: {
//             id: sprintId,
//             startDate: startDate.toISOString(),
//             endDate: endDate.toISOString(),
//           },
//         },
//       });
//       console.log(`[useGanttMutations Hook] updateSprintDates successful. Response:`, response.data);
//       return response.data?.updateSprint;
//     } catch (err: any) {
//       console.error("[useGanttMutations Hook] Error updating sprint dates:", err);
//       throw err;
//     }
//   }, [updateSprintMutation]);


//   return {
//     createGanttTask,
//     updateGanttTask,
//     updateSprintDates,
//     isMutating: createGanttTaskLoading || updateGanttTaskLoading || updateSprintLoading,
//     mutationError: createGanttTaskError || updateGanttTaskError || updateSprintError,
//   };
// }





// hooks/useGanttMutations.ts
import { useMutation, useApolloClient } from "@apollo/client";
import { useCallback, useEffect } from "react";
import {
  GET_GANTT_DATA_QUERY,
} from "@/graphql/queries/getGanttData";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails";

import {
  CREATE_GANTT_TASK_MUTATION,
  UPDATE_GANTT_TASK_MUTATION,
  UPDATE_SPRINT_MUTATION,
} from "@/graphql/mutations/ganttMutations";

import { TaskStatus, Priority } from "@prisma/client";
import { GanttDataResponse } from "./useGanttData";

// --- Input Interfaces for Mutations ---
interface CreateGanttTaskVariables {
  input: {
    projectId: string;
    sprintId: string;
    name: string;
    description?: string | null;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    assigneeId?: string | null;
    progress?: number | null;
    type: "task" | "milestone"; // "task" or "milestone" (from Gantt chart type)
  };
}

interface UpdateGanttTaskVariables {
  input: {
    id: string; // ID of the original Task or Milestone
    type: "TASK" | "MILESTONE"; // "TASK" or "MILESTONE" (Prisma model name)
    name?: string | null;
    description?: string | null;
    startDate?: string | null;
    endDate?: string | null; // For task.endDate or milestone.dueDate
    assigneeId?: string | null;
    progress?: number | null;
  };
}

interface UpdateGanttTaskResult {
  updateGanttTask: {
    id: string;
    __typename: "GanttTaskData"; // <--- ADDED __typename HERE
    name: string;
    start: string;
    end: string;
    progress: number;
    type: string;
    sprint?: string;
    hideChildren?: boolean;
    displayOrder?: number;
    description?: string;
    assignee?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
      __typename: "UserAvatarPartial"; // <--- Add for nested types if they are also distinct GraphQL types
    } | null;
    originalTaskId?: string;
    originalType?: string;
  };
}


interface UpdateSprintVariables {
  input: {
    id: string;
    name?: string | null;
    description?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCompleted?: boolean;
    status?: string; // Prisma SprintStatus enum
  };
}

// --- Main Hook ---
export function useGanttMutations(projectId: string, currentSelectedSprintId?: string | null) {
  console.log(`[HOOK INIT: useGanttMutations] Initialized for projectId: "${projectId}", currentSelectedSprintId: "${currentSelectedSprintId || 'null'}"`);

  const client = useApolloClient();

  const getGanttRefetchQueries = useCallback(() => {
    console.log(`[useGanttMutations] Preparing refetchQueries...`);
    const queries = [];

    queries.push({
      query: GET_GANTT_DATA_QUERY,
      variables: { projectId, sprintId: currentSelectedSprintId || null },
    });

    queries.push({
      query: GET_PROJECT_DETAILS_QUERY,
      variables: { projectId },
    });

    console.log(`[useGanttMutations] Refetch queries generated for sprintId: "${currentSelectedSprintId || 'null'}"`, queries);
    return queries;
  }, [projectId, currentSelectedSprintId]);

  // --- Apollo useMutation Hooks ---
  const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] = useMutation<{ createGanttTask: any }, CreateGanttTaskVariables>(
    CREATE_GANTT_TASK_MUTATION,
    {
      refetchQueries: getGanttRefetchQueries,
      onCompleted: (data) => {
        console.log("[MUTATION SUCCESS: createGanttTask]", data);
      },
      onError: (error) => {
        console.error("[MUTATION ERROR: createGanttTask]", error);
      }
    }
  );

  const [updateGanttTaskMutation, { loading: updateGanttTaskLoading, error: updateGanttTaskError }] = useMutation<UpdateGanttTaskResult, UpdateGanttTaskVariables>(
    UPDATE_GANTT_TASK_MUTATION,
    {
      update(cache, { data }, { variables }) {
        console.groupCollapsed(`[CACHE UPDATE: updateGanttTask]`);
        const updatedItem = data?.updateGanttTask;
        if (!updatedItem) {
          console.warn("  [1] No data returned from mutation. Cannot update cache.");
          console.groupEnd();
          return;
        }

        // --- FIX START ---
        // Use the ID from the mutation's input variables for a reliable match,
        // as the server response structure might be inconsistent.
        const originalId = variables?.input.id;
        if (!originalId) {
            console.warn("  [1b] Could not find ID in mutation variables. Cannot update cache.");
            console.groupEnd();
            return;
        }
        // --- FIX END ---

        console.log("  [1] Received updated item from server:", JSON.parse(JSON.stringify(updatedItem)));

        const queryOptions = {
          query: GET_GANTT_DATA_QUERY,
          variables: { projectId, sprintId: currentSelectedSprintId || null },
        };
        console.log("  [2] Reading GET_GANTT_DATA_QUERY from cache with variables:", queryOptions.variables);

        const cachedGanttData = cache.readQuery<GanttDataResponse>(queryOptions);

        if (cachedGanttData && cachedGanttData.getGanttData) {
          console.log("  [3] Found existing Gantt data in cache. Processing update...");
          let matchFound = false;
          const newTasks = cachedGanttData.getGanttData.tasks.map(task => {
            // Match using the reliable ID from the mutation variables.
            if (task.originalTaskId === originalId) {
              matchFound = true;
              console.log(`  [4] MATCH FOUND! Updating task: "${task.name}" (originalTaskId: ${task.originalTaskId})`);
              console.log("      - OLD DATA:", JSON.parse(JSON.stringify(task)));

              // Construct the new object by spreading the existing cached task first.
              // This ensures that `originalTaskId` and `originalType` are always preserved.
              const updatedTaskData = {
                ...task,
                name: updatedItem.name ?? task.name,
                start: updatedItem.start ?? task.start,
                end: updatedItem.end ?? task.end,
                progress: updatedItem.progress ?? task.progress,
                type: updatedItem.type ?? task.type,
                sprint: updatedItem.sprint ?? task.sprint,
                description: updatedItem.description ?? task.description,
                assignee: updatedItem.assignee ?? task.assignee,
                hideChildren: updatedItem.hideChildren ?? task.hideChildren,
                displayOrder: updatedItem.displayOrder ?? task.displayOrder,
              };

              console.log("      - NEW DATA:", JSON.parse(JSON.stringify(updatedTaskData)));
              return updatedTaskData;
            }
            return task;
          });

          if (!matchFound) {
            console.warn(`  [4] NO MATCH FOUND in cache for the updated item (originalId: ${originalId}). The cache was not modified.`);
          }

          console.log("  [5] Writing updated task list back to the cache.");
          cache.writeQuery({
            ...queryOptions,
            data: {
              getGanttData: {
                ...cachedGanttData.getGanttData,
                tasks: newTasks,
              },
            },
          });
          console.log(`  [6] Apollo Cache write complete.`);
        } else {
          console.warn(`  [3] Could not find Gantt data in cache for project "${projectId}" and sprint "${currentSelectedSprintId || 'null'}" to update.`);
        }
        console.groupEnd();
      },
      onError: (error) => {
        console.error("[MUTATION ERROR: updateGanttTask]", error);
      },
    }
  );

  const [updateSprintMutation, { loading: updateSprintLoading, error: updateSprintError }] = useMutation<{ updateSprint: any }, UpdateSprintVariables>(
    UPDATE_SPRINT_MUTATION,
    {
      refetchQueries: getGanttRefetchQueries,
      onCompleted: (data) => {
        console.log("[MUTATION SUCCESS: updateSprint]", data);
      },
      onError: (error) => {
        console.error("[MUTATION ERROR: updateSprint]", error);
      }
    }
  );

  useEffect(() => {
    if (createGanttTaskLoading) console.log("[MUTATION STATUS] createGanttTask: LOADING...");
    if (updateGanttTaskLoading) console.log("[MUTATION STATUS] updateGanttTask: LOADING...");
    if (updateSprintLoading) console.log("[MUTATION STATUS] updateSprint: LOADING...");
  }, [createGanttTaskLoading, updateGanttTaskLoading, updateSprintLoading]);


  const createGanttTask = useCallback(async (input: CreateGanttTaskVariables['input']): Promise<any> => {
    console.groupCollapsed(`[ACTION: createGanttTask]`);
    console.log("  [1] Input received:", JSON.parse(JSON.stringify(input)));
    try {
      const variables = {
        input: {
          ...input,
          progress: input.progress ?? 0,
          description: input.description ?? null,
          assigneeId: input.assigneeId ?? null,
        }
      };
      console.log("  [2] Executing mutation with variables:", variables);
      const response = await createGanttTaskMutation({ variables });
      console.log(`  [3] Mutation successful. Response data:`, response.data);
      console.groupEnd();
      return response.data?.createGanttTask;
    } catch (err: any) {
      console.error("  [3] Mutation failed:", err);
      console.groupEnd();
      throw err;
    }
  }, [createGanttTaskMutation]);


  const updateGanttTask = useCallback(async (input: UpdateGanttTaskVariables['input']): Promise<any> => {
    console.groupCollapsed(`[ACTION: updateGanttTask] for ID: ${input.id}`);
    console.log("  [1] Input received:", JSON.parse(JSON.stringify(input)));
    try {
      // Step 1: Clean input to remove undefined values
      const cleanedInput: Partial<UpdateGanttTaskVariables['input']> = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key) && (input as any)[key] !== undefined) {
          (cleanedInput as any)[key] = (input as any)[key];
        }
      }
      console.log("  [2] Cleaned input for mutation:", cleanedInput);

      // Step 2: Read from cache to build optimistic response
      const queryOptions = {
        query: GET_GANTT_DATA_QUERY,
        variables: { projectId, sprintId: currentSelectedSprintId || null },
      };
      console.log("  [3] Reading cache to build optimistic response with variables:", queryOptions.variables);
      const cachedGanttData = client.readQuery<GanttDataResponse>(queryOptions);
      const currentTaskInCache = cachedGanttData?.getGanttData?.tasks.find(
        t => t.originalTaskId === cleanedInput.id && t.originalType === cleanedInput.type
      );

      if (!currentTaskInCache) {
          console.warn(`  [4] CACHE MISS: Could not find task with originalTaskId="${cleanedInput.id}" in cache. Proceeding without optimistic response.`);
          const response = await updateGanttTaskMutation({
            variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
          });
          console.log(`  [5] Mutation successful (no optimistic response). Server Response:`, response.data);
          console.groupEnd();
          return response.data?.updateGanttTask;
      }
      console.log("  [4] CACHE HIT: Found task in cache to use for optimistic response:", JSON.parse(JSON.stringify(currentTaskInCache)));

      // Step 3: Construct optimistic response
      const assigneeOptimistic = currentTaskInCache.assignee ? {
          ...currentTaskInCache.assignee,
          __typename: "UserAvatarPartial"
      } : null;

      const optimisticResponse: UpdateGanttTaskResult = {
        updateGanttTask: {
          __typename: "GanttTaskData",
          id: currentTaskInCache.originalTaskId, // This should be the actual DB ID
          type: cleanedInput.type === "TASK" ? "task" : "milestone", // Ensure this matches Gantt library's expected value
          name: cleanedInput.name ?? currentTaskInCache.name,
          start: cleanedInput.startDate ?? currentTaskInCache.start,
          end: cleanedInput.endDate ?? currentTaskInCache.end,
          progress: cleanedInput.progress ?? currentTaskInCache.progress ?? 0,
          sprint: currentTaskInCache.sprint,
          description: cleanedInput.description ?? currentTaskInCache.description,
          assignee: assigneeOptimistic,
          hideChildren: currentTaskInCache.hideChildren,
          displayOrder: currentTaskInCache.displayOrder,
          originalTaskId: currentTaskInCache.originalTaskId, // IMPORTANT
          originalType: currentTaskInCache.originalType,     // IMPORTANT
        },
      };
      console.log("  [5] Constructed optimistic response:", JSON.parse(JSON.stringify(optimisticResponse)));

      // Step 4: Execute mutation
      console.log("  [6] Executing mutation with variables and optimistic response.");
      const response = await updateGanttTaskMutation({
        variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
        optimisticResponse,
      });
      console.log(`  [7] Mutation successful. Final server response:`, response.data);
      console.groupEnd();
      return response.data?.updateGanttTask;
    } catch (err: any) {
      console.error("  [X] Mutation failed:", err);
      console.groupEnd();
      throw err;
    }
  }, [updateGanttTaskMutation, projectId, currentSelectedSprintId, client]);


  const updateSprintDates = useCallback(async (sprintId: string, startDate: Date, endDate: Date): Promise<any> => {
    console.groupCollapsed(`[ACTION: updateSprintDates] for Sprint ID: ${sprintId}`);
    try {
      const variables = {
        input: {
          id: sprintId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      };
      console.log("  [1] Executing mutation with variables:", variables);
      const response = await updateSprintMutation({ variables });
      console.log(`  [2] Mutation successful. Response data:`, response.data);
      console.groupEnd();
      return response.data?.updateSprint;
    } catch (err: any) {
      console.error("  [2] Mutation failed:", err);
      console.groupEnd();
      throw err;
    }
  }, [updateSprintMutation]);


  return {
    createGanttTask,
    updateGanttTask,
    updateSprintDates,
    isMutating: createGanttTaskLoading || updateGanttTaskLoading || updateSprintLoading,
    createGanttTaskLoading,
    updateGanttTaskLoading,
    updateSprintLoading,
    mutationError: createGanttTaskError || updateGanttTaskError || updateSprintError,
  };
}
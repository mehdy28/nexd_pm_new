// hooks/useGanttMutations.ts
import { useMutation } from "@apollo/client";
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
import { GanttDataResponse } from "./useGanttData"; // Import the GanttDataResponse interface

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

// Ensure the server returns enough information for cache update
interface UpdateGanttTaskResult {
  updateGanttTask: {
    id: string; // The originalTaskId
    type: "TASK" | "MILESTONE"; // The originalType
    name?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    progress?: number | null;
    // Include any other fields that can be updated and need to be reflected in the Gantt chart
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
  console.log(`[useGanttMutations Hook] Initializing/Re-running for projectId: ${projectId}, currentSelectedSprintId: ${currentSelectedSprintId}`);

  const getGanttRefetchQueries = useCallback(() => {
    const queries = [];

    queries.push({
      query: GET_GANTT_DATA_QUERY,
      variables: { projectId, sprintId: currentSelectedSprintId || null },
    });

    queries.push({
      query: GET_PROJECT_DETAILS_QUERY,
      variables: { projectId },
    });

    console.log(`[useGanttMutations Hook] Preparing refetchQueries for currentSelectedSprintId: ${currentSelectedSprintId || 'null'}.`);
    return queries;
  }, [projectId, currentSelectedSprintId]);

  // --- Apollo useMutation Hooks ---
  const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] = useMutation<{ createGanttTask: any }, CreateGanttTaskVariables>(
    CREATE_GANTT_TASK_MUTATION,
    { refetchQueries: getGanttRefetchQueries }
  );

  const [updateGanttTaskMutation, { loading: updateGanttTaskLoading, error: updateGanttTaskError }] = useMutation<UpdateGanttTaskResult, UpdateGanttTaskVariables>(
    UPDATE_GANTT_TASK_MUTATION,
    {
      // --- IMPORTANT: Directly update the cache to prevent refetches for individual task updates ---
      update(cache, { data }) {
        const updatedItem = data?.updateGanttTask; // This is the data returned by the server
        if (!updatedItem) {
          console.warn("[useGanttMutations] Cache update for updateGanttTask: No data returned from mutation.");
          return;
        }

        const queryOptions = {
          query: GET_GANTT_DATA_QUERY,
          variables: { projectId, sprintId: currentSelectedSprintId || null },
        };
        const cachedGanttData = cache.readQuery<GanttDataResponse>(queryOptions);

        if (cachedGanttData && cachedGanttData.getGanttData) {
          const newTasks = cachedGanttData.getGanttData.tasks.map(task => {
            // Match the task in cache using its originalTaskId and originalType
            // The `updatedItem.id` here is the original database ID (e.g., Task.id or Milestone.id)
            if (task.originalTaskId === updatedItem.id && task.originalType === updatedItem.type) {
              console.log(`[useGanttMutations] Cache update: Found matching task in cache to update: ${task.name} (originalId: ${task.originalTaskId})`);
              // Create a new object for the updated task, merging changes from the server response
              return {
                ...task,
                name: updatedItem.name ?? task.name,
                start: updatedItem.startDate ?? task.start,
                end: updatedItem.endDate ?? task.end,
                progress: updatedItem.progress ?? task.progress,
                // Ensure to update other fields if they can be modified by this mutation
              };
            }
            return task;
          });

          // Write the modified data back to the cache
          cache.writeQuery({
            ...queryOptions,
            data: {
              getGanttData: {
                ...cachedGanttData.getGanttData,
                tasks: newTasks,
              },
            },
          });
          console.log(`[useGanttMutations] Apollo Cache for Gantt data updated after updateGanttTask. `);
        } else {
          console.warn(`[useGanttMutations] Could not find Gantt data in cache for project ${projectId} and sprint ${currentSelectedSprintId || 'null'} to update after updateGanttTask.`);
        }
      },
      onError: (error) => {
        console.error("[useGanttMutations] Error updating Gantt task:", error);
        // You might want to add logic here to trigger a UI revert if the optimistic update failed.
      },
    }
  );

  const [updateSprintMutation, { loading: updateSprintLoading, error: updateSprintError }] = useMutation<{ updateSprint: any }, UpdateSprintVariables>(
    UPDATE_SPRINT_MUTATION,
    { refetchQueries: getGanttRefetchQueries }
  );


  // --- LOGGING: Mutation loading/error states ---
  useEffect(() => {
    if (createGanttTaskLoading) console.log("[useGanttMutations Hook] createGanttTaskMutation loading TRUE.");
    if (updateGanttTaskLoading) console.log("[useGanttMutations Hook] updateGanttTaskMutation loading TRUE.");
    if (updateSprintLoading) console.log("[useGanttMutations Hook] updateSprintMutation loading TRUE.");

    if (createGanttTaskError) console.error("[useGanttMutations Hook] createGanttTaskMutation error:", createGanttTaskError);
    if (updateGanttTaskError) console.error("[useGanttMutations Hook] updateGanttTaskMutation error:", updateGanttTaskError);
    if (updateSprintError) console.error("[useGanttMutations Hook] updateSprintMutation error:", updateSprintError);

    if (!createGanttTaskLoading && !updateGanttTaskLoading && !updateSprintLoading) {
        // console.log("[useGanttMutations Hook] All mutations loading state FALSE (i.e., complete or idle).");
    }
  }, [createGanttTaskLoading, updateGanttTaskLoading, updateSprintLoading, createGanttTaskError, updateGanttTaskError, updateSprintError]);
  // --- END LOGGING ---


  // --- Exposed Functions ---

  const createGanttTask = useCallback(async (input: CreateGanttTaskVariables['input']): Promise<any> => {
    console.log(`[useGanttMutations Hook] createGanttTask called. Input:`, input);
    try {
      const response = await createGanttTaskMutation({
        variables: { input: {
          ...input,
          progress: input.progress ?? 0,
          description: input.description ?? null,
          assigneeId: input.assigneeId ?? null,
        }},
      });
      console.log(`[useGanttMutations Hook] createGanttTask successful. Response:`, response.data);
      return response.data?.createGanttTask;
    } catch (err: any) {
      console.error("[useGanttMutations Hook] Error creating Gantt task:", err);
      throw err;
    }
  }, [createGanttTaskMutation]);


  const updateGanttTask = useCallback(async (input: UpdateGanttTaskVariables['input']): Promise<any> => {
    console.log(`[useGanttMutations Hook] updateGanttTask called. Input:`, input);
    try {
      const cleanedInput: Partial<UpdateGanttTaskVariables['input']> = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key) && (input as any)[key] !== undefined) {
          (cleanedInput as any)[key] = (input as any)[key];
        }
      }

      const response = await updateGanttTaskMutation({
        variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
        // The 'update' function in useMutation options handles cache changes directly.
        // No 'refetchQueries' needed here for individual task updates.
      });
      console.log(`[useGanttMutations Hook] updateGanttTask successful. Response:`, response.data);
      return response.data?.updateGanttTask;
    } catch (err: any) {
      console.error("[useGanttMutations Hook] Error updating Gantt task:", err);
      throw err;
    }
  }, [updateGanttTaskMutation, projectId, currentSelectedSprintId]); // Add these dependencies so the `update` function (which is part of `updateGanttTaskMutation`) correctly captures them.


  const updateSprintDates = useCallback(async (sprintId: string, startDate: Date, endDate: Date): Promise<any> => {
    console.log(`[useGanttMutations Hook] updateSprintDates called for sprint: ${sprintId}, new dates: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    try {
      const response = await updateSprintMutation({
        variables: {
          input: {
            id: sprintId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });
      console.log(`[useGanttMutations Hook] updateSprintDates successful. Response:`, response.data);
      return response.data?.updateSprint;
    } catch (err: any) {
      console.error("[useGanttMutations Hook] Error updating sprint dates:", err);
      throw err;
    }
  }, [updateSprintMutation]);


  return {
    createGanttTask,
    updateGanttTask,
    updateSprintDates,
    isMutating: createGanttTaskLoading || updateGanttTaskLoading || updateSprintLoading,
    mutationError: createGanttTaskError || updateGanttTaskError || updateSprintError,
  };
}
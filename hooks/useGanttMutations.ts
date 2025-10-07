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
  console.log(`[useGanttMutations Hook] Initializing/Re-running for projectId: ${projectId}, currentSelectedSprintId: ${currentSelectedSprintId}`);

  const client = useApolloClient();

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
      update(cache, { data }) {
        const updatedItem = data?.updateGanttTask;
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
            if (task.originalTaskId === updatedItem.id && task.originalType === updatedItem.type) {
              console.log(`[useGanttMutations] Cache update: Found matching task in cache to update: ${task.name} (originalId: ${task.originalTaskId})`);
              return {
                ...task,
                name: updatedItem.name ?? task.name,
                start: updatedItem.start ?? task.start,
                end: updatedItem.end ?? task.end,
                progress: updatedItem.progress ?? task.progress,
                type: updatedItem.type ?? task.type,
                sprint: updatedItem.sprint ?? task.sprint,
                description: updatedItem.description ?? task.description,
                assignee: updatedItem.assignee ?? task.assignee, // Ensure nested __typename if assignee is complex
                hideChildren: updatedItem.hideChildren ?? task.hideChildren,
                displayOrder: updatedItem.displayOrder ?? task.displayOrder,
              };
            }
            return task;
          });

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

      const queryOptions = {
        query: GET_GANTT_DATA_QUERY,
        variables: { projectId, sprintId: currentSelectedSprintId || null },
      };
      const cachedGanttData = client.readQuery<GanttDataResponse>(queryOptions);
      const currentTaskInCache = cachedGanttData?.getGanttData?.tasks.find(
        t => t.originalTaskId === cleanedInput.id && t.originalType === cleanedInput.type
      );

      if (!currentTaskInCache) {
          console.warn(`[useGanttMutations] Optimistic update: Could not find task with originalTaskId=${cleanedInput.id} and type=${cleanedInput.type} in cache. Skipping optimisticResponse.`);
          const response = await updateGanttTaskMutation({
            variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
          });
          console.log(`[useGanttMutations Hook] updateGanttTask successful (no optimisticResponse). Response:`, response.data);
          return response.data?.updateGanttTask;
      }

      const assigneeOptimistic = currentTaskInCache.assignee ? {
          ...currentTaskInCache.assignee,
          __typename: "UserAvatarPartial" // Add __typename for nested objects
      } : null;

      const optimisticResponse: UpdateGanttTaskResult = {
        updateGanttTask: {
          __typename: "GanttTaskData", // <--- CRITICAL: ADD THIS HERE
          id: currentTaskInCache.originalTaskId,
          type: currentTaskInCache.originalType, // Ensure this reflects 'task' or 'milestone' as a string
          name: cleanedInput.name ?? currentTaskInCache.name,
          start: cleanedInput.startDate ?? currentTaskInCache.start,
          end: cleanedInput.endDate ?? currentTaskInCache.end,
          progress: cleanedInput.progress ?? currentTaskInCache.progress ?? 0,
          sprint: currentTaskInCache.sprint,
          description: cleanedInput.description ?? currentTaskInCache.description,
          assignee: assigneeOptimistic,
          hideChildren: currentTaskInCache.hideChildren,
          displayOrder: currentTaskInCache.displayOrder,
          originalTaskId: currentTaskInCache.originalTaskId,
          originalType: currentTaskInCache.originalType,
        },
      };

      const response = await updateGanttTaskMutation({
        variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
        optimisticResponse,
      });
      console.log(`[useGanttMutations Hook] updateGanttTask successful. Response:`, response.data);
      return response.data?.updateGanttTask;
    } catch (err: any) {
      console.error("[useGanttMutations Hook] Error updating Gantt task:", err);
      throw err;
    }
  }, [updateGanttTaskMutation, projectId, currentSelectedSprintId, client]);


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
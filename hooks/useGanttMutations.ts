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

    return queries;
  }, [projectId, currentSelectedSprintId]);

  // --- Apollo useMutation Hooks ---
  const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] = useMutation<{ createGanttTask: any }, CreateGanttTaskVariables>(
    CREATE_GANTT_TASK_MUTATION,
    {
      refetchQueries: getGanttRefetchQueries,
      onCompleted: (data) => {
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


        const queryOptions = {
          query: GET_GANTT_DATA_QUERY,
          variables: { projectId, sprintId: currentSelectedSprintId || null },
        };

        const cachedGanttData = cache.readQuery<GanttDataResponse>(queryOptions);

        if (cachedGanttData && cachedGanttData.getGanttData) {
          let matchFound = false;
          const newTasks = cachedGanttData.getGanttData.tasks.map(task => {
            // Match using the reliable ID from the mutation variables.
            if (task.originalTaskId === originalId) {
              matchFound = true;

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

              return updatedTaskData;
            }
            return task;
          });

          if (!matchFound) {
            console.warn(`  [4] NO MATCH FOUND in cache for the updated item (originalId: ${originalId}). The cache was not modified.`);
          }

          cache.writeQuery({
            ...queryOptions,
            data: {
              getGanttData: {
                ...cachedGanttData.getGanttData,
                tasks: newTasks,
              },
            },
          });
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
      },
      onError: (error) => {
        console.error("[MUTATION ERROR: updateSprint]", error);
      }
    }
  );


  const createGanttTask = useCallback(async (input: CreateGanttTaskVariables['input']): Promise<any> => {
    console.groupCollapsed(`[ACTION: createGanttTask]`);
    try {
      const variables = {
        input: {
          ...input,
          progress: input.progress ?? 0,
          description: input.description ?? null,
          assigneeId: input.assigneeId ?? null,
        }
      };
      const response = await createGanttTaskMutation({ variables });
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
    try {
      // Step 1: Clean input to remove undefined values
      const cleanedInput: Partial<UpdateGanttTaskVariables['input']> = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key) && (input as any)[key] !== undefined) {
          (cleanedInput as any)[key] = (input as any)[key];
        }
      }

      // Step 2: Read from cache to build optimistic response
      const queryOptions = {
        query: GET_GANTT_DATA_QUERY,
        variables: { projectId, sprintId: currentSelectedSprintId || null },
      };
      const cachedGanttData = client.readQuery<GanttDataResponse>(queryOptions);
      const currentTaskInCache = cachedGanttData?.getGanttData?.tasks.find(
        t => t.originalTaskId === cleanedInput.id && t.originalType === cleanedInput.type
      );

      if (!currentTaskInCache) {
          console.warn(`  [4] CACHE MISS: Could not find task with originalTaskId="${cleanedInput.id}" in cache. Proceeding without optimistic response.`);
          const response = await updateGanttTaskMutation({
            variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
          });
          console.groupEnd();
          return response.data?.updateGanttTask;
      }

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

      // Step 4: Execute mutation
      const response = await updateGanttTaskMutation({
        variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] },
        optimisticResponse,
      });
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
      const response = await updateSprintMutation({ variables });
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
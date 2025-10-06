// hooks/useGanttMutations.ts
import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import {
  GET_GANTT_DATA_QUERY,
} from "@/graphql/queries/getGanttData";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails"; // For potential updates to project stats

import {
  CREATE_GANTT_TASK_MUTATION, // NEW: for creating tasks/milestones
  UPDATE_GANTT_TASK_MUTATION, // NEW: for updating tasks/milestones
  UPDATE_SPRINT_MUTATION,     // Existing mutation for sprint updates
} from "@/graphql/mutations/ganttMutations"; // New file for Gantt specific mutations

import { TaskStatus, Priority } from "@prisma/client"; // For mapping enums

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
  console.log(`[sprint] GANTT_MUTATION HOOK: useGanttMutations called with projectId: ${projectId}, currentSelectedSprintId: ${currentSelectedSprintId}`);

  // Helper to define consistent refetchQueries for Gantt board
  const getGanttRefetchQueries = useCallback(() => {
    const queries = [];

    // Always refetch Gantt data for the *current* sprint or all sprints
    queries.push({
      query: GET_GANTT_DATA_QUERY,
      variables: { projectId, sprintId: currentSelectedSprintId || null },
    });

    // Also refetch project details if task counts or other high-level stats might change.
    queries.push({
      query: GET_PROJECT_DETAILS_QUERY, // Assuming you have this query import
      variables: { projectId },
    });

    console.log(`[sprint] GANTT_MUTATION HOOK: Preparing refetchQueries for currentSelectedSprintId: ${currentSelectedSprintId || 'null'}.`);
    return queries;
  }, [projectId, currentSelectedSprintId]);

  // --- Apollo useMutation Hooks ---
  const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] = useMutation<{ createGanttTask: any }, CreateGanttTaskVariables>(
    CREATE_GANTT_TASK_MUTATION,
    { refetchQueries: getGanttRefetchQueries }
  );

  const [updateGanttTaskMutation, { loading: updateGanttTaskLoading, error: updateGanttTaskError }] = useMutation<{ updateGanttTask: any }, UpdateGanttTaskVariables>(
    UPDATE_GANTT_TASK_MUTATION,
    { refetchQueries: getGanttRefetchQueries }
  );

  const [updateSprintMutation, { loading: updateSprintLoading, error: updateSprintError }] = useMutation<{ updateSprint: any }, UpdateSprintVariables>(
    UPDATE_SPRINT_MUTATION,
    { refetchQueries: getGanttRefetchQueries }
  );


  // --- Exposed Functions ---

  const createGanttTask = useCallback(async (input: CreateGanttTaskVariables['input']): Promise<any> => {
    console.log(`[sprint] GANTT_MUTATION: createGanttTask called. Input:`, input);
    try {
      const response = await createGanttTaskMutation({
        variables: { input: {
          ...input,
          progress: input.progress ?? 0, // Ensure progress is not null for non-milestones upon creation
          description: input.description ?? null,
          assigneeId: input.assigneeId ?? null,
        }},
      });
      console.log(`[sprint] GANTT_MUTATION: createGanttTask successful. Response:`, response.data);
      return response.data?.createGanttTask;
    } catch (err: any) {
      console.error("[sprint] GANTT_MUTATION: Error creating Gantt task:", err);
      throw err;
    }
  }, [createGanttTaskMutation]);


  const updateGanttTask = useCallback(async (input: UpdateGanttTaskVariables['input']): Promise<any> => {
    console.log(`[sprint] GANTT_MUTATION: updateGanttTask called. Input:`, input);
    try {
      // Create a clean input object that only includes properties that are not undefined.
      // This ensures that 'null' is explicitly sent if provided by the caller (e.g., to clear a field),
      // but 'undefined' fields (meaning no change) are not included at all.
      const cleanedInput: Partial<UpdateGanttTaskVariables['input']> = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key) && (input as any)[key] !== undefined) {
          (cleanedInput as any)[key] = (input as any)[key];
        }
      }

      const response = await updateGanttTaskMutation({
        variables: { input: cleanedInput as UpdateGanttTaskVariables['input'] }, // Cast back to full type for variables
      });
      console.log(`[sprint] GANTT_MUTATION: updateGanttTask successful. Response:`, response.data);
      return response.data?.updateGanttTask;
    } catch (err: any) {
      console.error("[sprint] GANTT_MUTATION: Error updating Gantt task:", err);
      throw err;
    }
  }, [updateGanttTaskMutation]);


  const updateSprintDates = useCallback(async (sprintId: string, startDate: Date, endDate: Date): Promise<any> => {
    console.log(`[sprint] GANTT_MUTATION: updateSprintDates called for sprint: ${sprintId}, new dates: ${startDate.toISOString()} - ${endDate.toISOString()}`);
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
      console.log(`[sprint] GANTT_MUTATION: updateSprintDates successful. Response:`, response.data);
      return response.data?.updateSprint;
    } catch (err: any) {
      console.error("[sprint] GANTT_MUTATION: Error updating sprint dates:", err);
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
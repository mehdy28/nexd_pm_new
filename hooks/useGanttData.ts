// hooks/useGanttData.ts
import { useQuery } from "@apollo/client";
import { GET_GANTT_DATA_QUERY } from "@/graphql/queries/getGanttData";
import { Task as GanttTask, ViewMode } from "gantt-task-react"; // Import Task type from gantt-task-react
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";
import { useMemo } from "react";

// Extend Gantt library's Task type with our custom fields
export interface CustomGanttTask extends GanttTask {
  sprint?: string; // Parent sprint ID
  description?: string;
  assignee?: UserAvatarPartial | null;
}

export interface SprintGanttFilterOption {
  id: string;
  name: string;
}

interface GetGanttDataResponse {
  getGanttData: {
    sprints: SprintGanttFilterOption[];
    tasks: Array<{
      id: string;
      name: string;
      start: string; // ISO Date string
      end: string;   // ISO Date string
      progress: number;
      type: string;  // "task", "milestone", "project"
      sprint?: string; // ID of the parent sprint
      hideChildren?: boolean;
      displayOrder?: number;
      description?: string;
      assignee?: UserAvatarPartial | null;
    }>;
  } | null;
}

export function useGanttData(projectId: string, sprintId?: string | null) {
  const { data, loading, error, refetch } = useQuery<GetGanttDataResponse>(GET_GANTT_DATA_QUERY, {
    variables: { projectId, sprintId },
    skip: !projectId,
    fetchPolicy: "network-only", // Always get fresh data, especially with sprint filtering
  });

  const transformedTasks: CustomGanttTask[] = [];

  // Transform data from API into Gantt-task-react's expected format
  if (data?.getGanttData?.tasks) {
    data.getGanttData.tasks.forEach((task) => {
      transformedTasks.push({
        ...task,
        start: new Date(task.start), // Convert ISO string to Date object
        end: new Date(task.end),     // Convert ISO string to Date object
        // Ensure progress is a number (it should be from API)
        progress: task.progress,
        type: task.type as "task" | "milestone" | "project", // Cast to Gantt's types
        // Gantt library expects these to be boolean or undefined
        hideChildren: task.hideChildren || undefined,
        displayOrder: task.displayOrder || undefined,
        // Custom fields
        sprint: task.sprint || undefined,
        description: task.description || undefined,
        assignee: task.assignee || undefined,
      });
    });
  }

  // Memoize the transformed tasks to avoid unnecessary re-renders in Gantt component
  const memoizedTasks = useMemo(() => transformedTasks, [transformedTasks]);

  return {
    ganttTasks: memoizedTasks,
    sprintFilterOptions: data?.getGanttData?.sprints || [],
    loading,
    error,
    refetchGanttData: refetch,
  };
}
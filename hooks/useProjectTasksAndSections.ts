// hooks/useProjectTasksAndSections.ts
import { useQuery, useMutation } from "@apollo/client";
import { useCallback, useMemo, useEffect } from "react";
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections";
import { CREATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/createProjectSection";
import { UPDATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/updateProjectSection";
import { DELETE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/deleteProjectSection";

import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";
import { TaskStatus, Priority } from "@prisma/client";

// --- Type Definitions for the hook's return ---
export type PriorityUI = "Low" | "Medium" | "High";
export type TaskStatusUI = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

export interface ProjectMemberFullDetails { // Re-defining for consistency
  id: string; // ProjectMember ID
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  user: UserAvatarPartial;
}

export interface TaskUI {
  id: string;
  title: string;
  assignee: UserAvatarPartial | null;
  due: string | null; // YYYY-MM-DD
  priority: PriorityUI;
  points: number;
  completed: boolean; // Derived from TaskStatusUI
  description?: string;
  status: TaskStatusUI; // Keep original status for backend updates
  sprintId?: string | null; // IMPORTANT: Ensure this is explicitly typed as potentially null
}

export interface SectionUI {
  id: string;
  title: string; // Mapped from 'name'
  tasks: TaskUI[];
  editing?: boolean; // Client-side state
}

export interface SprintFilterOption {
  id: string;
  name: string;
}

// Full response type for the main query
interface ProjectTasksAndSectionsResponse {
  getProjectTasksAndSections: {
    sprints: SprintFilterOption[];
    sections: Array<{
      id: string;
      name: string;
      tasks: Array<{
        id: string;
        title: string;
        description?: string;
        status: TaskStatusUI;
        priority: "LOW" | "MEDIUM" | "HIGH";
        dueDate?: string; // YYYY-MM-DD
        points: number;
        assignee: UserAvatarPartial | null;
        sprintId?: string | null; // IMPORTANT: Ensure sprintId is part of the API response structure
      }>;
    }>;

    projectMembers: ProjectMemberFullDetails[]; // NOW REQUIRED in the query
  } | null;
}

// ... (existing mutation response/variables types for sections) ...

// Helper to convert Prisma Priority enum to UI string
const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
  switch (priority) {
    case "LOW": return "Low";
    case "MEDIUM": return "Medium";
    case "HIGH": return "High";
  }
};

const mapTaskStatusToUI = (status: TaskStatus): boolean => {
  return status === 'DONE';
};


export function useProjectTasksAndSections(projectId: string, sprintIdFromProps?: string | null) { // Renamed for clarity
  console.log(`[sprint] HOOK: useProjectTasksAndSections called with projectId: ${projectId}, sprintIdFromProps: ${sprintIdFromProps}`);

  const { data, loading, error, refetch } = useQuery<ProjectTasksAndSectionsResponse>(GET_PROJECT_TASKS_AND_SECTIONS_QUERY, {
    variables: { projectId, sprintId: sprintIdFromProps }, // Use sprintIdFromProps directly as the variable
    skip: !projectId,
    fetchPolicy: "network-only", // Ensure fresh data on each call
  });

  useEffect(() => {
    if (data) {
      console.log("[sprint] HOOK: Data received from GET_PROJECT_TASKS_AND_SECTIONS_QUERY.");
      console.log("[sprint] HOOK: Query variables used for fetch (sprintId):", sprintIdFromProps);
      console.log("[sprint] HOOK: Fetched sprints:", data.getProjectTasksAndSections?.sprints);
      // console.log("[sprint] HOOK: Fetched sections (first 2 tasks of first section):", JSON.stringify(data.getProjectTasksAndSections?.sections?.[0]?.tasks.slice(0,2), null, 2));
    }
    if (error) {
      console.error("[sprint] HOOK: Query error:", error);
    }
  }, [data, error, sprintIdFromProps]);


  // --- Section Mutations ---
  const [createProjectSectionMutation] = useMutation<any, any>(CREATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: [
      GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      "GetProjectTasksAndSections"
    ],
  });

  const [updateProjectSectionMutation] = useMutation<any, any>(UPDATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: [
      GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      "GetProjectTasksAndSections"
    ],
  });

  const [deleteProjectSectionMutation] = useMutation<any, any>(DELETE_PROJECT_SECTION_MUTATION, {
    refetchQueries: [
      GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      "GetProjectTasksAndSections"
    ],
  });
  // -------------------------

  const transformedData = data?.getProjectTasksAndSections;

  const sections: SectionUI[] = useMemo(() => {
    const tempSections: SectionUI[] = [];
    if (transformedData) {
      transformedData.sections.forEach(sec => {
        tempSections.push({
          id: sec.id,
          title: sec.name,
          tasks: sec.tasks.map(task => ({
            id: task.id,
            title: task.title,
            assignee: task.assignee,
            due: task.dueDate || null,
            priority: mapPriorityToUI(task.priority),
            points: task.points,
            completed: mapTaskStatusToUI(task.status),
            description: task.description,
            status: task.status,
            sprintId: task.sprintId, // Ensure sprintId is mapped here
          })),
          editing: false,
        });
      });
    }
    console.log(`[sprint] HOOK: Memoized sections count: ${tempSections.length}`);
    return tempSections;
  }, [transformedData]);

  // Expose project members from the query result
  const projectMembers: ProjectMemberFullDetails[] = useMemo(() => {
    console.log(`[sprint] HOOK: Memoized projectMembers count: ${transformedData?.projectMembers.length || 0}`);
    return transformedData?.projectMembers || [];
  }, [transformedData]);

  // The *suggested* default sprint ID. This will only be used by ListView
  // if its own internalSelectedSprintId is initially undefined.
  const defaultSprintIdToSuggest: string | undefined = useMemo(() => {
    if (transformedData?.sprints && transformedData.sprints.length > 0) {
      // Assuming transformedData.sprints[0] is the desired "default" or "latest" if no sprintIdFromProps is given.
      // If there's a more specific logic for the "latest" or "active" sprint, implement it here.
      const suggestedId = transformedData.sprints[0].id; // For example, the first one returned by the backend.
      console.log(`[sprint] HOOK: Suggested default sprint ID for initial ListView state: ${suggestedId} (from fetched sprints[0])`);
      return suggestedId;
    }
    console.log("[sprint] HOOK: No default sprint ID suggested (no sprints available or transformedData is null).");
    return undefined;
  }, [transformedData?.sprints]); // Depend on transformedData.sprints to re-calculate if the list changes

  // --- Functions to expose for section mutations ---
  const createSection = useCallback(async (name: string, order?: number | null) => {
    console.log(`[sprint] HOOK: createSection called for projectId: ${projectId}, name: ${name}`);
    try {
      const response = await createProjectSectionMutation({
        variables: {
          projectId: projectId,
          name,
          order: order ?? null,
        },
      });
      console.log("[sprint] HOOK: createSection mutation successful. Response:", response.data);
      return response.data?.createProjectSection;
    } catch (err: any) {
      console.error("[sprint] HOOK: Error creating section:", err);
      throw err;
    }
  }, [projectId, createProjectSectionMutation]);


  const updateSection = useCallback(async (id: string, name?: string | null, order?: number | null) => {
    console.log(`[sprint] HOOK: updateSection called for sectionId: ${id}, name: ${name}`);
    try {
      const response = await updateProjectSectionMutation({
        variables: {
          id,
          name: name ?? null,
          order: order ?? null,
        },
      });
      console.log("[sprint] HOOK: updateSection mutation successful. Response:", response.data);
      return response.data?.updateSection;
    } catch (err: any) {
      console.error("[sprint] HOOK: Error updating section:", err);
      throw err;
    }
  }, [updateProjectSectionMutation]);

  const deleteSection = useCallback(async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
    console.log(`[sprint] HOOK: deleteSection called for sectionId: ${id}. Options:`, options);
    try {
      const response = await deleteProjectSectionMutation({
        variables: {
          id,
          options,
        },
      });
      console.log("[sprint] HOOK: deleteSection mutation successful. Response:", response.data);
      return response.data?.deleteProjectSection;
    } catch (err: any) {
      console.error("[sprint] HOOK: Error deleting section:", err);
      throw err;
    }
  }, [deleteProjectSectionMutation]);
  // -------------------------------------------------


  return {
    sprintFilterOptions: transformedData?.sprints || [],
    sections: sections,
    loading,
    error,
    refetchProjectTasksAndSections: refetch,
    createSection,
    updateSection,
    deleteSection,
    projectMembers, // Expose project members
    // This return ensures ListView always gets its initially desired sprint,
    // and if ListView itself has no preference yet, it gets a default suggestion.
    defaultSelectedSprintId: sprintIdFromProps !== undefined ? sprintIdFromProps : defaultSprintIdToSuggest,
  };
}
// hooks/useProjectTasksAndSections.ts
import { useQuery, useMutation } from "@apollo/client";
import { useCallback, useMemo } from "react";
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


export function useProjectTasksAndSections(projectId: string, sprintId?: string | null) {
  const { data, loading, error, refetch } = useQuery<ProjectTasksAndSectionsResponse>(GET_PROJECT_TASKS_AND_SECTIONS_QUERY, {
    variables: { projectId, sprintId },
    skip: !projectId,
    fetchPolicy: "network-only",
  });

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
          })),
          editing: false,
        });
      });


    }
    return tempSections;
  }, [transformedData]);

  // Expose project members from the query result
  const projectMembers: ProjectMemberFullDetails[] = useMemo(() => {
    return transformedData?.projectMembers || [];
  }, [transformedData]);

  // Determine the default selected sprint ID.
  // This logic runs whenever transformedData or sprintFilterOptions change.
  const defaultSelectedSprintId: string | undefined = useMemo(() => {
    // If there's an active sprintId passed to the hook (meaning user selected one previously), use that.
    // Otherwise, if sprints are available, default to the first one.
    if (sprintId) return sprintId; // If sprintId is passed, that's the current selected one.
    if (transformedData?.sprints && transformedData.sprints.length > 0) return transformedData.sprints[0].id;
    return undefined;
  }, [transformedData?.sprints, sprintId]);


  // --- Functions to expose for section mutations ---
  const createSection = useCallback(async (name: string, order?: number | null) => {
    try {
      const response = await createProjectSectionMutation({
        variables: {
          projectId: projectId,
          name,
          order: order ?? null,
        },
      });
      return response.data?.createProjectSection;
    } catch (err: any) {
      console.error("Error creating section:", err);
      throw err;
    }
  }, [projectId, createProjectSectionMutation]);


  const updateSection = useCallback(async (id: string, name?: string | null, order?: number | null) => {
    try {
      const response = await updateProjectSectionMutation({
        variables: {
          id,
          name: name ?? null,
          order: order ?? null,
        },
      });
      return response.data?.updateSection;
    } catch (err: any) {
      console.error("Error updating section:", err);
      throw err;
    }
  }, [updateProjectSectionMutation]);

  const deleteSection = useCallback(async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
    try {
      const response = await deleteProjectSectionMutation({
        variables: {
          id,
          options,
        },
      });
      return response.data?.deleteProjectSection;
    } catch (err: any) {
      console.error("Error deleting section:", err);
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
    defaultSelectedSprintId, // Now returning the derived default sprint ID
  };
}
// hooks/useKanbanMutations.ts
import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import {
  GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
} from "@/graphql/queries/getProjectTasksAndSections";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails";
import { CREATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/createProjectSection";
import { UPDATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/updateProjectSection";
import { DELETE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/deleteProjectSection";
import { CREATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/createProjectTask";
import { UPDATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/updateProjectTask";
import { DELETE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/deleteProjectTask";
import { Priority, TaskStatus } from "@prisma/client";
import {
  PriorityUI,
  TaskStatusUI,
  TaskUI,
  SectionUI,
} from "./useProjectTasksAndSections";

// --- Input Interfaces (re-defined or extended for clarity in this hook) ---
interface CreateSectionVariables {
  projectId: string;
  name: string;
  order?: number | null;
}

interface UpdateSectionVariables {
  id: string;
  name?: string | null;
  order?: number | null;
}

interface DeleteSectionVariables {
  id: string;
  options: { deleteTasks: boolean; reassignToSectionId?: string | null };
}

interface CreateTaskVariables {
  input: {
    projectId: string;
    sectionId: string;
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    points?: number | null;
  };
}

interface UpdateTaskVariables {
  input: {
    id: string;
    title?: string | null;
    description?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    points?: number | null;
    sectionId?: string | null; // Allow changing sectionId
  };
}

interface DeleteTaskVariables {
  id: string;
}

// --- Helper Functions for Type Mapping ---
const mapPriorityToPrisma = (priority: PriorityUI): Priority => {
  switch (priority) {
    case "Low": return "LOW";
    case "Medium": return "MEDIUM";
    case "High": return "HIGH";
  }
};

const mapTaskStatusToPrisma = (statusUI: TaskStatusUI): TaskStatus => {
    return statusUI as TaskStatus;
};

// --- Main Hook for Kanban Board Specific Mutations ---
export function useKanbanMutations(projectId: string, currentSprintId?: string | null) {
  console.log(`[sprint] KANBAN_MUTATION HOOK: useKanbanMutations called with projectId: ${projectId}, currentSprintId: ${currentSprintId}`);

  const getKanbanRefetchQueries = useCallback(() => {
    const queries = [];

    queries.push({
      query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      variables: { projectId, sprintId: currentSprintId || null },
    });

    queries.push({
      query: GET_PROJECT_DETAILS_QUERY,
      variables: { projectId },
    });

    console.log(`[sprint] KANBAN_MUTATION HOOK: Preparing refetchQueries for currentSprintId: ${currentSprintId || 'null'}.`);
    return queries;
  }, [projectId, currentSprintId]);

  // --- Apollo useMutation Hooks ---

  const [createSectionMutation] = useMutation<
    { createProjectSection: SectionUI },
    CreateSectionVariables
  >(CREATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  });

  const [updateSectionMutation] = useMutation<
    { updateProjectSection: SectionUI },
    UpdateSectionVariables
  >(UPDATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  });

  const [deleteSectionMutation] = useMutation<
    { deleteProjectSection: SectionUI },
    DeleteSectionVariables
  >(DELETE_PROJECT_SECTION_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  });

  const [createTaskMutation] = useMutation<
    { createProjectTask: TaskUI },
    CreateTaskVariables
  >(CREATE_PROJECT_TASK_MUTATION, {
    optimisticResponse: (vars) => {
      const tempId = `temp-task-${Math.random().toString(36).substring(2, 9)}`;
      const assignedAssignee = vars.input.assigneeId ? { __typename: "UserAvatarPartial", id: vars.input.assigneeId, firstName: "...", lastName: "...", avatar: null } : null;
      return {
        createProjectTask: {
          __typename: "TaskListView",
          id: tempId,
          title: vars.input.title,
          description: vars.input.description || null,
          status: vars.input.status || TaskStatus.TODO,
          priority: mapPriorityToPrisma(vars.input.priority as PriorityUI || "Medium"),
          dueDate: vars.input.dueDate || null,
          points: vars.input.points || 0,
          completed: (vars.input.status || TaskStatus.TODO) === TaskStatus.DONE,
          assignee: assignedAssignee,
          sprintId: vars.input.sprintId || null,
          sectionId: vars.input.sectionId,
        },
      };
    },
    refetchQueries: getKanbanRefetchQueries,
  });

  const [updateTaskMutation] = useMutation<
    { updateProjectTask: TaskUI },
    UpdateTaskVariables
  >(UPDATE_PROJECT_TASK_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  });

  const [deleteTaskMutation] = useMutation<
    { deleteProjectTask: { id: string } },
    DeleteTaskVariables
  >(DELETE_PROJECT_TASK_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  });

  // --- Exposed Functions for Kanban Operations ---

  const createColumn = useCallback(async (name: string, order?: number | null): Promise<void> => {
    console.log(`[sprint] KANBAN_MUTATION: createColumn called for projectId: ${projectId}, name: ${name}`);
    try {
      await createSectionMutation({
        variables: { projectId, name, order: order ?? null },
      });
      console.log(`[sprint] KANBAN_MUTATION: createColumn successful.`);
    } catch (err) {
      console.error("[sprint] KANBAN_MUTATION: Error creating column:", err);
      throw err;
    }
  }, [projectId, createSectionMutation]);

  const updateColumn = useCallback(async (id: string, name?: string | null, order?: number | null): Promise<void> => {
    console.log(`[sprint] KANBAN_MUTATION: updateColumn called for id: ${id}, name: ${name}, order: ${order}`);
    try {
      await updateSectionMutation({
        variables: { id, name: name ?? null, order: order ?? null },
      });
      console.log(`[sprint] KANBAN_MUTATION: updateColumn successful.`);
    } catch (err) {
      console.error("[sprint] KANBAN_MUTATION: Error updating column:", err);
      throw err;
    }
  }, [updateSectionMutation]);

  const deleteColumn = useCallback(async (id: string): Promise<void> => {
    console.log(`[sprint] KANBAN_MUTATION: deleteColumn called for id: ${id}.`);
    try {
      await deleteSectionMutation({
        variables: { id, options: { deleteTasks: true } },
      });
      console.log(`[sprint] KANBAN_MUTATION: deleteColumn successful.`);
    } catch (err) {
      console.error("[sprint] KANBAN_MUTATION: Error deleting column:", err);
      throw err;
    }
  }, [deleteSectionMutation]);

  const createCard = useCallback(async (columnId: string, title: string, description?: string, assigneeId?: string | null): Promise<void> => {
    console.log(`[sprint] KANBAN_MUTATION: createCard called in column: ${columnId}, title: ${title}. Current sprint: ${currentSprintId}`);
    try {
      await createTaskMutation({
        variables: {
          input: {
            projectId: projectId,
            sectionId: columnId,
            title,
            description: description || null,
            assigneeId: assigneeId || null,
            sprintId: currentSprintId || null,
            status: TaskStatus.TODO,
            priority: Priority.MEDIUM,
            points: 0,
          },
        },
      });
      console.log(`[sprint] KANBAN_MUTATION: createCard successful.`);
    } catch (err) {
      console.error("[sprint] KANBAN_MUTATION: Error creating card:", err);
      throw err;
    }
  }, [projectId, currentSprintId, createTaskMutation]);

  // Renamed the first parameter from 'columnId' to 'currentSectionId' for clarity
  // It represents the section the card *is currently in* before any move or update.
  const updateCard = useCallback(async (currentSectionId: string, cardId: string, updates: Partial<TaskUI>): Promise<void> => {
    console.log(`[sprint] KANBAN_MUTATION: updateCard called for card: ${cardId}. Current section: ${currentSectionId}. Updates:`, updates);
    const variables: UpdateTaskVariables['input'] = {
      id: cardId,
    };
    if (updates.title !== undefined) variables.title = updates.title;
    if (updates.description !== undefined) variables.description = updates.description;
    if (updates.status !== undefined) variables.status = mapTaskStatusToPrisma(updates.status);
    if (updates.priority !== undefined) variables.priority = mapPriorityToPrisma(updates.priority);
    if (updates.due !== undefined) variables.dueDate = updates.due;
    if (updates.assignee?.id !== undefined) variables.assigneeId = updates.assignee.id;
    if (updates.sprintId !== undefined) variables.sprintId = updates.sprintId;
    if (updates.points !== undefined) variables.points = updates.points;
    // CRITICAL: Pass the new sectionId if it's part of the updates
    if (updates.sectionId !== undefined) variables.sectionId = updates.sectionId;


    try {
      await updateTaskMutation({
        variables: { input: variables },
      });
      console.log(`[sprint] KANBAN_MUTATION: updateCard successful.`);
    } catch (err) {
      console.error("[sprint] KANBAN_MUTATION: Error updating card:", err);
      throw err;
    }
  }, [updateTaskMutation]);

  const deleteCard = useCallback(async (cardId: string): Promise<void> => {
    console.log(`[sprint] KANBAN_MUTATION: deleteCard called for card: ${cardId}.`);
    try {
      await deleteTaskMutation({
        variables: { id: cardId },
      });
      console.log(`[sprint] KANBAN_MUTATION: deleteCard successful.`);
    } catch (err) {
      console.error("[sprint] KANBAN_MUTATION: Error deleting card:", err);
      throw err;
    }
  }, [deleteTaskMutation]);


  return {
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    isMutating: createSectionMutation.loading || updateSectionMutation.loading || deleteSectionMutation.loading ||
                createTaskMutation.loading || updateTaskMutation.loading || deleteTaskMutation.loading,
    mutationError: createSectionMutation.error || updateSectionMutation.error || deleteSectionMutation.error ||
                   createTaskMutation.error || updateTaskMutation.error || deleteTaskMutation.error,
  };
}
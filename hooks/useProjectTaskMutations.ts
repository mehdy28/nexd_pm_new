// hooks/useProjectTaskMutations.ts
import { useMutation, ApolloCache, Reference } from "@apollo/client"; // Import ApolloCache, Reference
import { useCallback } from "react";
import { CREATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/createProjectTask";
import { UPDATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/updateProjectTask";
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails";
import { UserAvatarPartial, PriorityUI, TaskStatusUI, SectionUI, TaskUI } from "./useProjectTasksAndSections";
import { Priority, TaskStatus } from "@prisma/client";
import { gql } from "@apollo/client"; // For delete mutation placeholder

// --- Mutation Variable Interfaces ---
interface CreateProjectTaskVariables {
  input: {
    projectId: string;
    sectionId: string;
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    points?: number | null;
    parentId?: string | null;
  };
}

interface UpdateProjectTaskVariables {
  input: {
    id: string;
    title?: string | null;
    description?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    points?: number | null;
    parentId?: string | null;
  };
}

// --- Helper Functions for Type Mapping ---
const mapPriorityToPrisma = (priority: PriorityUI): Priority => {
  switch (priority) {
    case "Low": return "LOW";
    case "Medium": return "MEDIUM";
    case "High": return "HIGH";
  }
};

const mapTaskStatusToPrisma = (completed: boolean): TaskStatus => {
  return completed ? 'DONE' : 'TODO';
};

const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
  switch (priority) {
    case "LOW": return "Low";
    case "MEDIUM": return "Medium";
    case "HIGH": return "High";
  }
};


// --- Main Hook ---
export function useProjectTaskMutations(projectId: string) {
  // Refetch queries function, now also used by optimisticResponse for create.
  // It's crucial that any changes potentially affecting the list view or project details are covered.
  const refetchQueries = useCallback((sprintId?: string | null) => [
    { query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY, variables: { projectId, sprintId: sprintId === undefined ? null : sprintId } },
    { query: GET_PROJECT_DETAILS_QUERY, variables: { projectId } },
  ], [projectId]);

  // Create Task Mutation with Optimistic Update
  const [createProjectTaskMutation, { loading: createLoading, error: createError }] = useMutation<any, CreateProjectTaskVariables>(CREATE_PROJECT_TASK_MUTATION, {
    // REMOVED 'update' function to prevent 'cache.snapshot is not a function' error.
    // Relying on `refetchQueries` for cache synchronization.
    optimisticResponse: (vars) => {
      // Create a temporary ID for optimistic response
      const tempId = `temp-task-${Math.random().toString(36).substring(2, 9)}`;
      return {
        createProjectTask: {
          __typename: "TaskListView",
          id: tempId,
          title: vars.input.title,
          description: vars.input.description,
          status: vars.input.status || 'TODO',
          priority: vars.input.priority || 'MEDIUM', // Assuming default for UI
          dueDate: vars.input.dueDate,
          points: vars.input.points || 0,
          completed: (vars.input.status || 'TODO') === 'DONE',
          assignee: vars.input.assigneeId ? { __typename: "UserAvatarPartial", id: vars.input.assigneeId, firstName: "...", lastName: "...", avatar: null } : null,
          sectionId: vars.input.sectionId, // Not directly in return type, but useful for cache update logic
          sprintId: vars.input.sprintId,   // Not directly in return type, but useful for cache update logic
        },
      };
    },
    // The `refetchQueries` is mainly a fallback. Optimistic update is primary.
    // However, if the query includes projectMembers which needs updating due to assignees,
    // a full refetch might be simpler than complex cache updates for related entities.
    refetchQueries: (mutationResult) => {
        const sprintIdFromNewTask = mutationResult.data?.createProjectTask?.sprintId;
        // Use the refetchQueries helper function
        return refetchQueries(sprintIdFromNewTask);
    },
  });

  // Update Task Mutation with Optimistic Update
  const [updateProjectTaskMutation, { loading: updateLoading, error: updateError }] = useMutation<any, UpdateProjectTaskVariables>(UPDATE_PROJECT_TASK_MUTATION, {
    // REMOVED 'update' function to prevent 'cache.snapshot is not a function' error.
    // Relying on `refetchQueries` for cache synchronization.
    refetchQueries: (mutationResult) => {
        const sprintIdFromUpdatedTask = mutationResult.data?.updateProjectTask?.sprintId;
        // Use the refetchQueries helper function
        return refetchQueries(sprintIdFromUpdatedTask);
    },
  });


  // Delete Task Mutation
  const [deleteProjectTaskMutation, { loading: deleteLoading, error: deleteError }] = useMutation<any, { id: string }>(
    gql`mutation DeleteProjectTask($id: ID!) { deleteProjectTask(id: $id) { id } }`,
    {
      // REMOVED 'update' function to prevent 'cache.snapshot is not a function' error.
      // Relying on `refetchQueries` for cache synchronization.
      refetchQueries: (mutationResult) => {
          // Fallback refetch if cache update is tricky
          // After deleting a task, it's safer to refetch all tasks,
          // as we don't know which sprint it belonged to from the mutation result.
          // Or, if the mutation returns the deleted task's sprintId, use that.
          // Assuming a broad refetch for safety, or refine if deletion returns sprintId.
          return refetchQueries(null); // Refetching with sprintId: null to get all tasks for the project
      },
    }
  );


  // --- Exposed Functions ---

  const createTask = useCallback(async (sectionId: string, input: Omit<CreateProjectTaskVariables['input'], 'projectId' | 'sectionId'>) => {
    try {
      const response = await createProjectTaskMutation({
        variables: {
          input: {
            projectId: projectId,
            sectionId: sectionId,
            title: input.title,
            description: input.description ?? null,
            status: input.status || 'TODO',
            priority: input.priority ? mapPriorityToPrisma(input.priority) : Priority.MEDIUM,
            dueDate: input.dueDate || null,
            startDate: input.startDate || null,
            endDate: input.endDate || null,
            assigneeId: input.assigneeId ?? null,
            sprintId: input.sprintId ?? null,
            points: input.points ?? null,
            parentId: input.parentId ?? null,
          }
        },
      });
      return response.data?.createProjectTask;
    } catch (err: any) {
      console.error("Error creating task:", err);
      throw err;
    }
  }, [projectId, createProjectTaskMutation]);

  const updateTask = useCallback(async (taskId: string, input: Omit<UpdateProjectTaskVariables['input'], 'id'>) => {
    // Dynamically build variables to only send what's defined
    const variables: UpdateProjectTaskVariables['input'] = {
        id: taskId,
    };
    if (input.title !== undefined) variables.title = input.title;
    if (input.description !== undefined) variables.description = input.description;
    if (input.status !== undefined) variables.status = input.status;
    if (input.priority !== undefined) variables.priority = mapPriorityToPrisma(input.priority as PriorityUI); // Convert UI to Prisma
    if (input.dueDate !== undefined) variables.dueDate = input.dueDate;
    if (input.startDate !== undefined) variables.startDate = input.startDate;
    if (input.endDate !== undefined) variables.endDate = input.endDate;
    if (input.assigneeId !== undefined) variables.assigneeId = input.assigneeId;
    if (input.sprintId !== undefined) variables.sprintId = input.sprintId;
    if (input.points !== undefined) variables.points = input.points;
    if (input.parentId !== undefined) variables.parentId = input.parentId;

    try {
      const response = await updateProjectTaskMutation({
        variables: { input: variables },
      });
      return response.data?.updateProjectTask;
    } catch (err: any) {
      console.error("Error updating task:", err);
      throw err;
    }
  }, [updateProjectTaskMutation]);


  const toggleTaskCompleted = useCallback(async (taskId: string, currentStatus: TaskStatusUI) => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      const response = await updateProjectTaskMutation({
        variables: {
          input: {
            id: taskId,
            status: newStatus,
          },
        },
      });
      return response.data?.updateProjectTask;
    } catch (err: any) {
      console.error("Error toggling task completion:", err);
      throw err;
    }
  }, [updateProjectTaskMutation]);

  const deleteTask = useCallback(async (taskId: string) => { // Removed sprintId here, as refetchQueries will handle it
    try {
      const response = await deleteProjectTaskMutation({
        variables: { id: taskId },
      });
      return response.data?.deleteProjectTask;
    } catch (err: any) {
      console.error("Error deleting task:", err);
      throw err;
    }
  }, [deleteProjectTaskMutation]);


  return {
    createTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    isTaskMutating: createLoading || updateLoading || deleteLoading,
    taskMutationError: createError || updateError || deleteError,
  };
}
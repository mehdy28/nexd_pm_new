// hooks/useProjectTaskMutations.ts
import { useMutation, ApolloCache, Reference } from "@apollo/client";
import { useCallback } from "react";
import { CREATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/createProjectTask";
import { UPDATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/updateProjectTask";
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails";
import { UserAvatarPartial, PriorityUI, TaskStatusUI, SectionUI, TaskUI } from "./useProjectTasksAndSections";
import { Priority, TaskStatus } from "@prisma/client";
import { gql } from "@apollo/client";

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
// NOW ACCEPTS currentSprintIdFromProps TO INFORM REFETCH QUERIES
export function useProjectTaskMutations(projectId: string, currentSprintIdFromProps?: string | null) {
  console.log(`[sprint] MUTATION HOOK: useProjectTaskMutations called with projectId: ${projectId}, currentSprintIdFromProps: ${currentSprintIdFromProps}`);

  // This helper now uses the currentSprintIdFromProps passed to the hook
  const getRefetchQueries = useCallback(() => [
    { query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY, variables: { projectId, sprintId: currentSprintIdFromProps || null } },
    { query: GET_PROJECT_DETAILS_QUERY, variables: { projectId } },
  ], [projectId, currentSprintIdFromProps]); // Dependency on currentSprintIdFromProps

  // Create Task Mutation with Optimistic Update
  const [createProjectTaskApolloMutation, { loading: createLoading, error: createError }] = useMutation<any, CreateProjectTaskVariables>(CREATE_PROJECT_TASK_MUTATION, {
    optimisticResponse: (vars) => {
      const tempId = `temp-task-${Math.random().toString(36).substring(2, 9)}`;
      return {
        createProjectTask: {
          __typename: "TaskListView",
          id: tempId,
          title: vars.input.title,
          description: vars.input.description,
          status: vars.input.status || 'TODO',
          priority: vars.input.priority || 'MEDIUM',
          dueDate: vars.input.dueDate,
          points: vars.input.points || 0,
          completed: (vars.input.status || 'TODO') === 'DONE',
          assignee: vars.input.assigneeId ? { __typename: "UserAvatarPartial", id: vars.input.assigneeId, firstName: "...", lastName: "...", avatar: null } : null,
          // sprintId is crucial for optimistic updates and refetching.
          // Since the backend doesn't return it reliably, we use the input here.
          // This is still part of the optimistic response, not the actual backend return.
          sprintId: vars.input.sprintId,
        },
      };
    },
    // CRITICAL CHANGE: Use the getRefetchQueries helper directly.
    // It will capture the correct currentSprintIdFromProps at the time of mutation.
    refetchQueries: getRefetchQueries,
  });

  // Update Task Mutation with Optimistic Update
  const [updateProjectTaskApolloMutation, { loading: updateLoading, error: updateError }] = useMutation<any, UpdateProjectTaskVariables>(UPDATE_PROJECT_TASK_MUTATION, {
    // CRITICAL CHANGE: Use the getRefetchQueries helper directly.
    refetchQueries: getRefetchQueries,
  });


  // Delete Task Mutation
  const [deleteProjectTaskApolloMutation, { loading: deleteLoading, error: deleteError }] = useMutation<any, { id: string }>(
    gql`mutation DeleteProjectTask($id: ID!) { deleteProjectTask(id: $id) { id } }`,
    {
      // CRITICAL CHANGE: Use the getRefetchQueries helper directly.
      refetchQueries: getRefetchQueries,
    }
  );


  // --- Exposed Functions ---

  const createTask = useCallback(async (sectionId: string, input: Omit<CreateProjectTaskVariables['input'], 'projectId' | 'sectionId'>) => {
    console.log(`[sprint] MUTATION: createTask function called. Target section: ${sectionId}. Current sprint: ${currentSprintIdFromProps}`);
    try {
      const response = await createProjectTaskApolloMutation({
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
      console.log(`[sprint] MUTATION: createTask response received. Task ID: ${response.data?.createProjectTask?.id}`);
      return response.data?.createProjectTask;
    } catch (err: any) {
      console.error("[sprint] MUTATION: Error creating task:", err);
      throw err;
    }
  }, [projectId, currentSprintIdFromProps, createProjectTaskApolloMutation]); // Add currentSprintIdFromProps to deps

  const updateTask = useCallback(async (taskId: string, input: Omit<UpdateProjectTaskVariables['input'], 'id'>) => {
    console.log(`[sprint] MUTATION: updateTask function called. Target task: ${taskId}. Current sprint: ${currentSprintIdFromProps}`);
    const variables: UpdateProjectTaskVariables['input'] = {
        id: taskId,
    };
    if (input.title !== undefined) variables.title = input.title;
    if (input.description !== undefined) variables.description = input.description;
    if (input.status !== undefined) variables.status = input.status;
    if (input.priority !== undefined) variables.priority = mapPriorityToPrisma(input.priority as PriorityUI);
    if (input.dueDate !== undefined) variables.dueDate = input.dueDate;
    if (input.startDate !== undefined) variables.startDate = input.startDate;
    if (input.endDate !== undefined) variables.endDate = input.endDate;
    if (input.assigneeId !== undefined) variables.assigneeId = input.assigneeId;
    if (input.sprintId !== undefined) variables.sprintId = input.sprintId;
    if (input.points !== undefined) variables.points = input.points;
    if (input.parentId !== undefined) variables.parentId = input.parentId;

    try {
      const response = await updateProjectTaskApolloMutation({
        variables: { input: variables },
      });
      console.log(`[sprint] MUTATION: updateTask response received. Task ID: ${response.data?.updateProjectTask?.id}`);
      return response.data?.updateProjectTask;
    } catch (err: any) {
      console.error("[sprint] MUTATION: Error updating task:", err);
      throw err;
    }
  }, [updateProjectTaskApolloMutation, currentSprintIdFromProps]);


  const toggleTaskCompleted = useCallback(async (taskId: string, currentStatus: TaskStatusUI) => {
    console.log(`[sprint] MUTATION: toggleTaskCompleted function called. Target task: ${taskId}. Current sprint: ${currentSprintIdFromProps}`);
    try {
      const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      const response = await updateProjectTaskApolloMutation({
        variables: {
          input: {
            id: taskId,
            status: newStatus,
          },
        },
      });
      console.log(`[sprint] MUTATION: toggleTaskCompleted response received. Task ID: ${response.data?.updateProjectTask?.id}`);
      return response.data?.updateProjectTask;
    } catch (err: any) {
      console.error("[sprint] MUTATION: Error toggling task completion:", err);
      throw err;
    }
  }, [updateProjectTaskApolloMutation, currentSprintIdFromProps]);

  const deleteTask = useCallback(async (taskId: string) => {
    console.log(`[sprint] MUTATION: deleteTask function called. Target task: ${taskId}. Current sprint: ${currentSprintIdFromProps}`);
    try {
      const response = await deleteProjectTaskApolloMutation({
        variables: { id: taskId },
      });
      console.log(`[sprint] MUTATION: deleteTask response received. Deleted task ID: ${response.data?.deleteProjectTask?.id}`);
      return response.data?.deleteProjectTask;
    } catch (err: any) {
      console.error("[sprint] MUTATION: Error deleting task:", err);
      throw err;
    }
  }, [deleteProjectTaskApolloMutation, currentSprintIdFromProps]);


  return {
    createTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    isTaskMutating: createLoading || updateLoading || deleteLoading,
    taskMutationError: createError || updateError || deleteError,
  };
}
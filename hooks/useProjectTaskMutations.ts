// hooks/useProjectTaskMutations.ts
import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import { CREATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/createProjectTask";
import { UPDATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/updateProjectTask";
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails";
import { GET_TASK_DETAILS_QUERY } from "@/graphql/queries/getTaskDetails";
import { PriorityUI, TaskStatusUI, SectionUI, TaskUI } from "./useProjectTasksAndSections";
import { Priority, TaskStatus } from "@prisma/client";
import { gql } from "@apollo/client";

// --- Cached Query Type ---
type GetProjectTasksAndSectionsQueryType = {
  getProjectTasksAndSections: { sections: SectionUI[] };
};

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
    sectionId?: string | null; // Added for card moves
  };
}

// --- Helper Functions ---
const mapPriorityToPrisma = (priority: PriorityUI): Priority => {
  switch (priority) {
    case "LOW": return "LOW";
    case "MEDIUM": return "MEDIUM";
    case "HIGH": return "HIGH";
  }
};

// --- Main Hook ---
export function useProjectTaskMutations(projectId: string) { // Removed stale sprintId from hook signature
  const [createProjectTaskApolloMutation, { loading: createLoading, error: createError }] = useMutation<any, CreateProjectTaskVariables>(CREATE_PROJECT_TASK_MUTATION);
  const [updateProjectTaskApolloMutation, { loading: updateLoading, error: updateError }] = useMutation<any, UpdateProjectTaskVariables>(UPDATE_PROJECT_TASK_MUTATION);
  const [deleteProjectTaskApolloMutation, { loading: deleteLoading, error: deleteError }] = useMutation<any, { id: string }>(
    gql`mutation DeleteProjectTask($id: ID!) { deleteProjectTask(id: $id) { id } }`
  );

  const getGeneralRefetchQueries = useCallback((sprintId: string | null) => [
    { query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY, variables: { projectId, sprintId: sprintId } },
    { query: GET_PROJECT_DETAILS_QUERY, variables: { projectId } },
  ], [projectId]);

  const createTask = useCallback(async (sectionId: string, input: Omit<CreateProjectTaskVariables['input'], 'projectId' | 'sectionId'>) => {
    // This is not on the critical path for drag-and-drop, so refetch is acceptable here.
    const sprintId = input.sprintId ?? null;
    return await createProjectTaskApolloMutation({
      variables: {
        input: { projectId, sectionId, ...input }
      },
      refetchQueries: getGeneralRefetchQueries(sprintId)
    });
  }, [projectId, createProjectTaskApolloMutation, getGeneralRefetchQueries]);

  const updateTask = useCallback(async (
    taskId: string,
    input: Omit<UpdateProjectTaskVariables['input'], 'id'>,
    sprintIdForCache: string | null // Accept the fresh sprintId here
  ) => {
    const variables: UpdateProjectTaskVariables['input'] = { id: taskId, ...input };

    return await updateProjectTaskApolloMutation({
      variables: { input: variables },
      // REMOVED: refetchQueries to prevent flicker
      // ADDED: manual cache update to solve stale closure and prevent flicker
      update: (cache, { data }) => {
        const updatedTask = data?.updateProjectTask;
        if (!updatedTask) return;

        const queryOptions = {
          query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
          variables: { projectId, sprintId: sprintIdForCache },
        };

        const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
        if (!existingData) {
          console.warn(`Cache update skipped: Could not find query for sprintId: ${sprintIdForCache}`);
          return;
        }

        const newSections = existingData.getProjectTasksAndSections.sections.map(section => {
          const originalCards = section.cards ?? [];
          // Remove the card from every section to handle moves
          let newCards = originalCards.filter(card => card.id !== updatedTask.id);

          // If this is the destination section, add the updated card
          if (section.id === (updatedTask.sectionId || input.sectionId)) {
            newCards.push(updatedTask);
          }

          return { ...section, cards: newCards };
        });

        cache.writeQuery({
          ...queryOptions,
          data: {
            getProjectTasksAndSections: {
              ...existingData.getProjectTasksAndSections,
              sections: newSections,
            },
          },
        });
      },
    });
  }, [projectId, updateProjectTaskApolloMutation]);

  const toggleTaskCompleted = useCallback(
    async (taskId: string, currentStatus: TaskStatusUI, sprintIdForCache: string | null) => {
      const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
      return await updateProjectTaskApolloMutation({
        variables: {
          input: {
            id: taskId,
            status: newStatus,
          },
        },
        update: (cache, { data }) => {
          const updatedTask = data?.updateProjectTask;
          if (!updatedTask) return;

          const queryOptions = {
            query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
            variables: { projectId, sprintId: sprintIdForCache },
          };

          const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
          if (!existingData) {
            console.warn(`Cache update for toggle skipped: Could not find query for sprintId: ${sprintIdForCache}`);
            return;
          }

          const newSections = existingData.getProjectTasksAndSections.sections.map(section => {
            const taskIndex = section.cards.findIndex(card => card.id === taskId);
            if (taskIndex === -1) {
              return section;
            }

            const newCards = [
              ...section.cards.slice(0, taskIndex),
              updatedTask,
              ...section.cards.slice(taskIndex + 1),
            ];
            return { ...section, cards: newCards };
          });

          cache.writeQuery({
            ...queryOptions,
            data: {
              getProjectTasksAndSections: {
                ...existingData.getProjectTasksAndSections,
                sections: newSections,
              },
            },
          });
        },
      });
    },
    [projectId, updateProjectTaskApolloMutation]
  );

  const deleteTask = useCallback(async (taskId: string, sprintId: string | null) => {
    // Refetch is acceptable for deletion.
    return await deleteProjectTaskApolloMutation({
      variables: { id: taskId },
      refetchQueries: getGeneralRefetchQueries(sprintId),
    });
  }, [deleteProjectTaskApolloMutation, getGeneralRefetchQueries]);

  return {
    createTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    isTaskMutating: createLoading || updateLoading || deleteLoading,
    taskMutationError: createError || updateError || deleteError,
  };
}

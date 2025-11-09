// hooks/useKanbanMutations.ts
import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import {
  GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
} from "@/graphql/queries/getProjectTasksAndSections";
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

type GetProjectTasksAndSectionsQueryType = {
  getProjectTasksAndSections: { sections: SectionUI[] };
};

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
    sectionId?: string | null;
  };
}

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

export function useKanbanMutations(projectId: string) {
  const [createSectionMutation] = useMutation(CREATE_PROJECT_SECTION_MUTATION);
  const [updateSectionMutation] = useMutation(UPDATE_PROJECT_SECTION_MUTATION);
  const [deleteSectionMutation] = useMutation(DELETE_PROJECT_SECTION_MUTATION);
  const [createTaskMutation] = useMutation(CREATE_PROJECT_TASK_MUTATION);
  const [updateTaskMutation] = useMutation(UPDATE_PROJECT_TASK_MUTATION);
  const [deleteTaskMutation] = useMutation(DELETE_PROJECT_TASK_MUTATION);

  const updateCard = useCallback(
    async (
      cardId: string,
      updates: Partial<TaskUI>,
      sprintIdForCache: string | null
    ) => {
      const variables: UpdateTaskVariables["input"] = { id: cardId };
      if (updates.title !== undefined) variables.title = updates.title;
      if (updates.description !== undefined) variables.description = updates.description;
      if (updates.status !== undefined) variables.status = mapTaskStatusToPrisma(updates.status);
      if (updates.priority !== undefined) variables.priority = mapPriorityToPrisma(updates.priority);
      if (updates.due !== undefined) variables.dueDate = updates.due;
      if (updates.assignee !== undefined) variables.assigneeId = updates.assignee?.id ?? null;
      if (updates.sprintId !== undefined) variables.sprintId = updates.sprintId;
      if (updates.points !== undefined) variables.points = updates.points;
      if (updates.sectionId !== undefined) variables.sectionId = updates.sectionId;

      await updateTaskMutation({
        variables: { input: variables },
        update: (cache, { data }) => {
          const updatedTask = data?.updateProjectTask;
          if (!updatedTask) return;

          const queryOptions = {
            query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
            variables: { projectId, sprintId: sprintIdForCache },
          };

          const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
          if (!existingData) return;

          const newSections = existingData.getProjectTasksAndSections.sections.map(section => {
            const originalTasks = section.tasks ?? [];
            let newTasks = originalTasks.filter(task => task.id !== updatedTask.id);

            if (section.id === updatedTask.sectionId) {
              newTasks.push(updatedTask);
            }

            return { ...section, tasks: newTasks };
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
    [projectId, updateTaskMutation]
  );

  const createColumn = useCallback(async (name: string, order?: number | null, sprintId?: string | null) => {
      await createSectionMutation({
          variables: { projectId, name, order: order ?? null },
          update: (cache, { data }) => {
            const newSection = data?.createProjectSection;
            if (!newSection) return;

            const queryOptions = {
              query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
              variables: { projectId, sprintId: sprintId ?? null },
            };

            const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
            if (!existingData) return;

            cache.writeQuery({
              ...queryOptions,
              data: {
                getProjectTasksAndSections: {
                  ...existingData.getProjectTasksAndSections,
                  sections: [...existingData.getProjectTasksAndSections.sections, { ...newSection, tasks: [] }],
                },
              },
            });
          }
      });
  }, [projectId, createSectionMutation]);

  const updateColumn = useCallback(async (id: string, name?: string | null, order?: number | null, sprintId?: string | null) => {
    await updateSectionMutation({
        variables: { id, name: name ?? null, order: order ?? null },
        update: (cache, { data }) => {
          const updatedSection = data?.updateProjectSection;
          if (!updatedSection) return;

          const queryOptions = {
            query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
            variables: { projectId, sprintId: sprintId ?? null },
          };

          const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
          if (!existingData) return;

          let sections = existingData.getProjectTasksAndSections.sections.map(s =>
            s.id === id ? { ...s, ...updatedSection } : s
          );

          if (order !== null && order !== undefined) {
              const fromIndex = sections.findIndex(s => s.id === id);
              if (fromIndex !== -1) {
                const [movedSection] = sections.splice(fromIndex, 1);
                sections.splice(order, 0, movedSection);
              }
          }

          cache.writeQuery({
            ...queryOptions,
            data: {
              getProjectTasksAndSections: {
                ...existingData.getProjectTasksAndSections,
                sections: sections,
              },
            },
          });
        }
    });
  }, [projectId, updateSectionMutation]);

  const deleteColumn = useCallback(async (id: string, sprintId?: string | null) => {
      await deleteSectionMutation({
          variables: { id, options: { deleteTasks: true } },
          update: (cache, { data }) => {
            if (!data?.deleteProjectSection) return;

            const queryOptions = {
              query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
              variables: { projectId, sprintId: sprintId ?? null },
            };

            const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
            if (!existingData) return;

            cache.writeQuery({
              ...queryOptions,
              data: {
                getProjectTasksAndSections: {
                  ...existingData.getProjectTasksAndSections,
                  sections: existingData.getProjectTasksAndSections.sections.filter(s => s.id !== id),
                },
              },
            });
          }
      });
  }, [projectId, deleteSectionMutation]);

  const createCard = useCallback(async (columnId: string, title: string, sprintId?: string | null) => {
      await createTaskMutation({
          variables: {
              input: { projectId, sectionId: columnId, title, sprintId: sprintId ?? null },
          },
          update: (cache, { data }) => {
            const newCard = data?.createProjectTask;
            if (!newCard) return;

            const queryOptions = {
              query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
              variables: { projectId, sprintId: sprintId ?? null },
            };
            const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
            if (!existingData) return;

            const newSections = existingData.getProjectTasksAndSections.sections.map(section => {
              if (section.id === columnId) {
                return { ...section, tasks: [...(section.tasks ?? []), newCard] };
              }
              return section;
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
          }
      });
  }, [projectId, createTaskMutation]);

  const deleteCard = useCallback(async (cardId: string, sprintId?: string | null) => {
      await deleteTaskMutation({
          variables: { id: cardId },
          update: (cache, { data }) => {
            if (!data?.deleteProjectTask) return;

            const queryOptions = {
              query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
              variables: { projectId, sprintId: sprintId ?? null },
            };
            const existingData = cache.readQuery<GetProjectTasksAndSectionsQueryType>(queryOptions);
            if (!existingData) return;

            const newSections = existingData.getProjectTasksAndSections.sections.map(section => ({
              ...section,
              tasks: (section.tasks ?? []).filter(task => task.id !== cardId)
            }));

            cache.writeQuery({
              ...queryOptions,
              data: {
                getProjectTasksAndSections: {
                  ...existingData.getProjectTasksAndSections,
                  sections: newSections,
                },
              },
            });
          }
      });
  }, [projectId, deleteTaskMutation]);

  return {
    createColumn, updateColumn, deleteColumn,
    createCard, updateCard, deleteCard,
    isMutating: createSectionMutation.loading || updateSectionMutation.loading || deleteSectionMutation.loading ||
                createTaskMutation.loading || updateTaskMutation.loading || deleteTaskMutation.loading,
    mutationError: createSectionMutation.error || updateSectionMutation.error || deleteSectionMutation.error ||
                   createTaskMutation.error || updateTaskMutation.error || deleteTaskMutation.error,
  };
}
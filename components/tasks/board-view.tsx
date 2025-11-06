// components/tasks/board-view.tsx
"use client"

import { KanbanBoard } from "@/components/board/kanban-board"
import { useProjectTasksAndSections, SectionUI, TaskUI, PriorityUI, TaskStatusUI } from "@/hooks/useProjectTasksAndSections";
import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutations";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, Column } from "@/components/board/kanban-types";
import { Loader2 } from "lucide-react";
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client";
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";


interface BoardViewProps {
  projectId?: string;
}

const mapPriorityToPrisma = (priority: PriorityUI): PrismaPriority => {
  switch (priority) {
    case "Low": return "LOW";
    case "Medium": return "MEDIUM";
    case "High": return "HIGH";
  }
};

const mapCompletedToPrismaStatus = (completed: boolean): PrismaTaskStatus => {
  return completed ? 'DONE' : 'TODO';
};

const mapSectionsToColumns = (sections: SectionUI[]): Column[] => {
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    editing: section.editing || false,
    cards: section.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due: task.due,
      points: task.points,
      assignee: task.assignee,
      completed: task.completed,
      editing: false,
    })),
  }));
};

const mapColumnsToSections = (columns: Column[]): SectionUI[] => {
  return columns.map(column => ({
    id: column.id,
    title: column.title,
    editing: column.editing || false,
    tasks: column.cards.map(card => ({
      id: card.id,
      title: card.title,
      description: card.description,
      assignee: card.assignee,
      due: card.due,
      priority: card.priority,
      points: card.points,
      completed: card.completed,
      status: card.completed ? 'DONE' : 'TODO',
    })),
  }));
};


export function BoardView({ projectId }: BoardViewProps) {
  const [currentSprintId, setCurrentSprintId] = useState<string | undefined>(undefined);

  const {
    sprintFilterOptions,
    sections: fetchedSections,
    loading,
    error,
    refetchProjectTasksAndSections,
    projectMembers,
    createSection,
    updateSection,
    deleteSection,
    defaultSelectedSprintId: fetchedDefaultSprintId,
  } = useProjectTasksAndSections(projectId || "", currentSprintId);

  useEffect(() => {
    console.log("[BoardView] useEffect - currentSprintId:", currentSprintId, "fetchedDefaultSprintId:", fetchedDefaultSprintId);
    if (currentSprintId === undefined && fetchedDefaultSprintId) {
      console.log("[BoardView] Setting currentSprintId to fetchedDefaultSprintId:", fetchedDefaultSprintId);
      setCurrentSprintId(fetchedDefaultSprintId);
    }
  }, [fetchedDefaultSprintId, currentSprintId]);


  const {
    createTask,
    updateTask,
    deleteTask,
    isTaskMutating,
    taskMutationError,
  } = useProjectTaskMutations(projectId || "", currentSprintId); // <-- ADJUSTMENT HERE: Pass currentSprintId

  const initialColumns = useMemo(() => {
    if (loading || error || !fetchedSections) {
      return [];
    }
    return mapSectionsToColumns(fetchedSections);
  }, [fetchedSections, loading, error]);

  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    return projectMembers.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
    }));
  }, [projectMembers]);


  const handleCreateColumn = useCallback(async (title: string) => {
    if (!projectId) return;
    try {
      await createSection(title);
    } catch (err) {
      console.error("Failed to create section:", err);
    }
  }, [projectId, createSection]);

  const handleUpdateColumn = useCallback(async (columnId: string, title: string) => {
    try {
      await updateSection(columnId, title);
    } catch (err) {
      console.error("Failed to update section:", err);
    }
  }, [updateSection]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    try {
      await deleteSection(columnId, { deleteTasks: true });
    } catch (err) {
      console.error("Failed to delete section:", err);
    }
  }, [deleteSection]);

  const handleCreateCard = useCallback(async (columnId: string, title: string, description?: string, assigneeId?: string | null) => {
    if (!projectId) return;
    try {
      await createTask(columnId, {
        title,
        description,
        assigneeId: assigneeId ?? null,
        priority: "Medium",
        status: "TODO",
        sprintId: currentSprintId,
      });
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }, [projectId, createTask, currentSprintId]);


  const handleUpdateCard = useCallback(async (columnId: string, cardId: string, updates: Partial<TaskUI>) => {
    const mutationInput: any = { id: cardId };

    if (updates.title !== undefined) mutationInput.title = updates.title;
    if (updates.description !== undefined) mutationInput.description = updates.description;
    if (updates.priority !== undefined) mutationInput.priority = mapPriorityToPrisma(updates.priority);
    if (updates.points !== undefined) mutationInput.points = updates.points;
    if (updates.due !== undefined) mutationInput.dueDate = updates.due;
    if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null;
    if (updates.completed !== undefined) mutationInput.status = mapCompletedToPrismaStatus(updates.completed);

    try {
      await updateTask(cardId, mutationInput);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  }, [updateTask]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      await deleteTask(cardId);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }, [deleteTask]);


  const handleColumnsOrderChange = useCallback(async (newColumns: Column[]) => {
    console.log("KanbanBoard internal columns/cards order changed:", newColumns);

    for (const [colIndex, column] of newColumns.entries()) {
      for (const [cardIndex, card] of column.cards.entries()) {
        const currentTask = fetchedSections?.find(s => s.id === column.id)?.tasks.find(t => t.id === card.id);
        if (currentTask && (currentTask.sectionId !== column.id || currentTask.order !== cardIndex)) {
          await updateTask(card.id, {
            // sectionId: column.id, // Move to new section
            // order: cardIndex,      // Update order within section
          });
        }
      }
    }

    refetchProjectTasksAndSections();

  }, [refetchProjectTasksAndSections, fetchedSections, updateTask]);

  const handleSprintChange = useCallback((sprintId: string | undefined) => {
    setCurrentSprintId(sprintId);
  }, []);

  const currentSprintName = useMemo(() => {
    console.log("[BoardView] Calculating currentSprintName:");
    console.log("  currentSprintId:", currentSprintId);
    console.log("  sprintFilterOptions:", sprintFilterOptions);
    const foundSprint = sprintFilterOptions.find(s => s.id === currentSprintId);
    const name = foundSprint?.name || "";
    console.log("  Resolved name:", name);
    return name;
  }, [currentSprintId, sprintFilterOptions]);


  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-4 text-center text-muted-foreground">
        Please select a project.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <span className="ml-2 text-lg text-slate-700">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-700">
        Error loading tasks: {error.message}
      </div>
    );
  }

  const isMutating = isTaskMutating;

  return (
    <KanbanBoard
      projectId={projectId}
      initialColumns={initialColumns}
      sprintOptions={sprintFilterOptions}
      currentSprintId={currentSprintId}
      onSprintChange={handleSprintChange}
      onColumnsChange={handleColumnsOrderChange}
      onCreateColumn={handleCreateColumn}
      onUpdateColumn={handleUpdateColumn}
      onDeleteColumn={handleDeleteColumn}
      onCreateCard={handleCreateCard}
      onUpdateCard={handleUpdateCard}
      onDeleteCard={handleDeleteCard}
      availableAssignees={availableAssignees}
      isMutating={isMutating}
    />
  );
}
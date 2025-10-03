"use client"

import { KanbanBoard } from "@/components/board/kanban-board"
import { useProjectTasksAndSections, SectionUI } from "@/hooks/useProjectTasksAndSections";
import { useState, useMemo, useCallback } from "react";
import { Card, Column } from "@/components/board/kanban-types"; // Import your Kanban types
import { Loader2 } from "lucide-react"; // For loading spinner

interface BoardViewProps {
  projectId?: string;
}

// Helper function to convert SectionUI[] from hook to Column[] for KanbanBoard
const mapSectionsToColumns = (sections: SectionUI[]): Column[] => {
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    editing: section.editing || false, // Ensure editing is defined for client-side
    cards: section.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority as Priority, // Cast to Kanban's Priority type
      due: task.due,
      points: task.points,
      assignee: task.assignee, // Directly use assignee
      completed: task.completed, // Directly use completed
      editing: false, // Cards start with editing: false by default in the board view
    })),
  }));
};

// Helper function to convert Column[] back to SectionUI[] for potential updates
// This is important if you plan to send changes (drag/drop, edits) back to the backend.
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
      // If your backend needs `status` instead of `completed`,
      // you'll need to derive it here, e.g.:
      // status: card.completed ? 'DONE' : 'TODO',
    })),
  }));
};


export function BoardView({ projectId }: BoardViewProps) {
  // Manage the selected sprint ID locally
  const [currentSprintId, setCurrentSprintId] = useState<string | null>(null);

  const {
    sprintFilterOptions,
    sections: fetchedSections, // Renamed to avoid collision with mapped sections
    loading,
    error,
    refetchProjectTasksAndSections,
  } = useProjectTasksAndSections(projectId || "", currentSprintId); // Pass currentSprintId to the hook

  // Memoize the transformation from SectionUI[] to Column[]
  const initialColumns = useMemo(() => {
    if (loading || error || !fetchedSections) {
      return [];
    }
    return mapSectionsToColumns(fetchedSections);
  }, [fetchedSections, loading, error]);

  // Handler for when columns change internally in KanbanBoard
  const handleColumnsChange = useCallback((newColumns: Column[]) => {
    console.log("KanbanBoard internal columns changed:", newColumns);
    // Here you would typically implement logic to persist these changes
    // to your backend, e.g., calling a GraphQL mutation.
    // For example:
    // const sectionsToSave = mapColumnsToSections(newColumns);
    // yourUpdateMutation(sectionsToSave);
    //
    // You might also need to refetch after a mutation to ensure data consistency.
  }, []);

  const handleSprintChange = useCallback((sprintId: string | null) => {
    setCurrentSprintId(sprintId);
    // The useProjectTasksAndSections hook will automatically refetch when currentSprintId changes.
  }, []);

  if (!projectId) {
    return <div className="p-4 text-center text-muted-foreground">Please select a project.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Error loading tasks: {error.message}
      </div>
    );
  }

  return (
    <KanbanBoard
      projectId={projectId}
      initialColumns={initialColumns}
      sprintOptions={sprintFilterOptions}
      currentSprintId={currentSprintId}
      onSprintChange={handleSprintChange}
      onColumnsChange={handleColumnsChange}
    />
  );
}
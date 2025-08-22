"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/lib/hooks/useFirebaseAuth"
import { useTasks, useTaskSections, useCreateTask, useCreateTaskSection, useUpdateTask, useUpdateTaskSection } from "@/lib/hooks/useTask"
import { KanbanBoard } from "@/components/board/kanban-board"

interface BoardViewProps {
  projectId?: string
}

export function BoardView({ projectId }: BoardViewProps) {
  const { user } = useFirebaseAuth()
  const { sections, loading: sectionsLoading, refetch: refetchSections } = useTaskSections(
    projectId, 
    user?.uid, 
    !projectId
  )
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useTasks(
    projectId, 
    user?.uid, 
    !projectId
  )
  const { createTask } = useCreateTask()
  const { createTaskSection } = useCreateTaskSection()
  const { updateTask } = useUpdateTask()
  const { updateTaskSection } = useUpdateTaskSection()

  if (sectionsLoading || tasksLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <KanbanBoard 
      projectId={projectId}
      sections={sections}
      tasks={tasks}
      onCreateSection={async (title: string) => {
        await createTaskSection({
          variables: {
            input: {
              title,
              projectId,
              userId: projectId ? null : user?.uid,
            }
          }
        })
        refetchSections()
      }}
      onCreateTask={async (sectionId: string, title: string) => {
        await createTask({
          variables: {
            input: {
              title,
              sectionId,
              projectId,
              userId: projectId ? null : user?.uid,
            }
          }
        })
        refetchTasks()
      }}
      onUpdateTask={async (taskId: string, updates: any) => {
        await updateTask({
          variables: {
            id: taskId,
            input: updates,
          }
        })
        refetchTasks()
      }}
      onUpdateSection={async (sectionId: string, updates: any) => {
        await updateTaskSection({
          variables: {
            id: sectionId,
            input: updates,
          }
        })
        refetchSections()
      }}
    />
  )
}

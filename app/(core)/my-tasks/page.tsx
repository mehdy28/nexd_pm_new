'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/layout/page-header"
import { TaskBoard } from "@/components/tasks/task-board"
import { TaskTable } from "@/components/tasks/task-table"
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer"
import { PromptLabContainer } from "@/components/prompt-lab/prompt-lab-container"
import { List, LayoutGrid } from "lucide-react"

export default function MyTasksPage() {
  return (
    <div className="page-container">
      <PageHeader title="My Tasks">
        <PomodoroTimer />
      </PageHeader>

      <Tabs defaultValue="board" className="page-content-container">
        <div className="page-content-header">
          <TabsList>
            <TabsTrigger value="board">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="prompt-lab">Prompt Lab</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="page-content">
          <TaskBoard />
        </TabsContent>
        <TabsContent value="list" className="page-content">
          <TaskTable />
        </TabsContent>
        <TabsContent value="prompt-lab" className="page-content">
          <PromptLabContainer />
        </TabsContent>
      </Tabs>
    </div>
  )
}

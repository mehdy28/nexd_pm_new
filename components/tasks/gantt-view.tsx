// // components/tasks/gantt-view.tsx
// "use client";

// import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
// import { Gantt, Task as GanttTaskReact, ViewMode } from "gantt-task-react";
// import "gantt-task-react/dist/index.css";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { ChevronDown, Loader2 } from "lucide-react";

// import { useGanttData, CustomGanttTask, SprintGanttFilterOption } from "@/hooks/useGanttData";
// import { useGanttMutations } from "@/hooks/useGanttMutations";

// interface GanttViewProps {
//   projectId: string;
// }

// // Helper to determine start/end date for a parent sprint based on its children tasks/milestones
// export function getStartEndDateForParent(tasks: CustomGanttTask[], parentId: string) {
//   const children = tasks.filter((t) => t.sprint === parentId);
//   if (children.length === 0) {
//     const parent = tasks.find(t => t.id === parentId);
//     return parent ? [parent.start, parent.end] : [new Date(), new Date()];
//   }
//   let start = children[0].start;
//   let end = children[0].end;

//   for (let i = 0; i < children.length; i++) {
//     const task = children[i];
//     if (start.getTime() > task.start.getTime()) {
//       start = task.start;
//     }
//     if (end.getTime() < task.end.getTime()) {
//       end = task.end;
//     }
//   }
//   return [start, end];
// }

// // Custom hook for debouncing functions (now only used for full refetches, if still needed)
// function useDebounce(callback: () => void, delay: number) {
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   useEffect(() => {
//     // Clear timeout on unmount
//     return () => {
//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }
//     };
//   }, []);

//   const debouncedCallback = useCallback(() => {
//     if (timeoutRef.current) {
//       clearTimeout(timeoutRef.current);
//     }
//     timeoutRef.current = setTimeout(() => {
//       callback();
//     }, delay);
//   }, [callback, delay]);

//   return debouncedCallback;
// }


// const GanttView: React.FC<GanttViewProps> = ({ projectId }) => {
//   // --- Component State ---
//   const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
//   const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
//   const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
//   // State for optimistic UI updates
//   const [optimisticGanttTasks, setOptimisticGanttTasks] = useState<CustomGanttTask[]>([]);

//   // --- Refs for debugging re-renders ---
//   const renderCount = useRef(0);
//   useEffect(() => {
//     renderCount.current += 1;
//     // console.log(`[GanttView - Render Cycle] Component rendered. Render count: ${renderCount.current}`);
//   });
//   // --- End Refs ---

//   // console.log(`[GanttView - State Init/Render] Current internalSelectedSprintId: ${internalSelectedSprintId}`);

//   const {
//     ganttTasks, // Original tasks from Apollo hook
//     sprintFilterOptions,
//     loading: ganttDataLoading,
//     error: ganttDataError,
//     refetchGanttData,
//     defaultSelectedSprintId: suggestedDefaultSprintId
//   } = useGanttData(projectId, internalSelectedSprintId);

//   const {
//     createGanttTask,
//     updateGanttTask,
//     updateSprintDates,
//     isMutating, // Combined mutation loading state
//     createGanttTaskLoading, // Individual mutation loading states
//     updateGanttTaskLoading,
//     updateSprintLoading,
//     mutationError
//   } = useGanttMutations(projectId, internalSelectedSprintId);

//   // Debounce refetching logic for date/progress changes - only used for sprint changes now
//   const debouncedRefetchGanttData = useDebounce(refetchGanttData, 700); // Debounce for 700ms

//   // Effect to update optimisticGanttTasks when actual ganttTasks change from Apollo
//   useEffect(() => {
//     if (ganttTasks && ganttTasks.length > 0) {
//       // console.log("[GanttView - Effect] Setting optimisticGanttTasks from ganttTasks (Apollo data).");
//       // Check if the actual Apollo data is different from current optimistic data before setting
//       // This helps prevent unnecessary re-renders if optimistic update already matches server data.
//       // Using JSON.stringify for deep comparison is expensive, but for now, it's a safeguard
//       // against unnecessary re-renders when tasks array might have same content but different reference.
//       if (JSON.stringify(ganttTasks) !== JSON.stringify(optimisticGanttTasks)) {
//         console.log("[GanttView - Effect] Apollo 'ganttTasks' updated, setting 'optimisticGanttTasks'.");
//         setOptimisticGanttTasks(ganttTasks);
//       }
//     } else if (!ganttDataLoading && !ganttDataError) {
//         // If ganttTasks becomes empty after loading and no error, clear optimistic tasks
//         // console.log("[GanttView - Effect] Clearing optimisticGanttTasks as Apollo data is empty/unavailable.");
//         if (optimisticGanttTasks.length > 0) { // Only clear if not already empty
//           setOptimisticGanttTasks([]);
//         }
//     }
//   }, [ganttTasks, ganttDataLoading, ganttDataError, optimisticGanttTasks]); // Added optimisticGanttTasks to deps for comparison


//   // --- LOGGING: When ganttTasks array reference changes ---
//   const prevGanttTasksRef = useRef<CustomGanttTask[]>([]);
//   useEffect(() => {
//     if (prevGanttTasksRef.current !== ganttTasks) {
//       // console.log(`[GanttView - Data Change] ganttTasks array reference changed! Old length: ${prevGanttTasksRef.current.length}, New length: ${ganttTasks.length}`);
//       const oldTaskIds = new Set(prevGanttTasksRef.current.map(t => t.id));
//       const newTaskIds = new Set(ganttTasks.map(t => t.id));
//       if (oldTaskIds.size !== newTaskIds.size || ![...oldTaskIds].every(id => newTaskIds.has(id))) {
//           // console.log(`[GanttView - Data Change] Task IDs in ganttTasks array changed.`);
//       }
//       prevGanttTasksRef.current = ganttTasks;
//     }

//     // console.log(`[GanttView - Data Update Effect] ganttTasks processed (${ganttTasks.length} tasks), loading=${ganttDataLoading}, error=${!!ganttDataError}.`);
//     // if (ganttTasks.length > 0) {
//     //   ganttTasks.forEach(task => {
//     //     console.log(`  [GanttView - Task Item Data] ID=${task.id}, Name="${task.name}", Progress=${task.progress}%, Type=${task.type}, OriginalType=${task.originalType}, Start=${task.start.toISOString().split('T')[0]}, End=${task.end.toISOString().split('T')[0]}`);
//     //   });
//     // } else if (!ganttDataLoading && !ganttDataError) {
//     //     console.log("[GanttView - Data Update Effect] No tasks found for the current filter after data update.");
//     // }
//   }, [ganttTasks, ganttDataLoading, ganttDataError]);
//   // --- END LOGGING: ganttTasks array reference changes ---

//   // --- LOGGING: isMutating status changes ---
//   const prevIsMutating = useRef(false);
//   useEffect(() => {
//     if (prevIsMutating.current !== isMutating) {
//       console.log(`[GanttView - Mutation Status] isMutating changed from ${prevIsMutating.current} to ${isMutating}.`);
//       prevIsMutating.current = isMutating;
//     }
//   }, [isMutating]);
//   // --- END LOGGING ---


//   useEffect(() => {
//     if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
//       console.log(`[GanttView - State Effect] Initializing internalSelectedSprintId to suggestedDefaultSprintId: ${suggestedDefaultSprintId}`);
//       setInternalSelectedSprintId(suggestedDefaultSprintId);
//     }
//   }, [suggestedDefaultSprintId, internalSelectedSprintId]);


//   const dynamicColumnWidth = useMemo(() => {
//     // console.log(`[GanttView - Memo] Recalculating dynamicColumnWidth for viewMode: ${viewMode}`);
//     switch (viewMode) {
//       case ViewMode.Day: return 150;
//       case ViewMode.Week: return 250;
//       case ViewMode.Month: return 300;
//       case ViewMode.Year: return 500;
//       default: return 150;
//     }
//   }, [viewMode]);

//   const handleTaskChange = useCallback(async (task: GanttTaskReact) => {
//     console.groupCollapsed(`[GanttView - Callback] handleTaskChange: Task ID=${task.id}, Name="${task.name}"`);
//     console.log("  Gantt library event data:", task);

//     if (task.type === "project") { // It's a sprint group
//       const sprintToUpdate = sprintFilterOptions.find(s => s.id === task.id);
//       if (sprintToUpdate) {
//         // Optimistically update sprint in UI
//         setOptimisticGanttTasks(prev => prev.map(t =>
//           t.id === task.id ? { ...t, start: task.start, end: task.end } : t
//         ));
//         console.log("  Optimistically updated sprint dates in UI.");

//         console.log(`  Updating sprint dates for ${sprintToUpdate.name} (${sprintToUpdate.id}) to ${task.start} - ${task.end}`);
//         try {
//           await updateSprintDates(sprintToUpdate.id, task.start, task.end);
//           console.log("  Sprint dates updated successfully. Triggering refetchGanttData() (immediate for sprint).");
//           refetchGanttData(); // Direct refetch for sprint changes (as they often affect children tasks)
//           console.log("  refetchGanttData() call initiated.");
//         } catch (err) {
//           console.error("  Error updating sprint dates:", err);
//           // TODO: Potentially revert optimistic update for sprint here
//         }
//       }
//     } else { // It's a regular task or milestone
//       const originalItem = optimisticGanttTasks.find(t => t.id === task.id);
//       if (!originalItem) {
//         console.warn(`  Original task/milestone not found for ID: ${task.id}. Cannot process update.`);
//         console.groupEnd();
//         return;
//       }

//       const input: {
//         id: string;
//         type: "TASK" | "MILESTONE";
//         startDate?: string | null;
//         endDate?: string | null;
//         name?: string | null;
//       } = {
//         id: originalItem.originalTaskId,
//         type: originalItem.originalType,
//       };

//       let hasChanges = false;
//       let updatedOptimisticTask = { ...originalItem }; // Create a mutable copy

//       const currentStart = originalItem.start.toISOString().split('T')[0];
//       const newStart = task.start.toISOString().split('T')[0];
//       if (currentStart !== newStart) {
//         input.startDate = task.start.toISOString();
//         updatedOptimisticTask.start = task.start; // Optimistic update
//         hasChanges = true;
//         console.log(`  Start date changed: "${currentStart}" -> "${newStart}"`);
//       }

//       const currentEnd = originalItem.end.toISOString().split('T')[0];
//       const newEnd = task.end.toISOString().split('T')[0];
//       if (currentEnd !== newEnd) {
//         input.endDate = task.end.toISOString();
//         updatedOptimisticTask.end = task.end; // Optimistic update
//         hasChanges = true;
//         console.log(`  End date changed: "${currentEnd}" -> "${newEnd}"`);
//       }

//       if (task.name !== originalItem.name) {
//           input.name = task.name;
//           updatedOptimisticTask.name = task.name; // Optimistic update
//           hasChanges = true;
//           console.log(`  Name changed: "${originalItem.name}" -> "${task.name}"`);
//       }

//       if (hasChanges) {
//         // Optimistically update the UI
//         setOptimisticGanttTasks(prev => prev.map(t => t.id === updatedOptimisticTask.id ? updatedOptimisticTask : t));
//         console.log("  Optimistically updated task dates/name in UI.");

//         try {
//           console.log(`  Initiating updateGanttTask for ${originalItem.originalType} (${originalItem.originalTaskId}). Partial Input:`, input);
//           await updateGanttTask(input);
//           // *** REMOVED: debouncedRefetchGanttData(); ***
//           console.log("  Task/milestone updated successfully. Apollo cache update handled via mutation's 'update' function.");
//         } catch (err) {
//           console.error("  Error updating Gantt task/milestone dates/name:", err);
//           // TODO: Potentially revert optimistic update here if error is critical
//         }
//       } else {
//         console.log(`  No date or name changes detected for task ${task.id}. Skipping update.`);
//       }
//     }
//     console.groupEnd();
//   }, [optimisticGanttTasks, sprintFilterOptions, updateGanttTask, updateSprintDates, refetchGanttData]); // Removed debouncedRefetchGanttData from deps


//   const handleTaskDelete = useCallback((task: GanttTaskReact) => {
//     console.log("[GanttView - Callback] handleTaskDelete: Deletion requested for task:", task);
//     // Block delete if a create or sprint mutation is in progress, but allow if only updateGanttTask is loading
//     if (createGanttTaskLoading || updateSprintLoading) {
//         console.warn("[GanttView - Callback] handleTaskDelete: Creation or Sprint mutation already in progress, deferring task delete.");
//         return false;
//     }

//     const conf = window.confirm("Are you sure you want to delete " + task.name + " ?");
//     if (conf) {
//       const originalItem = optimisticGanttTasks.find(t => t.id === task.id);
//       if (!originalItem) {
//         console.warn(`[GanttView - Callback] handleTaskDelete: Original item not found for deletion ID: ${task.id}`);
//         return false;
//       }

//       console.log(`[GanttView - Callback] handleTaskDelete: Attempting to delete ${originalItem.originalType} with ID: ${originalItem.originalTaskId}`);
//       if (originalItem.originalType === "TASK") {
//         // Optimistically remove from UI
//         setOptimisticGanttTasks(prev => prev.filter(t => t.id !== task.id));
//         console.log("  Optimistically removed task from UI.");

//         // TODO: Call actual delete mutation here
//         // For now, simulating deletion then refetching to sync
//         console.log("[GanttView - Callback] handleTaskDelete: Task deletion (simulated). Calling refetchGanttData().");
//         refetchGanttData(); // Direct refetch after (simulated) deletion
//         console.log("[GanttView - Callback] handleTaskDelete: refetchGanttData() call initiated.");
//         return true;
//       } else {
//         alert(`Deletion of ${originalItem.originalType} (milestones or sprints) not yet supported.`);
//         console.log(`[GanttView - Callback] handleTaskDelete: Deletion of ${originalItem.originalType} is not supported.`);
//         return false;
//       }
//     }
//     console.log("[GanttView - Callback] handleTaskDelete: Deletion cancelled by user.");
//     return conf;
//   }, [optimisticGanttTasks, refetchGanttData, createGanttTaskLoading, updateSprintLoading]);


//   const handleProgressChange = useCallback(async (task: GanttTaskReact) => {
//     console.groupCollapsed(`[GanttView - Callback] handleProgressChange: Task ID=${task.id}, Name="${task.name}"`);
//     console.log(`  Gantt library event reported: New Progress=${task.progress}`);

//     const originalItem = optimisticGanttTasks.find(t => t.id === task.id);
//     if (!originalItem) {
//       console.warn(`  Original item not found for progress update ID: ${task.id}. Cannot process update.`);
//       console.groupEnd();
//       return;
//     }
//     if (originalItem.originalType !== "TASK") {
//         console.warn(`  Item ID ${task.id} is of type "${originalItem.originalType}", not "TASK". Skipping progress update.`);
//         console.groupEnd();
//         return;
//     }

//     console.log(`  Original task's progress (from local state): ${originalItem.progress}%`);

//     const roundedOriginalProgress = Math.round(originalItem.progress || 0);
//     const roundedNewProgress = Math.round(task.progress || 0);

//     if (roundedOriginalProgress !== roundedNewProgress) {
//       // Optimistically update the UI
//       setOptimisticGanttTasks(prev => prev.map(t =>
//         t.id === task.id ? { ...t, progress: roundedNewProgress } : t
//       ));
//       console.log(`  Optimistically updated task progress in UI from ${roundedOriginalProgress}% to ${roundedNewProgress}%.`);

//       try {
//         console.log(`  Detected actual progress change for task (${originalItem.originalTaskId}). Updating from ${roundedOriginalProgress}% to ${roundedNewProgress}%.`);
//         await updateGanttTask({
//           id: originalItem.originalTaskId,
//           type: "TASK",
//           progress: roundedNewProgress,
//         });
//         // *** REMOVED: debouncedRefetchGanttData(); ***
//         console.log("  Task progress updated successfully. Apollo cache update handled via mutation's 'update' function.");
//       } catch (err) {
//         console.error("  Error updating task progress:", err);
//         // TODO: Potentially revert optimistic update here if error is critical
//       }
//     } else {
//       console.log(`  No *significant* progress change detected for task ${task.id} (original=${roundedOriginalProgress}%, new=${roundedNewProgress}%). Skipping update.`);
//     }
//     console.groupEnd();
//   }, [optimisticGanttTasks, updateGanttTask]); // Removed debouncedRefetchGanttData from deps


//   const handleDoubleClick = useCallback((task: GanttTaskReact) => {
//     console.log("[GanttView - Callback] handleDoubleClick: Task double clicked:", task);
//     alert("Double clicked task: " + task.name + " (ID: " + task.id + ")");
//   }, []);

//   const handleAddTask = useCallback(async (newTaskData: {
//     name: string,
//     start: Date,
//     end: Date,
//     progress: number,
//     type: "task" | "milestone" | "project",
//     sprint: string,
//     projectId: string,
//   }) => {
//     console.groupCollapsed("[GanttView - Callback] handleAddTask: Attempting to create new Gantt item.");
//     console.log("  New task data:", newTaskData);

//     // Block add task if any creation or sprint mutation is in progress
//     if (createGanttTaskLoading || updateSprintLoading) {
//         console.warn("[GanttView - Callback] handleAddTask: Creation or Sprint mutation already in progress, deferring add task.");
//         console.groupEnd();
//         return;
//     }

//     const input: any = {
//       projectId: newTaskData.projectId,
//       sprintId: newTaskData.sprint,
//       name: newTaskData.name,
//       startDate: newTaskData.start.toISOString(),
//       endDate: newTaskData.end.toISOString(),
//     };

//     if (newTaskData.type === "task") {
//       input.type = "task";
//       input.progress = newTaskData.progress;
//     } else if (newTaskData.type === "milestone") {
//       input.type = "milestone";
//       input.endDate = newTaskData.end.toISOString();
//     } else {
//         console.warn("[GanttView - Callback] handleAddTask: Cannot create 'project' type from modal. Aborting.");
//         console.groupEnd();
//         return;
//     }

//     try {
//         console.log("  Initiating createGanttTask mutation with input:", input);
//         await createGanttTask(input); // This mutation still has refetchQueries
//         console.log("  New item created successfully. Closing modal and triggering refetchGanttData().");
//         setIsCreateTaskOpen(false);
//         // Refetch is handled by createGanttTaskMutation's refetchQueries
//     } catch (err) {
//         console.error("  Error creating Gantt item:", err);
//     }
//     console.groupEnd();
//   }, [createGanttTask, createGanttTaskLoading, updateSprintLoading]);


//   const handleSprintSelectionChange = useCallback((sprintId: string) => {
//     console.log(`[GanttView - Callback] handleSprintSelectionChange: Changing selected sprint from "${internalSelectedSprintId}" to "${sprintId || 'All Sprints'}".`);
//     setInternalSelectedSprintId(sprintId); // This will cause a re-render and re-run useGanttData
//     console.log(`[GanttView - Callback] handleSprintSelectionChange: useGanttData will react to sprintId change.`);
//   }, [internalSelectedSprintId]);


//   const currentSprintName = useMemo(() => {
//     // console.log("[GanttView - Memo] Recalculating currentSprintName.");
//     if (sprintFilterOptions.length === 0) {
//       return "No Sprints";
//     }
//     const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
//     const foundSprint = sprintFilterOptions.find(s => s.id === activeSprintId);
//     return foundSprint?.name || "Select Sprint";
//   }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);


//   // Determine UI blocking states more granularly
//   // isBlockingUI: for buttons that shouldn't be clicked if a significant operation is ongoing.
//   // It should block new creations, sprint changes, and initial data loading.
//   const isBlockingUI = ganttDataLoading || createGanttTaskLoading || updateSprintLoading;

//   // readOnlyGanttChart: for the Gantt chart itself.
//   // It should be read-only only if full data is being loaded or
//   // if a create/delete/sprint-update operation is active.
//   // Individual task updates (updateGanttTaskLoading) should not make the entire chart readOnly,
//   // as optimistic updates are meant to be seamless.
//   const readOnlyGanttChart = ganttDataLoading || createGanttTaskLoading || updateSprintLoading;


//   if (ganttDataLoading && optimisticGanttTasks.length === 0) {
//     console.log("[GanttView - Render Branch] Rendering initial loading spinner (ganttDataLoading=true).");
//     return (
//       <div className="flex items-center justify-center min-h-[calc(10vh)] bg-muted/30">
//         <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
//         <p className="ml-4 text-lg text-slate-700">Loading Gantt data...</p>
//       </div>
//     );
//   }

//   if (ganttDataError) {
//     console.error("[GanttView - Render Branch] Rendering error message (ganttDataError=true):", ganttDataError);
//     return (
//       <div className="flex items-center justify-center min-h-[calc(10vh)] bg-red-100 text-red-700 p-4">
//         <p className="text-lg">Error loading Gantt data: {ganttDataError.message}</p>
//       </div>
//     );
//   }

//   if (mutationError) {
//     console.error("[GanttView - Render Branch] Rendering mutation error message (mutationError=true):", mutationError);
//     return (
//         <div className="flex items-center justify-center min-h-[calc(10vh)] bg-red-100 text-red-700 p-4">
//             <p className="text-lg">Error performing mutation: {mutationError.message}</p>
//         </div>
//     );
//   }


//   if (sprintFilterOptions.length === 0) {
//     console.log("[GanttView - Render Branch] Rendering 'No Sprints Found' message.");
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[calc(10vh)] bg-muted/30 p-8 text-center">
//         <h2 className="text-3xl font-bold text-foreground mb-4">No Sprints Found</h2>
//         <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
//           It looks like there are no sprints in this project yet. Create one to get started.
//         </p>
//         <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isBlockingUI}>
//           {isBlockingUI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//           + Add Task/Milestone
//         </Button>
//       </div>
//     );
//   }


//   if (!optimisticGanttTasks || optimisticGanttTasks.length === 0) {
//     console.log(`[GanttView - Render Branch] Rendering 'No Items in "${currentSprintName}"' message.`);
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[calc(10vh)] bg-muted/30 p-8 text-center">
//         <h2 className="text-3xl font-bold text-foreground mb-4">No Items in "{currentSprintName}"</h2>
//         <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
//           The selected sprint "{currentSprintName}" has no tasks or milestones. Add a new item!
//         </p>
//         <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isBlockingUI}>
//           {isBlockingUI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//           + Add Task/Milestone
//         </Button>
//       </div>
//     );
//   }

//   console.log("[GanttView - Render Branch] Rendering main Gantt chart component.");
//   return (
//     <div className="relative px-6">
//       <div className="flex items-center gap-3 py-6">
//         <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isBlockingUI}>
//           {isBlockingUI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//           + Add item
//         </Button>
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent" disabled={isBlockingUI}>
//               {currentSprintName} <ChevronDown className="h-4 w-4 text-muted-foreground" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="start">
//             <DropdownMenuLabel>Sprints</DropdownMenuLabel>
//             {sprintFilterOptions.map(sprint => (
//                 <DropdownMenuItem
//                     key={sprint.id}
//                     onClick={() => handleSprintSelectionChange(sprint.id)}
//                     disabled={isBlockingUI}
//                 >
//                     {sprint.name}
//                 </DropdownMenuItem>
//             ))}
//           </DropdownMenuContent>
//         </DropdownMenu>

//         <div className="flex rounded-md shadow-sm ml-4" role="group">
//             <Button
//                 variant={viewMode === ViewMode.Day ? "default" : "outline"}
//                 onClick={() => setViewMode(ViewMode.Day)}
//                 className="rounded-r-none h-9"
//                 disabled={isBlockingUI}
//             >
//                 Day
//             </Button>
//             <Button
//                 variant={viewMode === ViewMode.Week ? "default" : "outline"}
//                 onClick={() => setViewMode(ViewMode.Week)}
//                 className="rounded-none h-9 border-l-0"
//                 disabled={isBlockingUI}
//             >
//                 Week
//             </Button>
//             <Button
//                 variant={viewMode === ViewMode.Month ? "default" : "outline"}
//                 onClick={() => setViewMode(ViewMode.Month)}
//                 className="rounded-none h-9 border-l-0"
//                 disabled={isBlockingUI}
//             >
//                 Month
//             </Button>
//             <Button
//                 variant={viewMode === ViewMode.Year ? "default" : "outline"}
//                 onClick={() => setViewMode(ViewMode.Year)}
//                 className="rounded-l-none h-9 border-l-0"
//                 disabled={isBlockingUI}
//             >
//                 Year
//             </Button>
//         </div>


//         <div className="ml-auto relative w-[260px]">
//           <Input className="h-9" placeholder="Search tasks..." disabled={isBlockingUI} />
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         {isCreateTaskOpen && (
//             <RightSideModal onClose={() => setIsCreateTaskOpen(false)}>
//                 <TaskForm
//                     onAddTask={handleAddTask}
//                     onClose={() => setIsCreateTaskOpen(false)}
//                     availableSprints={sprintFilterOptions}
//                     currentProjectId={projectId}
//                     isMutating={isBlockingUI}
//                 />
//             </RightSideModal>
//         )}

//         <Gantt
//             tasks={optimisticGanttTasks}
//             viewMode={viewMode}
//             onDateChange={handleTaskChange}
//             onDelete={handleTaskDelete}
//             onProgressChange={handleProgressChange}
//             onDoubleClick={handleDoubleClick}
//             listCellWidth="200px"
//             columnWidth={dynamicColumnWidth}
//             readOnly={readOnlyGanttChart} // Now uses the more specific readOnlyGanttChart
//         />
//       </div>
//     </div>
//   );
// };

// // RightSideModal component (unchanged)
// interface RightSideModalProps {
//     children: React.ReactNode;
//     onClose: () => void;
// }

// const RightSideModal: React.FC<RightSideModalProps> = ({ children, onClose }) => {
//     return (
//         <div className="fixed inset-0 z-50 overflow-hidden">
//             <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose}></div>
//             <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0">
//                 <div className="flex items-center justify-between p-4 border-b">
//                     <h2 className="text-lg font-semibold">Create New Task</h2>
//                     <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                     </Button>
//                 </div>
//                 <div className="flex-grow p-4 overflow-y-auto">
//                     {children}
//                 </div>
//             </div>
//         </div>
//     );
// };


// interface TaskFormProps {
//   onAddTask: (task: {
//     name: string,
//     start: Date,
//     end: Date,
//     progress: number,
//     type: "task" | "milestone" | "project",
//     sprint: string,
//     projectId: string,
//   }) => void;
//   onClose: () => void;
//   availableSprints: SprintGanttFilterOption[];
//   currentProjectId: string;
//   isMutating: boolean; // Renamed to overallLoading
// }

// const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, availableSprints, currentProjectId, isMutating }) => {
//   const [name, setName] = useState("");
//   const [start, setStart] = useState<Date>(new Date());
//   const [end, setEnd] = useState<Date>(new Date());
//   const [progress, setProgress] = useState(0);
//   const [type, setType] = useState<"task" | "milestone" | "project">("task");
//   const [sprintId, setSprintId] = useState<string | undefined>(undefined);

//   useEffect(() => {
//     if (availableSprints.length > 0 && !sprintId) {
//       setSprintId(availableSprints[0].id);
//     }
//   }, [availableSprints, sprintId]);


//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!name.trim() || !start || !end) {
//       alert("Please fill in name, start date, and end date.");
//       return;
//     }

//     if (!sprintId && type !== "project") {
//         alert("Please select a sprint for tasks and milestones.");
//         return;
//     }

//     const newTaskData = {
//       start: start,
//       end: end,
//       name: name,
//       type: type,
//       progress: progress,
//       sprint: sprintId || '',
//       projectId: currentProjectId,
//     };

//     onAddTask(newTaskData);
//     setName("");
//     setStart(new Date());
//     setEnd(new Date());
//     setProgress(0);
//     setType("task");
//     setSprintId(availableSprints.length > 0 ? availableSprints[0].id : undefined);
//   };

//   return (
//     <div className="space-y-4">
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">Name:</label>
//           <Input id="taskName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full" required disabled={isMutating} />
//         </div>
//         <div>
//           <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
//           <Input id="startDate" type="date" value={start.toISOString().split('T')[0]} onChange={(e) => setStart(new Date(e.target.value))} className="mt-1 block w-full" required disabled={isMutating} />
//         </div>
//         <div>
//           <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date:</label>
//           <Input id="endDate" type="date"  value={end.toISOString().split('T')[0]} onChange={(e) => setEnd(new Date(e.target.value))} className="mt-1 block w-full" required disabled={isMutating} />
//         </div>
//         {type === "task" && (
//             <div>
//               <label htmlFor="progress" className="block text-sm font-medium text-gray-700">Progress (%):</label>
//               <Input id="progress" type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} min="0" max="100" className="mt-1 block w-full" disabled={isMutating} />
//             </div>
//         )}
//         <div>
//           <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">Type:</label>
//           <select id="taskType" value={type} onChange={(e) => setType(e.target.value as "task" | "milestone" | "project")} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" disabled={isMutating}>
//             <option value="task">Task</option>
//             <option value="milestone">Milestone</option>
//           </select>
//         </div>
//         {type !== "project" && (
//             <div>
//                 <label htmlFor="sprintSelect" className="block text-sm font-medium text-gray-700">Sprint:</label>
//                 <select
//                     id="sprintSelect"
//                     value={sprintId || ""}
//                     onChange={(e) => setSprintId(e.target.value)}
//                     className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
//                     required
//                     disabled={isMutating}
//                 >
//                     <option value="">Select Sprint</option>
//                     {availableSprints.map(sprintOption => (
//                         <option key={sprintOption.id} value={sprintOption.id}>{sprintOption.name}</option>
//                     ))}
//                 </select>
//             </div>
//         )}
//         <div className="flex justify-end gap-2 mt-6">
//           <Button type="button" variant="outline" onClick={onClose} disabled={isMutating}>Cancel</Button>
//           <Button type="submit" className="bg-[#4ab5ae] text-white" disabled={isMutating}>
//             {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//             Create Item
//           </Button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default GanttView;





// components/tasks/gantt-view.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Gantt, Task as GanttTaskReact, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";

import { useGanttData, CustomGanttTask, SprintGanttFilterOption } from "@/hooks/useGanttData";
import { useGanttMutations } from "@/hooks/useGanttMutations";

interface GanttViewProps {
  projectId: string;
}

// Helper to determine start/end date for a parent sprint based on its children tasks/milestones
export function getStartEndDateForParent(tasks: CustomGanttTask[], parentId: string) {
  const children = tasks.filter((t) => t.sprint === parentId);
  if (children.length === 0) {
    const parent = tasks.find(t => t.id === parentId);
    return parent ? [parent.start, parent.end] : [new Date(), new Date()];
  }
  let start = children[0].start;
  let end = children[0].end;

  for (let i = 0; i < children.length; i++) {
    const task = children[i];
    if (start.getTime() > task.start.getTime()) {
      start = task.start;
    }
    if (end.getTime() < task.end.getTime()) {
      end = task.end;
    }
  }
  return [start, end];
}

// Custom hook for debouncing functions (now only used for full refetches, if still needed)
function useDebounce(callback: () => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
}


const GanttView: React.FC<GanttViewProps> = ({ projectId }) => {
  // --- Component State ---
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
  // State for optimistic UI updates
  const [optimisticGanttTasks, setOptimisticGanttTasks] = useState<CustomGanttTask[]>([]);

  // --- Refs for debugging re-renders ---
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[GanttView - Render Cycle #${renderCount.current}] Component rendered.`);
  });

  // Log the state of optimisticGanttTasks at the beginning of each render
  console.log(`[GanttView - Render State] optimisticGanttTasks contains ${optimisticGanttTasks.length} items.`, JSON.parse(JSON.stringify(optimisticGanttTasks.map(t => ({id: t.id, name: t.name, originalTaskId: t.originalTaskId})))));


  const {
    ganttTasks, // Original tasks from Apollo hook
    sprintFilterOptions,
    loading: ganttDataLoading,
    error: ganttDataError,
    refetchGanttData,
    defaultSelectedSprintId: suggestedDefaultSprintId
  } = useGanttData(projectId, internalSelectedSprintId);

  const {
    createGanttTask,
    updateGanttTask,
    updateSprintDates,
    isMutating, // Combined mutation loading state
    createGanttTaskLoading, // Individual mutation loading states
    updateGanttTaskLoading,
    updateSprintLoading,
    mutationError
  } = useGanttMutations(projectId, internalSelectedSprintId);

  // Debounce refetching logic for date/progress changes - only used for sprint changes now
  const debouncedRefetchGanttData = useDebounce(refetchGanttData, 700); // Debounce for 700ms

  // Effect to update optimisticGanttTasks when actual ganttTasks change from Apollo
  useEffect(() => {
    console.groupCollapsed("[Effect: Sync Apollo Data]");
    console.log("  Effect triggered due to change in 'ganttTasks', 'ganttDataLoading', or 'ganttDataError'.");
    console.log(`  Current ganttDataLoading: ${ganttDataLoading}`);
    console.log(`  Incoming 'ganttTasks' from Apollo has ${ganttTasks?.length || 0} items.`);
    
    if (ganttTasks && ganttTasks.length > 0) {
      if (JSON.stringify(ganttTasks) !== JSON.stringify(optimisticGanttTasks)) {
        console.log("  SERVER DATA MISMATCH: Apollo 'ganttTasks' is different from local 'optimisticGanttTasks'. Updating local state to match server.");
        console.log("  Data from server (ganttTasks):", JSON.parse(JSON.stringify(ganttTasks)));
        console.log("  Current local data (optimisticGanttTasks):", JSON.parse(JSON.stringify(optimisticGanttTasks)));
        setOptimisticGanttTasks(ganttTasks);
      } else {
        console.log("  SERVER DATA MATCH: Apollo 'ganttTasks' is identical to local 'optimisticGanttTasks'. No state update needed.");
      }
    } else if (!ganttDataLoading && !ganttDataError) {
        if (optimisticGanttTasks.length > 0) {
          console.log("  Apollo data is empty/unavailable. Clearing local 'optimisticGanttTasks'.");
          setOptimisticGanttTasks([]);
        } else {
          console.log("  Apollo data is empty, and local state is already empty. No change.");
        }
    }
    console.groupEnd();
  }, [ganttTasks, ganttDataLoading, ganttDataError, optimisticGanttTasks]);


  useEffect(() => {
    if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
      console.log(`[GanttView - State Effect] Initializing internalSelectedSprintId to suggestedDefaultSprintId: ${suggestedDefaultSprintId}`);
      setInternalSelectedSprintId(suggestedDefaultSprintId);
    }
  }, [suggestedDefaultSprintId, internalSelectedSprintId]);


  const dynamicColumnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day: return 150;
      case ViewMode.Week: return 250;
      case ViewMode.Month: return 300;
      case ViewMode.Year: return 500;
      default: return 150;
    }
  }, [viewMode]);

  const handleTaskChange = useCallback(async (task: GanttTaskReact) => {
    console.group(`[CALLBACK: handleTaskChange] triggered for Task ID=${task.id}`);
    console.log("  [1] Event data from Gantt library:", JSON.parse(JSON.stringify(task)));

    if (task.type === "project") { // It's a sprint group
      const sprintToUpdate = sprintFilterOptions.find(s => s.id === task.id);
      if (sprintToUpdate) {
        console.log(`  [2] Item is a SPRINT ('project' type). Found sprint: "${sprintToUpdate.name}"`);
        setOptimisticGanttTasks(prev => {
          const newState = prev.map(t =>
            t.id === task.id ? { ...t, start: task.start, end: task.end } : t
          );
          console.log("  [3] Optimistically updating sprint dates in UI state.");
          return newState;
        });

        console.log(`  [4] Calling 'updateSprintDates' mutation for ID ${sprintToUpdate.id} with Start: ${task.start.toISOString()}, End: ${task.end.toISOString()}`);
        try {
          await updateSprintDates(sprintToUpdate.id, task.start, task.end);
          console.log("  [5] SUCCESS: 'updateSprintDates' mutation completed.");
          console.log("  [6] Triggering immediate refetchGanttData() to sync all data.");
          refetchGanttData();
        } catch (err) {
          console.error("  [5] ERROR: 'updateSprintDates' mutation failed:", err);
        }
      } else {
        console.warn(`  [2] Item is a SPRINT ('project' type), but no matching sprint found in sprintFilterOptions for ID: ${task.id}`);
      }
    } else { // It's a regular task or milestone
      console.log("  [2] Item is a TASK or MILESTONE.");
      const originalItem = optimisticGanttTasks.find(t => t.id === task.id);

      if (!originalItem) {
        console.error(`  [3] FATAL ERROR: Could not find original task in 'optimisticGanttTasks' with ID: ${task.id}. Cannot process update. This is likely the cause of your bug.`);
        console.log("      Current 'optimisticGanttTasks' IDs:", optimisticGanttTasks.map(t => t.id));
        console.groupEnd();
        return;
      }

      console.log("  [3] Found original item in local state:", JSON.parse(JSON.stringify(originalItem)));
      console.log(`      -> Original DB ID (originalTaskId): ${originalItem.originalTaskId}`);
      console.log(`      -> Original DB Type (originalType): ${originalItem.originalType}`);

      const input: {
        id: string;
        type: "TASK" | "MILESTONE";
        startDate?: string | null;
        endDate?: string | null;
        name?: string | null;
      } = {
        id: originalItem.originalTaskId,
        type: originalItem.originalType,
      };

      let hasChanges = false;
      let updatedOptimisticTask = { ...originalItem };

      const currentStart = originalItem.start.toISOString().split('T')[0];
      const newStart = task.start.toISOString().split('T')[0];
      if (currentStart !== newStart) {
        input.startDate = task.start.toISOString();
        updatedOptimisticTask.start = task.start;
        hasChanges = true;
        console.log(`  [4a] Change detected: Start date "${currentStart}" -> "${newStart}"`);
      }

      const currentEnd = originalItem.end.toISOString().split('T')[0];
      const newEnd = task.end.toISOString().split('T')[0];
      if (currentEnd !== newEnd) {
        input.endDate = task.end.toISOString();
        updatedOptimisticTask.end = task.end;
        hasChanges = true;
        console.log(`  [4b] Change detected: End date "${currentEnd}" -> "${newEnd}"`);
      }

      if (task.name !== originalItem.name) {
          input.name = task.name;
          updatedOptimisticTask.name = task.name;
          hasChanges = true;
          console.log(`  [4c] Change detected: Name "${originalItem.name}" -> "${task.name}"`);
      }

      if (hasChanges) {
        console.log("  [5] Changes were detected. Proceeding with update.");
        setOptimisticGanttTasks(prev => {
          const newState = prev.map(t => t.id === updatedOptimisticTask.id ? updatedOptimisticTask : t);
          console.log("  [6] Optimistically updating item in UI state.", JSON.parse(JSON.stringify(updatedOptimisticTask)));
          return newState;
        });

        try {
          console.log("  [7] Calling 'updateGanttTask' mutation with input:", input);
          await updateGanttTask(input);
          console.log("  [8] SUCCESS: 'updateGanttTask' mutation completed. The Apollo cache should now be updated automatically.");
        } catch (err) {
          console.error("  [8] ERROR: 'updateGanttTask' mutation failed:", err);
          // NOTE: Here you might want to revert the optimistic update.
        }
      } else {
        console.log("  [5] No changes detected. Skipping update.");
      }
    }
    console.groupEnd();
  }, [optimisticGanttTasks, sprintFilterOptions, updateGanttTask, updateSprintDates, refetchGanttData]);


  const handleTaskDelete = useCallback((task: GanttTaskReact) => {
    console.log("[GanttView - Callback] handleTaskDelete: Deletion requested for task:", task);
    if (createGanttTaskLoading || updateSprintLoading) {
        console.warn("[GanttView - Callback] handleTaskDelete: Creation or Sprint mutation already in progress, deferring task delete.");
        return false;
    }

    const conf = window.confirm("Are you sure you want to delete " + task.name + " ?");
    if (conf) {
      const originalItem = optimisticGanttTasks.find(t => t.id === task.id);
      if (!originalItem) {
        console.warn(`[GanttView - Callback] handleTaskDelete: Original item not found for deletion ID: ${task.id}`);
        return false;
      }

      console.log(`[GanttView - Callback] handleTaskDelete: Attempting to delete ${originalItem.originalType} with ID: ${originalItem.originalTaskId}`);
      if (originalItem.originalType === "TASK") {
        setOptimisticGanttTasks(prev => {
          const newState = prev.filter(t => t.id !== task.id);
          console.log("  Optimistically removed task from UI.");
          return newState;
        });
        // TODO: Call actual delete mutation here
        console.log("[GanttView - Callback] handleTaskDelete: Task deletion (simulated). Calling refetchGanttData().");
        refetchGanttData();
        return true;
      } else {
        alert(`Deletion of ${originalItem.originalType} (milestones or sprints) not yet supported.`);
        console.log(`[GanttView - Callback] handleTaskDelete: Deletion of ${originalItem.originalType} is not supported.`);
        return false;
      }
    }
    console.log("[GanttView - Callback] handleTaskDelete: Deletion cancelled by user.");
    return conf;
  }, [optimisticGanttTasks, refetchGanttData, createGanttTaskLoading, updateSprintLoading]);


  const handleProgressChange = useCallback(async (task: GanttTaskReact) => {
    console.groupCollapsed(`[CALLBACK: handleProgressChange] for Task ID=${task.id}`);
    console.log(`  Gantt library event reported: New Progress=${task.progress}`);

    const originalItem = optimisticGanttTasks.find(t => t.id === task.id);
    if (!originalItem) {
      console.warn(`  Original item not found for progress update ID: ${task.id}. Cannot process update.`);
      console.groupEnd();
      return;
    }
    if (originalItem.originalType !== "TASK") {
        console.warn(`  Item ID ${task.id} is of type "${originalItem.originalType}", not "TASK". Skipping progress update.`);
        console.groupEnd();
        return;
    }

    const roundedOriginalProgress = Math.round(originalItem.progress || 0);
    const roundedNewProgress = Math.round(task.progress || 0);

    if (roundedOriginalProgress !== roundedNewProgress) {
      setOptimisticGanttTasks(prev => {
        const newState = prev.map(t =>
          t.id === task.id ? { ...t, progress: roundedNewProgress } : t
        );
        console.log(`  Optimistically updated task progress in UI from ${roundedOriginalProgress}% to ${roundedNewProgress}%.`);
        return newState;
      });

      try {
        console.log(`  Detected progress change for task (${originalItem.originalTaskId}). Calling 'updateGanttTask'.`);
        await updateGanttTask({
          id: originalItem.originalTaskId,
          type: "TASK",
          progress: roundedNewProgress,
        });
        console.log("  SUCCESS: Task progress updated. Apollo cache should be updated.");
      } catch (err) {
        console.error("  ERROR: updating task progress:", err);
      }
    } else {
      console.log(`  No significant progress change detected for task ${task.id} (original=${roundedOriginalProgress}%, new=${roundedNewProgress}%). Skipping update.`);
    }
    console.groupEnd();
  }, [optimisticGanttTasks, updateGanttTask]);


  const handleDoubleClick = useCallback((task: GanttTaskReact) => {
    console.log("[GanttView - Callback] handleDoubleClick: Task double clicked:", task);
    alert("Double clicked task: " + task.name + " (ID: " + task.id + ")");
  }, []);

  const handleAddTask = useCallback(async (newTaskData: {
    name: string,
    start: Date,
    end: Date,
    progress: number,
    type: "task" | "milestone" | "project",
    sprint: string,
    projectId: string,
  }) => {
    console.groupCollapsed("[CALLBACK: handleAddTask]");
    console.log("  [1] New task data from form:", newTaskData);

    if (createGanttTaskLoading || updateSprintLoading) {
        console.warn("  [2] A mutation is already in progress, deferring add task.");
        console.groupEnd();
        return;
    }

    const input: any = {
      projectId: newTaskData.projectId,
      sprintId: newTaskData.sprint,
      name: newTaskData.name,
      startDate: newTaskData.start.toISOString(),
      endDate: newTaskData.end.toISOString(),
    };

    if (newTaskData.type === "task") {
      input.type = "task";
      input.progress = newTaskData.progress;
    } else if (newTaskData.type === "milestone") {
      input.type = "milestone";
      // Milestones only have one date in some models, ensure endDate is the one sent
      input.endDate = newTaskData.end.toISOString();
      input.startDate = newTaskData.end.toISOString(); // Often start and end are the same
    } else {
        console.warn("  [2] Cannot create 'project' type from this modal. Aborting.");
        console.groupEnd();
        return;
    }

    try {
        console.log("  [2] Calling 'createGanttTask' mutation with input:", input);
        await createGanttTask(input);
        console.log("  [3] SUCCESS: 'createGanttTask' mutation completed. Closing modal.");
        setIsCreateTaskOpen(false);
        // Refetch is handled by the mutation's configuration.
    } catch (err) {
        console.error("  [3] ERROR creating Gantt item:", err);
    }
    console.groupEnd();
  }, [createGanttTask, createGanttTaskLoading, updateSprintLoading]);


  const handleSprintSelectionChange = useCallback((sprintId: string) => {
    console.log(`[GanttView - Callback] handleSprintSelectionChange: Changing selected sprint from "${internalSelectedSprintId}" to "${sprintId || 'All Sprints'}".`);
    setInternalSelectedSprintId(sprintId);
  }, [internalSelectedSprintId]);


  const currentSprintName = useMemo(() => {
    if (sprintFilterOptions.length === 0) {
      return "No Sprints";
    }
    const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
    const foundSprint = sprintFilterOptions.find(s => s.id === activeSprintId);
    return foundSprint?.name || "Select Sprint";
  }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);


  const isBlockingUI = ganttDataLoading || createGanttTaskLoading || updateSprintLoading;
  const readOnlyGanttChart = ganttDataLoading || createGanttTaskLoading || updateSprintLoading;


  if (ganttDataLoading && optimisticGanttTasks.length === 0) {
    console.log("[GanttView - Render Branch] Rendering initial loading spinner.");
    return (
      <div className="flex items-center justify-center min-h-[calc(10vh)] bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading Gantt data...</p>
      </div>
    );
  }

  if (ganttDataError) {
    console.error("[GanttView - Render Branch] Rendering data error message:", ganttDataError);
    return (
      <div className="flex items-center justify-center min-h-[calc(10vh)] bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading Gantt data: {ganttDataError.message}</p>
      </div>
    );
  }

  if (mutationError) {
    console.error("[GanttView - Render Branch] Rendering mutation error message:", mutationError);
    return (
        <div className="flex items-center justify-center min-h-[calc(10vh)] bg-red-100 text-red-700 p-4">
            <p className="text-lg">Error performing mutation: {mutationError.message}</p>
        </div>
    );
  }


  if (sprintFilterOptions.length === 0) {
    console.log("[GanttView - Render Branch] Rendering 'No Sprints Found' message.");
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Sprints Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          It looks like there are no sprints in this project yet. Create one to get started.
        </p>
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isBlockingUI}>
          {isBlockingUI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add Task/Milestone
        </Button>
      </div>
    );
  }


  if (!optimisticGanttTasks || optimisticGanttTasks.length === 0) {
    console.log(`[GanttView - Render Branch] Rendering 'No Items in "${currentSprintName}"' message.`);
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Items in "{currentSprintName}"</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          The selected sprint "{currentSprintName}" has no tasks or milestones. Add a new item!
        </p>
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isBlockingUI}>
          {isBlockingUI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add Task/Milestone
        </Button>
      </div>
    );
  }

  console.log("[GanttView - Render Branch] Rendering main Gantt chart component.");
  return (
    <div className="relative px-6">
      <div className="flex items-center gap-3 py-6">
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isBlockingUI}>
          {isBlockingUI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add item
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent" disabled={isBlockingUI}>
              {currentSprintName} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintFilterOptions.map(sprint => (
                <DropdownMenuItem
                    key={sprint.id}
                    onClick={() => handleSprintSelectionChange(sprint.id)}
                    disabled={isBlockingUI}
                >
                    {sprint.name}
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex rounded-md shadow-sm ml-4" role="group">
            <Button
                variant={viewMode === ViewMode.Day ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Day)}
                className="rounded-r-none h-9"
                disabled={isBlockingUI}
            >
                Day
            </Button>
            <Button
                variant={viewMode === ViewMode.Week ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Week)}
                className="rounded-none h-9 border-l-0"
                disabled={isBlockingUI}
            >
                Week
            </Button>
            <Button
                variant={viewMode === ViewMode.Month ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Month)}
                className="rounded-none h-9 border-l-0"
                disabled={isBlockingUI}
            >
                Month
            </Button>
            <Button
                variant={viewMode === ViewMode.Year ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Year)}
                className="rounded-l-none h-9 border-l-0"
                disabled={isBlockingUI}
            >
                Year
            </Button>
        </div>


        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." disabled={isBlockingUI} />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isCreateTaskOpen && (
            <RightSideModal onClose={() => setIsCreateTaskOpen(false)}>
                <TaskForm
                    onAddTask={handleAddTask}
                    onClose={() => setIsCreateTaskOpen(false)}
                    availableSprints={sprintFilterOptions}
                    currentProjectId={projectId}
                    isMutating={isBlockingUI}
                />
            </RightSideModal>
        )}

        <Gantt
            tasks={optimisticGanttTasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            onDoubleClick={handleDoubleClick}
            listCellWidth="200px"
            columnWidth={dynamicColumnWidth}
            readOnly={readOnlyGanttChart}
        />
      </div>
    </div>
  );
};

// RightSideModal component (unchanged)
interface RightSideModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

const RightSideModal: React.FC<RightSideModalProps> = ({ children, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose}></div>
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Create New Task</h2>
                    <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};


interface TaskFormProps {
  onAddTask: (task: {
    name: string,
    start: Date,
    end: Date,
    progress: number,
    type: "task" | "milestone" | "project",
    sprint: string,
    projectId: string,
  }) => void;
  onClose: () => void;
  availableSprints: SprintGanttFilterOption[];
  currentProjectId: string;
  isMutating: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, availableSprints, currentProjectId, isMutating }) => {
  const [name, setName] = useState("");
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<"task" | "milestone" | "project">("task");
  const [sprintId, setSprintId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (availableSprints.length > 0 && !sprintId) {
      setSprintId(availableSprints[0].id);
    }
  }, [availableSprints, sprintId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !start || !end) {
      alert("Please fill in name, start date, and end date.");
      return;
    }

    if (!sprintId && type !== "project") {
        alert("Please select a sprint for tasks and milestones.");
        return;
    }

    const newTaskData = {
      start: start,
      end: end,
      name: name,
      type: type,
      progress: progress,
      sprint: sprintId || '',
      projectId: currentProjectId,
    };

    onAddTask(newTaskData);
    setName("");
    setStart(new Date());
    setEnd(new Date());
    setProgress(0);
    setType("task");
    setSprintId(availableSprints.length > 0 ? availableSprints[0].id : undefined);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">Name:</label>
          <Input id="taskName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full" required disabled={isMutating} />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
          <Input id="startDate" type="date" value={start.toISOString().split('T')[0]} onChange={(e) => setStart(new Date(e.target.value))} className="mt-1 block w-full" required disabled={isMutating} />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date:</label>
          <Input id="endDate" type="date"  value={end.toISOString().split('T')[0]} onChange={(e) => setEnd(new Date(e.target.value))} className="mt-1 block w-full" required disabled={isMutating} />
        </div>
        {type === "task" && (
            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-gray-700">Progress (%):</label>
              <Input id="progress" type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} min="0" max="100" className="mt-1 block w-full" disabled={isMutating} />
            </div>
        )}
        <div>
          <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">Type:</label>
          <select id="taskType" value={type} onChange={(e) => setType(e.target.value as "task" | "milestone" | "project")} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" disabled={isMutating}>
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
          </select>
        </div>
        {type !== "project" && (
            <div>
                <label htmlFor="sprintSelect" className="block text-sm font-medium text-gray-700">Sprint:</label>
                <select
                    id="sprintSelect"
                    value={sprintId || ""}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    required
                    disabled={isMutating}
                >
                    <option value="">Select Sprint</option>
                    {availableSprints.map(sprintOption => (
                        <option key={sprintOption.id} value={sprintOption.id}>{sprintOption.name}</option>
                    ))}
                </select>
            </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isMutating}>Cancel</Button>
          <Button type="submit" className="bg-[#4ab5ae] text-white" disabled={isMutating}>
            {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Item
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GanttView;






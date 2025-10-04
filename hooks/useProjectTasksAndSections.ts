// // hooks/useProjectTasksAndSections.ts
// import { useQuery, useMutation } from "@apollo/client";
// import { useCallback, useMemo , useEffect , useRef} from "react"; // Explicitly import useMemo, useCallback
// import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections";
// import { CREATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/createProjectSection";
// import { UPDATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/updateProjectSection";
// import { DELETE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/deleteProjectSection";
// import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"; // Re-use common type

// // --- Type Definitions for the hook's return ---
// export type PriorityUI = "Low" | "Medium" | "High";
// export type TaskStatusUI = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

// export interface TaskUI {
//   id: string;
//   title: string;
//   assignee: UserAvatarPartial | null;
//   due: string | null; // YYYY-MM-DD
//   priority: PriorityUI;
//   points: number;
//   completed: boolean; // Derived from TaskStatusUI
//   description?: string;
// }

// export interface SectionUI {
//   id: string;
//   title: string; // Mapped from 'name'
//   tasks: TaskUI[];
//   editing?: boolean; // Client-side state
// }

// export interface SprintFilterOption {
//   id: string;
//   name: string;
// }

// // Full response type for the main query
// interface ProjectTasksAndSectionsResponse {
//   getProjectTasksAndSections: {
//     sprints: SprintFilterOption[];
//     sections: Array<{
//       id: string;
//       name: string;
//       tasks: Array<{
//         id: string;
//         title: string;
//         description?: string;
//         status: TaskStatusUI;
//         priority: "LOW" | "MEDIUM" | "HIGH";
//         dueDate?: string;
//         points: number;
//         assignee: UserAvatarPartial | null;
//       }>;
//     }>;

//   } | null;
// }

// // Response type for createProjectSection mutation
// interface CreateProjectSectionMutationResponse {
//   createProjectSection: {
//     id: string;
//     name: string;
//     order: number;
//     tasks: Array<{ // Assuming tasks are returned to match SectionUI
//       id: string;
//       title: string;
//       description?: string;
//       status: TaskStatusUI;
//       priority: "LOW" | "MEDIUM" | "HIGH";
//       dueDate?: string;
//       points: number;
//       assignee: UserAvatarPartial | null;
//     }>;
//   };
// }

// // Variables type for createProjectSection mutation
// interface CreateProjectSectionVariables {
//   projectId: string;
//   name: string;
//   order?: number | null; // Make optional and potentially null
// }

// // Response type for updateProjectSection mutation
// interface UpdateSectionMutationResponse {
//   updateSection: {
//     id: string;
//     name: string;
//     order: number;
//   };
// }

// // Variables type for updateProjectSection mutation
// interface UpdateSectionVariables {
//   id: string;
//   name?: string | null; // Make optional and potentially null
//   order?: number | null; // Make optional and potentially null
// }

// // Response type for deleteProjectSection mutation
// interface DeleteProjectSectionMutationResponse {
//   deleteProjectSection: {
//     id: string;
//     name: string;
//     order: number;
//     tasks?: Array<{ // May return tasks if a new default section is created
//       id: string;
//       title: string;
//       description?: string;
//       status: TaskStatusUI;
//       priority: "LOW" | "MEDIUM" | "HIGH";
//       dueDate?: string;
//       points: number;
//       assignee: UserAvatarPartial | null;
//     }>;
//   };
// }

// // Variables type for deleteProjectSection mutation
// interface DeleteProjectSectionVariables {
//   id: string;
//   options: {
//     deleteTasks: boolean;
//     reassignToSectionId?: string | null;
//   };
// }

// // Helper to convert Prisma Priority enum to UI string
// const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
//   switch (priority) {
//     case "LOW": return "Low";
//     case "MEDIUM": return "Medium";
//     case "HIGH": return "High";
//   }
// };

// export function useProjectTasksAndSections(projectId: string, sprintId?: string | null) {
//   console.log("[useProjectTasksAndSections] Hook called. projectId:", projectId, "sprintId:", sprintId); // Initial call log

//   const { data, loading, error, refetch } = useQuery<ProjectTasksAndSectionsResponse>(GET_PROJECT_TASKS_AND_SECTIONS_QUERY, {
//     variables: { projectId, sprintId },
//     skip: !projectId,
//     fetchPolicy: "network-only",
//   });

//   console.log("[useProjectTasksAndSections] useQuery data state changed:", { loading, error, data: data ? "has data" : "no data" }); // Log when query status changes
//   if (error) {
//     console.error("[useProjectTasksAndSections] GraphQL Query Error:", error);
//   }

//   // --- Section Mutations ---
//   const [createProjectSectionMutation] = useMutation<CreateProjectSectionMutationResponse, CreateProjectSectionVariables>(CREATE_PROJECT_SECTION_MUTATION, {
//     refetchQueries: [
//       GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
//       "GetProjectTasksAndSections"
//     ],
//   });

//   const [updateProjectSectionMutation] = useMutation<UpdateSectionMutationResponse, UpdateSectionVariables>(UPDATE_PROJECT_SECTION_MUTATION, {
//     refetchQueries: [
//       GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
//       "GetProjectTasksAndSections"
//     ],
//   });

//   const [deleteProjectSectionMutation] = useMutation<DeleteProjectSectionMutationResponse, DeleteProjectSectionVariables>(DELETE_PROJECT_SECTION_MUTATION, {
//     refetchQueries: [
//       GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
//       "GetProjectTasksAndSections"
//     ],
//   });
//   // -------------------------

//   // Using a ref to track if transformedData reference actually changes
//   const lastTransformedDataRef = useRef<ProjectTasksAndSectionsResponse['getProjectTasksAndSections'] | undefined>(undefined);

//   const transformedData = data?.getProjectTasksAndSections;

//   // Log to see if transformedData's *reference* changes
//   useEffect(() => {
//     if (transformedData !== lastTransformedDataRef.current) {
//       console.log("[useProjectTasksAndSections] transformedData REFERENCE CHANGED.");
//       lastTransformedDataRef.current = transformedData;
//       // You can also deep log its content here if needed, but only if reference changed
//       // console.log("[useProjectTasksAndSections] transformedData NEW CONTENT:", JSON.parse(JSON.stringify(transformedData)));
//     } else {
//       console.log("[useProjectTasksAndSections] transformedData REFERENCE UNCHANGED.");
//     }
//   }, [transformedData]); // This effect depends on the reference of transformedData


//   const sections: SectionUI[] = useMemo(() => {
//     console.log("[useProjectTasksAndSections] useMemo for sections is running...");
//     // Log transformedData's content, but only here because useMemo memoizes it
//     if (transformedData) {
//       console.log("[useProjectTasksAndSections] transformedData content inside useMemo:", JSON.parse(JSON.stringify(transformedData)));
//     } else {
//       console.log("[useProjectTasksAndSections] transformedData is null/undefined inside useMemo.");
//     }

//     const tempSections: SectionUI[] = [];
//     if (transformedData) {
//       transformedData.sections.forEach(sec => {
//         tempSections.push({
//           id: sec.id,
//           title: sec.name,
//           tasks: sec.tasks.map(task => ({
//             id: task.id,
//             title: task.title,
//             assignee: task.assignee, // This comes directly from GraphQL, ensure it's stable
//             due: task.dueDate || null,
//             priority: mapPriorityToUI(task.priority),
//             points: task.points,
//             completed: task.status === 'DONE',
//             description: task.description,
//           })),
//           editing: false, // Client-side state, always reset on re-memo
//         });
//       });
//     }
//     console.log("[useProjectTasksAndSections] useMemo produced sections (length:", tempSections.length, ")");
//     return tempSections;
//   }, [transformedData]); // Dependency is transformedData


//   // --- Functions to expose for mutations ---
//   const createSection = useCallback(async (name: string, order?: number | null) => {
//     console.log("[useProjectTasksAndSections] createSection called with name:", name);
//     try {
//       const response = await createProjectSectionMutation({
//         variables: {
//           projectId: projectId,
//           name,
//           order: order ?? null,
//         },
//       });
//       console.log("[useProjectTasksAndSections] createProjectSectionMutation response:", response.data?.createProjectSection);
//       return response.data?.createProjectSection;
//     } catch (err: any) {
//       console.error("[useProjectTasksAndSections] Error creating section:", err);
//       throw err;
//     }
//   }, [projectId, createProjectSectionMutation]);


//   const updateSection = useCallback(async (id: string, name?: string | null, order?: number | null) => {
//     console.log("[useProjectTasksAndSections] updateSection called with id:", id, "name:", name, "order:", order);
//     try {
//       const response = await updateProjectSectionMutation({
//         variables: {
//           id,
//           name: name ?? null,
//           order: order ?? null,
//         },
//       });
//       console.log("[useProjectTasksAndSections] updateProjectSectionMutation response:", response.data?.updateSection);
//       return response.data?.updateSection;
//     } catch (err: any) {
//       console.error("[useProjectTasksAndSections] Error updating section:", err);
//       throw err;
//     }
//   }, [updateProjectSectionMutation]);

//   const deleteSection = useCallback(async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
//     console.log("[useProjectTasksAndSections] deleteSection called with id:", id, "options:", options);
//     try {
//       const response = await deleteProjectSectionMutation({
//         variables: {
//           id,
//           options,
//         },
//       });
//       console.log("[useProjectTasksAndSections] deleteProjectSectionMutation response:", response.data?.deleteProjectSection);
//       return response.data?.deleteProjectSection;
//     } catch (err: any) {
//       console.error("[useProjectTasksAndSections] Error deleting section:", err);
//       throw err;
//     }
//   }, [deleteProjectSectionMutation]);
//   // -----------------------------------------


//   return {
//     sprintFilterOptions: transformedData?.sprints || [],
//     sections: sections, // This is `fetchedSections` in ListView
//     loading,
//     error,
//     refetchProjectTasksAndSections: refetch,
//     createSection,
//     updateSection,
//     deleteSection,
//   };
// }







// hooks/useProjectTasksAndSections.ts
import { useQuery, useMutation } from "@apollo/client";
import { useCallback, useMemo } from "react";
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections";
import { CREATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/createProjectSection";
import { UPDATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/updateProjectSection";
import { DELETE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/deleteProjectSection";
// Task mutations are now handled by useProjectTaskMutations, so no direct imports here
// import { CREATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/createProjectTask";
// import { UPDATE_PROJECT_TASK_MUTATION } from "@/graphql/mutations/updateProjectTask";

import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";
import { TaskStatus, Priority } from "@prisma/client";

// --- Type Definitions for the hook's return ---
export type PriorityUI = "Low" | "Medium" | "High";
export type TaskStatusUI = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

export interface ProjectMemberFullDetails { // Re-defining for consistency
  id: string; // ProjectMember ID
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  user: UserAvatarPartial;
}

export interface TaskUI {
  id: string;
  title: string;
  assignee: UserAvatarPartial | null;
  due: string | null; // YYYY-MM-DD
  priority: PriorityUI;
  points: number;
  completed: boolean; // Derived from TaskStatusUI
  description?: string;
  status: TaskStatusUI; // Keep original status for backend updates
}

export interface SectionUI {
  id: string;
  title: string; // Mapped from 'name'
  tasks: TaskUI[];
  editing?: boolean; // Client-side state
}

export interface SprintFilterOption {
  id: string;
  name: string;
}

// Full response type for the main query
interface ProjectTasksAndSectionsResponse {
  getProjectTasksAndSections: {
    sprints: SprintFilterOption[];
    sections: Array<{
      id: string;
      name: string;
      tasks: Array<{
        id: string;
        title: string;
        description?: string;
        status: TaskStatusUI;
        priority: "LOW" | "MEDIUM" | "HIGH";
        dueDate?: string; // YYYY-MM-DD
        points: number;
        assignee: UserAvatarPartial | null;
      }>;
    }>;

    projectMembers: ProjectMemberFullDetails[]; // NOW REQUIRED in the query
  } | null;
}

// ... (existing mutation response/variables types for sections) ...

// Helper to convert Prisma Priority enum to UI string
const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
  switch (priority) {
    case "LOW": return "Low";
    case "MEDIUM": return "Medium";
    case "HIGH": return "High";
  }
};

const mapTaskStatusToUI = (status: TaskStatus): boolean => {
  return status === 'DONE';
};


export function useProjectTasksAndSections(projectId: string, sprintId?: string | null) {
  const { data, loading, error, refetch } = useQuery<ProjectTasksAndSectionsResponse>(GET_PROJECT_TASKS_AND_SECTIONS_QUERY, {
    variables: { projectId, sprintId },
    skip: !projectId,
    fetchPolicy: "network-only",
  });

  // --- Section Mutations ---
  const [createProjectSectionMutation] = useMutation<any, any>(CREATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: [
      GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      "GetProjectTasksAndSections"
    ],
  });

  const [updateProjectSectionMutation] = useMutation<any, any>(UPDATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: [
      GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      "GetProjectTasksAndSections"
    ],
  });

  const [deleteProjectSectionMutation] = useMutation<any, any>(DELETE_PROJECT_SECTION_MUTATION, {
    refetchQueries: [
      GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
      "GetProjectTasksAndSections"
    ],
  });
  // -------------------------

  const transformedData = data?.getProjectTasksAndSections;

  const sections: SectionUI[] = useMemo(() => {
    const tempSections: SectionUI[] = [];
    if (transformedData) {
      transformedData.sections.forEach(sec => {
        tempSections.push({
          id: sec.id,
          title: sec.name,
          tasks: sec.tasks.map(task => ({
            id: task.id,
            title: task.title,
            assignee: task.assignee,
            due: task.dueDate || null,
            priority: mapPriorityToUI(task.priority),
            points: task.points,
            completed: mapTaskStatusToUI(task.status),
            description: task.description,
            status: task.status,
          })),
          editing: false,
        });
      });


    }
    return tempSections;
  }, [transformedData]);

  // Expose project members from the query result
  const projectMembers: ProjectMemberFullDetails[] = useMemo(() => {
    return transformedData?.projectMembers || [];
  }, [transformedData]);


  // --- Functions to expose for section mutations ---
  const createSection = useCallback(async (name: string, order?: number | null) => {
    try {
      const response = await createProjectSectionMutation({
        variables: {
          projectId: projectId,
          name,
          order: order ?? null,
        },
      });
      return response.data?.createProjectSection;
    } catch (err: any) {
      console.error("Error creating section:", err);
      throw err;
    }
  }, [projectId, createProjectSectionMutation]);


  const updateSection = useCallback(async (id: string, name?: string | null, order?: number | null) => {
    try {
      const response = await updateProjectSectionMutation({
        variables: {
          id,
          name: name ?? null,
          order: order ?? null,
        },
      });
      return response.data?.updateSection;
    } catch (err: any) {
      console.error("Error updating section:", err);
      throw err;
    }
  }, [updateProjectSectionMutation]);

  const deleteSection = useCallback(async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
    try {
      const response = await deleteProjectSectionMutation({
        variables: {
          id,
          options,
        },
      });
      return response.data?.deleteProjectSection;
    } catch (err: any) {
      console.error("Error deleting section:", err);
      throw err;
    }
  }, [deleteProjectSectionMutation]);
  // -------------------------------------------------


  return {
    sprintFilterOptions: transformedData?.sprints || [],
    sections: sections,
    loading,
    error,
    refetchProjectTasksAndSections: refetch,
    createSection,
    updateSection,
    deleteSection,
    projectMembers, // Expose project members
  };
}
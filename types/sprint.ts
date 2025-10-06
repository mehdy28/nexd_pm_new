// types/sprint.ts

/**
 * Represents the status of a sprint.
 * Mirrors the GraphQL enum SprintStatus and Prisma enum SprintStatus.
 */
export enum SprintStatus {
    PLANNING = "PLANNING",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
  }
  
  /**
   * Represents a Sprint object as it would typically be returned from GraphQL,
   * often corresponding to the SprintDetails type in your schema.
   */
  export interface SprintDetailsFragment {
    id: string;
    name: string;
    description: string | null;
    startDate: string; // ISO Date string
    endDate: string;   // ISO Date string
    isCompleted: boolean;
    status: SprintStatus; // Using the exported enum
    tasks: Array<{
      id: string;
      title: string;
      status: string; // Assuming TaskStatus enum exists elsewhere or is a string
      priority: string; // Assuming Priority enum exists elsewhere or is a string
      dueDate: string | null;
      points: number | null;
      completionPercentage: number | null;
      completed: boolean;
      assignee: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
      } | null;
    }>;
    milestones: Array<{
      id: string;
      name: string;
      dueDate: string; // ISO Date string
      isCompleted: boolean;
    }>;
  }
  
  /**
   * Simplified Sprint type for UI display, if different from full details.
   * This might be used for lists where full task/milestone data isn't needed.
   */
  export interface SprintUi {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    isCompleted: boolean;
    status: SprintStatus;
  }
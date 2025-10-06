// types/project.ts

/**
 * Represents the status of a project.
 * Mirrors the GraphQL enum ProjectStatus and Prisma enum ProjectStatus.
 */
export enum ProjectStatus {
    PLANNING = "PLANNING",
    ACTIVE = "ACTIVE",
    ON_HOLD = "ON_HOLD",
    COMPLETED = "COMPLETED",
    ARCHIVED = "ARCHIVED",
    CANCELLED = "CANCELLED",
  }
  
  // You can add other project-related types here if needed,
  // e.g., ProjectDetailsFragment, ProjectMemberDetails, etc.,
  // if they are not already defined elsewhere and need to be shared.
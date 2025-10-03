// hooks/useProjectTasksAndSections.ts
// (This is an excerpt of the file, not the full file.
//  The UserAvatarPartial interface is defined here to be imported.)

// ... other imports and type definitions ...

/**
 * Represents a partial user object with only ID, name parts, and avatar,
 * suitable for displaying assignees or other user references where full details aren't needed.
 */
export interface UserAvatarPartial {
    id: string;
    firstName?: string | null; // Made nullable to align with Prisma's optional fields
    lastName?: string | null;  // Made nullable
    avatar?: string | null;    // Made nullable
    // Note: We might also add `email?: string;` if it's always available and useful for fallback display.
    // But based on your current UI usage, firstName/lastName/avatar are prioritized.
  }
  
  // ... rest of useProjectTasksAndSections.ts content ...
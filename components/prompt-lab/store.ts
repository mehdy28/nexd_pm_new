import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// NEW: Enums and types for PromptVariable
export enum PromptVariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  LIST_OF_STRINGS = 'LIST_OF_STRINGS',
  RICH_TEXT = 'RICH_TEXT',
  BOOLEAN = 'BOOLEAN',
}

// NEW: Type for the 'source' field in PromptVariable
// This will become more complex as more data sources and transformations are added
export type PromptVariableSource = {
  type: 'PROJECT_FIELD' | 'WORKSPACE_FIELD' | 'USER_FIELD' | 'TASKS_AGGREGATION' | 'SPRINT_FIELD' | 'DOCUMENT_FIELD' | 'SINGLE_TASK_FIELD' | 'MEMBER_LIST' | 'DATE_FUNCTION'; // Added DATE_FUNCTION for 'Today\'s Date' example, DOCUMENT_FIELD, SINGLE_TASK_FIELD
  entityId?: string; // e.g., if specific task or document. Can be 'current_sprint', 'latest' etc.
  field?: string; // e.g., 'name', 'description', 'dueDate'
  filter?: Record<string, any>; // e.g., { status: 'DONE', assigneeId: 'userId' }
  aggregation?: 'COUNT' | 'SUM_POINTS' | 'LIST_TITLES' | 'LIST_DESCRIPTIONS' | 'LIST_NAMES' | 'LIST_ASSIGNEES_NAMES' | 'LAST_CREATED_FIELD_VALUE' | 'JOIN_BY_NEWLINE'; // How to process/aggregate data
  format?: 'BULLET_POINTS' | 'COMMA_SEPARATED' | 'PLAIN_TEXT' | 'JSON_ARRAY'; // how lists are returned for display/prompt injection
  // ... other properties as needed for complex queries
};


export type PromptVariable = {
  id: string; // Client-side generated ID for embedded objects (or from DB)
  name: string;
  placeholder: string; // e.g., {{project_name}}
  defaultValue?: string;
  description?: string;
  type: PromptVariableType; // NEW: Type of data this variable represents
  source?: PromptVariableSource | null; // NEW: How this variable's value is derived from project data
};

// NEW: ContentBlock type to match the new content structure
export interface ContentBlock {
  id: string; // Unique ID for the block (client-generated for editor, or from DB)
  type: 'text' | 'variable';
  value: string; // Content for 'text' blocks
  varId?: string; // ID of the variable from Prompt.variables for 'variable' blocks
  placeholder?: string; // Placeholder string like {{my_var}} for 'variable' blocks
  name?: string; // Display name of the variable for 'variable' blocks
}

export type Version = {
  id: string;
  content: ContentBlock[]; // CHANGED: From string to ContentBlock[]
  context: string;
  notes?: string;
  createdAt: string; // CHANGED: From number to string (ISO date string)
  variables: PromptVariable[]; // Added variables to version as well
};

export type Prompt = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  model: string; // e.g., gpt-4o
  content: ContentBlock[]; // CHANGED: From string to ContentBlock[]
  context: string;
  createdAt: string; // CHANGED: From number to string (ISO date string)
  updatedAt: string; // CHANGED: From number to string (ISO date string)
  versions: Version[];
  variables: PromptVariable[];
};

// Helper to generate a client-side CUID for embedded JSON objects (variables, versions)
function cuid(prefix: string = ''): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix + 'c';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface PromptLabState {
  prompts: Prompt[];
  projectId?: string; // Add projectId to state for context
  create: (projectId?: string) => Prompt; // Adjusted to accept projectId
  update: (id: string, patch: Partial<Prompt>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Prompt;
  snapshot: (id: string, notes?: string) => void;
  restore: (promptId: string, versionId: string) => void;
  // loadPrompts: (projectId?: string) => void; // Potential future action to load from backend
}

const usePromptLabStore = create<PromptLabState>()(
  persist(
    (set, get) => ({
      prompts: [],
      projectId: undefined,

      create: (projectId?: string) => { // Adjusted to accept projectId
        const now = new Date().toISOString(); // Use ISO date string
        const newPrompt: Prompt = {
          id: cuid('p-'), // Use cuid
          title: 'Untitled Prompt',
          description: '',
          category: '',
          tags: [],
          isPublic: false,
          model: 'gpt-4o',
          content: [], // CHANGED: Default to empty array
          context: '',
          createdAt: now,
          updatedAt: now,
          versions: [],
          variables: [],
          // projectId: projectId // No longer storing projectId here, handled by usePrompts hook/GraphQL
        };
        set((state) => ({ prompts: [...state.prompts, newPrompt] }));
        return newPrompt;
      },

      update: (id, patch) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p // Use ISO date string
          ),
        }));
      },

      remove: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        }));
      },

      duplicate: (id) => {
        const original = get().prompts.find((p) => p.id === id);
        if (!original) throw new Error('Prompt not found');
        const now = new Date().toISOString(); // Use ISO date string
        const duplicated: Prompt = {
          ...original,
          id: cuid('p-dup-'), // Use cuid for duplicate
          title: `${original.title} (Copy)`,
          createdAt: now,
          updatedAt: now,
          versions: original.versions.map(v => ({...v, id: cuid('v-dup-'), createdAt: now})), // Duplicate versions with new IDs and updated createdAt
          variables: original.variables.map(v => ({...v, id: cuid('var-dup-')})), // Duplicate variables with new IDs
        };
        set((state) => ({ prompts: [...state.prompts, duplicated] }));
        return duplicated;
      },

      snapshot: (id, notes = `Version saved at ${new Date().toLocaleString()}`) => {
        set((state) => ({
          prompts: state.prompts.map((p) => {
            if (p.id === id) {
              const now = new Date().toISOString(); // Use ISO date string
              const newVersion: Version = {
                id: cuid('v-'), // Use cuid
                content: p.content, // CHANGED: Content is already ContentBlock[]
                context: p.context,
                notes,
                createdAt: now,
                variables: p.variables.map(v => ({...v, id: v.id || cuid('snap-var-')})) // Snapshot variables as well
              };
              return {
                ...p,
                versions: [newVersion, ...p.versions], // Add new version to the top
                updatedAt: now,
              };
            }
            return p;
          }),
        }));
      },

      restore: (promptId, versionId) => {
        set((state) => ({
          prompts: state.prompts.map((p) => {
            if (p.id === promptId) {
              const versionToRestore = p.versions.find((v) => v.id === versionId);
              if (versionToRestore) {
                return {
                  ...p,
                  content: versionToRestore.content, // CHANGED: Content is already ContentBlock[]
                  context: versionToRestore.context,
                  variables: versionToRestore.variables, // Restore variables from version
                  updatedAt: new Date().toISOString(), // Use ISO date string
                  // Optionally, you might create a new version after restore indicating it was a restore operation
                  // versions: [{ id: cuid('v-restored-'), content: versionToRestore.content, context: versionToRestore.context, notes: `Restored from ${versionToRestore.notes}`, createdAt: new Date().toISOString(), variables: versionToRestore.variables }, ...p.versions]
                };
              }
            }
            return p;
          }),
        }));
      },
    }),
    {
      name: 'prompt-lab-storage', // name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // use localStorage for persistence
    }
  )
);

// Custom hook to filter prompts by projectId
// NOTE: This usePromptLab hook is effectively superseded by the one in hooks/usePrompts.ts
// The `projectId` logic for filtering/fetching should primarily live in hooks/usePrompts.ts (which interacts with GraphQL)
// This Zustand store version is typically for disconnected/local-first state management.
export function usePromptLab(projectId?: string) {
    const store = usePromptLabStore();
    
    // For local storage, if you want to filter prompts by a projectId stored in the Zustand state itself
    // Or if this store is meant for globally available, non-project-specific prompts.
    // Given the `hooks/usePrompts.ts` exists, this `usePromptLab` hook might be redundant
    // or serve a different purpose (e.g., local state for a specific part of the app).
    const filteredPrompts = projectId
        ? store.prompts.filter(p => p.projectId === projectId) // If `projectId` was stored on the Prompt object
        : store.prompts; // Or, if `projectId` is undefined, return all prompts or personal prompts.

    return {
        ...store,
        prompts: filteredPrompts,
    };
}
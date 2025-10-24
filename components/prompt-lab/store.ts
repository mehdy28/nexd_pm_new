// components/prompt-lab/store.ts
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

// NEW: Refined PromptVariableSource to be more generic and Power BI-like
export type PromptVariableSource = {
  entityType: 'PROJECT' | 'TASK' | 'SPRINT' | 'DOCUMENT' | 'MEMBER' | 'WORKSPACE' | 'USER' | 'DATE_FUNCTION'; // The base entity type
  
  field?: string; // The specific field to extract (e.g., 'name', 'title', 'dueDate', 'content', 'email')
                 // For DATE_FUNCTION, this might be 'today'

  // Filter conditions, applicable to TASKS, SPRINTS, DOCUMENTS, MEMBERS
  filter?: {
    // Generic filter for a field. Example: { field: 'status', operator: 'EQ', value: 'DONE' }
    // More complex filters (AND/OR, nested) can be added later
    field?: string; // The field to filter by (e.g., 'status', 'isCompleted', 'assigneeId', 'role')
    operator?: 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'IN_LIST'; // Comparison operator
    value?: string | number | boolean | string[]; // The value to compare against
    specialValue?: 'CURRENT_USER_ID' | 'CURRENT_PROJECT_ID' | 'ACTIVE_SPRINT_ID' | 'LATEST_UPDATED_ENTITY_ID'; // Placeholder for dynamic values (e.g., entityId for SINGLE_TASK_FIELD)
  };

  // Aggregation, applicable if `entityType` can return multiple records (e.g., TASKS, MEMBERS, DOCUMENTS)
  aggregation?: 'COUNT' | 'SUM' | 'AVERAGE' | 'LIST_FIELD_VALUES' | 'LAST_UPDATED_FIELD_VALUE' | 'FIRST_CREATED_FIELD_VALUE' | 'MOST_COMMON_FIELD_VALUE'; 
  
  // What field to aggregate if aggregation is LIST_FIELD_VALUES, SUM, AVERAGE, etc.
  aggregationField?: string; // e.g., 'title' for LIST_FIELD_VALUES, 'points' for SUM/AVERAGE

  // Format for aggregated lists
  format?: 'BULLET_POINTS' | 'COMMA_SEPARATED' | 'PLAIN_TEXT' | 'JSON_ARRAY'; 
};


export type PromptVariable = {
  id: string;
  name: string;
  placeholder: string; // e.g., {{project_name}}
  defaultValue?: string;
  description?: string;
  type: PromptVariableType; // NEW: Type of data this variable represents
  source?: PromptVariableSource | null; // NEW: How this variable's value is derived from project data
};

export type Version = {
  id: string;
  content: string;
  context: string;
  notes?: string;
  createdAt: number;
};

export type Prompt = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  model: string; // e.g., gpt-4o
  content: string;
  context: string;
  createdAt: number;
  updatedAt: number;
  versions: Version[];
  variables: PromptVariable[];
  projectId?: string; // Added for clarity
};

interface PromptLabState {
  prompts: Prompt[];
  projectId?: string; // Add projectId to state for context
  create: () => Prompt;
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

      create: () => {
        const newPrompt: Prompt = {
          id: Math.random().toString(36).slice(2),
          title: 'Untitled Prompt',
          description: '',
          category: '',
          tags: [],
          isPublic: false,
          model: 'gpt-4o',
          content: '',
          context: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          versions: [],
          variables: [],
        };
        set((state) => ({ prompts: [...state.prompts, newPrompt] }));
        return newPrompt;
      },

      update: (id, patch) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
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
        const duplicated: Prompt = {
          ...original,
          id: Math.random().toString(36).slice(2),
          title: `${original.title} (Copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          versions: original.versions.map(v => ({...v, id: Math.random().toString(36).slice(2)})), // Duplicate versions with new IDs
          variables: original.variables.map(v => ({...v, id: Math.random().toString(36).slice(2)})), // Duplicate variables with new IDs
        };
        set((state) => ({ prompts: [...state.prompts, duplicated] }));
        return duplicated;
      },

      snapshot: (id, notes = `Version saved at ${new Date().toLocaleString()}`) => {
        set((state) => ({
          prompts: state.prompts.map((p) => {
            if (p.id === id) {
              const newVersion: Version = {
                id: Math.random().toString(36).slice(2),
                content: p.content,
                context: p.context,
                notes,
                createdAt: Date.now(),
              };
              return {
                ...p,
                versions: [newVersion, ...p.versions], // Add new version to the top
                updatedAt: Date.now(),
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
                  content: versionToRestore.content,
                  context: versionToRestore.context,
                  updatedAt: Date.now(),
                  // Optionally, you might create a new version after restore indicating it was a restore operation
                  // versions: [{ id: uid(), content: versionToRestore.content, context: versionToRestore.context, notes: `Restored from ${versionToRestore.notes}`, createdAt: Date.now() }, ...p.versions]
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
export function usePromptLab(projectId?: string) {
    const store = usePromptLabStore();
    const prompts = projectId
        ? store.prompts // In a real app, this would be filtered by `projectId`
        : store.prompts; // For now, returns all or you can implement a default 'personal' filter

    return {
        ...store,
        prompts,
    };
}
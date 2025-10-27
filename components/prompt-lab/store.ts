// components/prompt-lab/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// NEW: Enums and types for PromptVariable
export enum PromptVariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN', // Explicitly added BOOLEAN here, was in schema but not this enum
  DATE = 'DATE',
  RICH_TEXT = 'RICH_TEXT',
  LIST_OF_STRINGS = 'LIST_OF_STRINGS',
}

// NEW: Aggregation types
export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  LIST_FIELD_VALUES = 'LIST_FIELD_VALUES',
  LAST_UPDATED_FIELD_VALUE = 'LAST_UPDATED_FIELD_VALUE',
  FIRST_CREATED_FIELD_VALUE = 'FIRST_CREATED_FIELD_VALUE', // Added based on your previous schema
  MOST_COMMON_FIELD_VALUE = 'MOST_COMMON_FIELD_VALUE', // Added based on your previous schema
}

// NEW: Format types
export enum FormatType {
  BULLET_POINTS = 'BULLET_POINTS',
  COMMA_SEPARATED = 'COMMA_SEPARATED',
  PLAIN_TEXT = 'PLAIN_TEXT',
  JSON_ARRAY = 'JSON_ARRAY', // Added based on your previous schema
}

// NEW: Filter Operators
export enum FilterOperator {
    EQ = 'EQ', // Equals
    NEQ = 'NEQ', // Not Equals
    GT = 'GT', // Greater Than
    GTE = 'GTE', // Greater Than or Equal To
    LT = 'LT', // Less Than
    LTE = 'LTE', // Less Than or Equal To
    CONTAINS = 'CONTAINS', // String contains (case-insensitive)
    STARTS_WITH = 'STARTS_WITH', // String starts with (case-insensitive)
    ENDS_WITH = 'ENDS_WITH', // String ends with (case-insensitive)
    IN = 'IN', // Value is in a list of values (e.g., status IN ['TODO', 'IN_PROGRESS'])
    NOT_IN = 'NOT_IN', // Value is not in a list of values
    // Special operators that hint at backend-resolved values
    SPECIAL_CURRENT_USER = 'SPECIAL_CURRENT_USER', // Represents context.user.id
    SPECIAL_ACTIVE_SPRINT = 'SPECIAL_ACTIVE_SPRINT', // Represents an active sprint (e.g., status='ACTIVE' and current date falls within range)
}

// Defines a single filter condition
export interface FilterCondition {
    field: string; // The field to filter on, e.g., 'status', 'assigneeId'
    operator: FilterOperator;
    value?: string | number | boolean | string[] | number[]; // The value to compare against (if not specialValue)
    type?: PromptVariableType; // Hint for type conversion in frontend/backend
}

// NEW: Refined PromptVariableSource to be more generic and Power BI-like
export interface PromptVariableSource { // Changed from type to interface for consistency with class-like structure of other types
  entityType: 'PROJECT' | 'TASK' | 'SPRINT' | 'DOCUMENT' | 'MEMBER' | 'WORKSPACE' | 'USER' | 'DATE_FUNCTION'; // The base entity type
  
  field?: string; // The specific field to extract (e.g., 'name', 'title', 'dueDate', 'content', 'email')
                 // For DATE_FUNCTION, this might be 'today'

  filters?: FilterCondition[]; // CHANGED: Array of filter conditions for more flexibility

  // Aggregation, applicable if `entityType` can return multiple records (e.g., TASKS, MEMBERS, DOCUMENTS)
  aggregation?: AggregationType; 
  
  // What field to aggregate if aggregation is LIST_FIELD_VALUES, SUM, AVERAGE, etc.
  aggregationField?: string; // e.g., 'title' for LIST_FIELD_VALUES, 'points' for SUM/AVERAGE

  // Format for aggregated lists
  format?: FormatType; 
}


export type PromptVariable = {
  id: string;
  name: string;
  placeholder: string; // e.g., {{project_name}}
  defaultValue?: string;
  description?: string;
  type: PromptVariableType; // NEW: Type of data this variable represents
  source?: PromptVariableSource | null; // NEW: How this variable's value is derived from project data
};

// UPDATED: Type for content blocks to include __typename
export type Block =
  | { type: 'text'; id: string; value: string; __typename: 'ContentBlock' }
  | { type: 'variable'; id: string; varId: string; placeholder: string; name: string; __typename: 'ContentBlock' }

export type Version = {
  id: string;
  content: Block[]; // CHANGED: From string to Block[]
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
  content: Block[]; // CHANGED: From string to Block[]
  context: string;
  createdAt: number;
  updatedAt: number;
  versions: Version[];
  variables: PromptVariable[];
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
          content: [], // Changed to empty array
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
              // Ensure that `p.content` blocks also carry `__typename` for new versions
              const contentWithTypename: Block[] = p.content.map(block => ({ ...block, __typename: 'ContentBlock' }));
              const newVersion: Version = {
                id: Math.random().toString(36).slice(2),
                content: contentWithTypename, // Now copies Block[]
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
                // Ensure restored content blocks also have __typename if they didn't before
                const restoredContentWithTypename: Block[] = versionToRestore.content.map(block => ({ ...block, __typename: 'ContentBlock' }));
                return {
                  ...p,
                  content: restoredContentWithTypename, // Now copies Block[]
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
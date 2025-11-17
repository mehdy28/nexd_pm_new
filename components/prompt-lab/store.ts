// components/prompt-lab/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// NEW: Enums and types for PromptVariable
export enum PromptVariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  RICH_TEXT = 'RICH_TEXT',
  LIST_OF_STRINGS = 'LIST_OF_STRINGS',
  // Added from previous iteration to ensure consistency if used elsewhere
  SELECT = "SELECT",
  DYNAMIC = "DYNAMIC",
}

// NEW: Aggregation types
export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  LIST_FIELD_VALUES = 'LIST_FIELD_VALUES',
  LAST_UPDATED_FIELD_VALUE = 'LAST_UPDATED_FIELD_VALUE',
  FIRST_CREATED_FIELD_VALUE = 'FIRST_CREATED_FIELD_VALUE',
  MOST_COMMON_FIELD_VALUE = 'MOST_COMMON_FIELD_VALUE',
}

// NEW: Format types
export enum FormatType {
  BULLET_POINTS = 'BULLET_POINTS',
  COMMA_SEPARATED = 'COMMA_SEPARATED',
  PLAIN_TEXT = 'PLAIN_TEXT',
  JSON_ARRAY = 'JSON_ARRAY',
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
    IN_LIST = 'IN_LIST', // Changed from IN to IN_LIST for consistency with resolvers
    NOT_IN = 'NOT_IN', // Value is not in a list of values
    // Special operators that hint at backend-resolved values (often used as direct values in the resolver logic, not as part of the operator)
    // Removed these from FilterOperator as they are more 'value' modifiers than operators
}

// Defines a single filter condition
export interface FilterCondition {
    field: string; // The field to filter on, e.g., 'status', 'assigneeId'
    operator: FilterOperator;
    value?: string | number | boolean | (string | number | boolean)[]; // The value to compare against (if not specialValue)
    specialValue?: 'CURRENT_USER_ID' | 'CURRENT_PROJECT_ID' | 'ACTIVE_SPRINT' | null; // Re-added specialValue for consistency with buildPrismaWhereClause
    type?: PromptVariableType; // Hint for type conversion in frontend/backend
}

// NEW: Refined PromptVariableSource to be more generic and Power BI-like
export interface PromptVariableSource { // Changed from type to interface for consistency with class-like structure of other types
  entityType: 'PROJECT' | 'TASK' | 'SPRINT' | 'DOCUMENT' | 'MEMBER' | 'WORKSPACE' | 'USER' | 'DATE_FUNCTION'; // The base entity type

  field?: string; // The specific field to extract (e.g., 'name', 'title', 'dueDate', 'content', 'email')
                 // For DATE_FUNCTION, this might be 'today'

  filter?: FilterCondition; // CHANGED: Reverted to single filter condition for consistency with current buildPrismaWhereClause.
                           // If you need an array of filters, the buildPrismaWhereClause would need to be updated as well.
                           // filters?: FilterCondition[]; // If multiple filters are needed, use this.

  // Aggregation, applicable if `entityType` can return multiple records (e.g., TASKS, MEMBERS, DOCUMENTS)
  aggregation?: AggregationType | null; // Made nullable for consistency
  
  // What field to aggregate if aggregation is LIST_FIELD_VALUES, SUM, AVERAGE, etc.
  aggregationField?: string; // e.g., 'title' for LIST_FIELD_VALUES, 'points' for SUM/AVERAGE

  // Format for aggregated lists
  format?: FormatType | null; // Made nullable for consistency
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
  | { type: 'text'; id: string; value: string; __typename?: 'ContentBlock' } // Made __typename optional as it's often stripped or added on the fly
  | { type: 'variable'; id: string; varId: string; placeholder: string; name: string; __typename?: 'ContentBlock' } // Made __typename optional

// Adjusted Version type to include `description` and use Block[]
export type Version = {
  id: string;
  content: Block[];
  context: string;
  notes: string; // Made non-optional as per promptResolver (defaulted)
  description: string; // Added description
  createdAt: string; // Changed from number to string (ISO date string) for consistency with backend
  variables: PromptVariable[]; // Added variables for completeness
};

// Updated Prompt type to match backend queries and current needs
export type Prompt = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  model: string; // e.g., gpt-4o
  content: Block[]; // Changed from string to Block[]
  context: string;
  createdAt: string; // Changed from number to string (ISO date string) for consistency with backend
  updatedAt: string; // Changed from number to string (ISO date string) for consistency with backend
  projectId?: string;
  aiEnhancedContent?: string;
  user?: { // Added user for completeness based on GET_PROMPT_DETAILS_QUERY
    id: string;
    firstName?: string;
    lastName?: string;
    __typename?: string;
  };
  project?: { // Added project for completeness based on GET_PROMPT_DETAILS_QUERY
    id: string;
    name: string;
    workspaceId: string;
    __typename?: string;
  };
  versions: Version[];
  variables: PromptVariable[];
};

interface PromptLabState {
  prompts: Prompt[];
  projectId?: string; // Add projectId to state for context
  create: (projectId?: string) => Prompt; // Updated signature to accept projectId
  update: (id: string, patch: Partial<Prompt>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Prompt;
  snapshot: (id: string, notes?: string) => void;
  restore: (promptId: string, versionId: string) => void;
  // loadPrompts: (projectId?: string) => void; // This is now handled by usePromptsList hook
}

const usePromptLabStore = create<PromptLabState>()(
  persist(
    (set, get) => ({
      prompts: [],
      projectId: undefined, // This projectId is for the Zustand store's context, not necessarily the current project being viewed.

      create: (projectId?: string) => { // Updated to accept projectId
        const now = new Date().toISOString();
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
          createdAt: now,
          updatedAt: now,
          versions: [],
          variables: [],
          projectId: projectId, // Set projectId if provided
        };
        set((state) => ({ prompts: [...state.prompts, newPrompt] }));
        return newPrompt;
      },

      update: (id, patch) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
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
        const now = new Date().toISOString();
        const duplicated: Prompt = {
          ...original,
          id: Math.random().toString(36).slice(2),
          title: `${original.title} (Copy)`,
          createdAt: now,
          updatedAt: now,
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
              const now = new Date().toISOString();
              // Ensure that `p.content` blocks also carry `__typename` for new versions (optional here, but good practice if needed)
              const contentWithTypename: Block[] = p.content.map(block => ({ ...block, __typename: block.__typename || 'ContentBlock' }));
              const newVersion: Version = {
                id: Math.random().toString(36).slice(2),
                content: contentWithTypename,
                context: p.context,
                notes,
                description: '', // Default description for new snapshot
                createdAt: now,
                variables: p.variables.map(v => ({...v})) // Deep copy variables for the version
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
                const now = new Date().toISOString();
                // Ensure restored content blocks also have __typename if they didn't before
                const restoredContentWithTypename: Block[] = versionToRestore.content.map(block => ({ ...block, __typename: block.__typename || 'ContentBlock' }));
                return {
                  ...p,
                  content: restoredContentWithTypename,
                  context: versionToRestore.context,
                  variables: versionToRestore.variables.map(v => ({...v})), // Restore variables too
                  updatedAt: now,
                  // Optionally, you might create a new version after restore indicating it was a restore operation
                  // versions: [{ id: uid(), content: versionToRestore.content, context: versionToRestore.context, notes: `Restored from ${versionToRestore.notes}`, createdAt: now, description: '' }, ...p.versions]
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
// NOTE: This usePromptLab hook is now primarily for client-side Zustand store interactions.
// The actual prompt list fetching from the backend is handled by usePromptsList.
export function usePromptLab(projectId?: string) {
    const store = usePromptLabStore();
    // In a real app, if Zustand was your primary data source for list, you'd filter here:
    // const prompts = useMemo(() => {
    //   return projectId
    //     ? store.prompts.filter(p => p.projectId === projectId)
    //     : store.prompts.filter(p => !p.projectId); // Or some default personal prompts
    // }, [store.prompts, projectId]);

    // As per the PromptLabContainer, usePromptsList is the source of truth for the list.
    // This hook is now somewhat redundant for the prompt *list*, but kept as it was in your original file.
    // If you plan to use this Zustand store for other things (e.g., local drafts before saving to DB),
    // it can remain. Otherwise, consider removing it or redefining its purpose.
    return {
        ...store,
        // prompts: prompts, // Removed this as usePromptsList is the source of truth for the rendered list
        prompts: store.prompts // Retaining store's prompts, but it's not the source for the UI list now.
    };
}
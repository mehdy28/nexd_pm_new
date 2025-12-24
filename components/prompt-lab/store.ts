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
  NUMBERED_LIST = 'NUMBERED_LIST',
  PLAIN_TEXT = 'PLAIN_TEXT',
  JSON_ARRAY = 'JSON_ARRAY',
}

// NEW: Filter Operators
export enum FilterOperator {
    EQ = 'EQ',
    NEQ = 'NEQ',
    GT = 'GT',
    GTE = 'GTE',
    LT = 'LT',
    LTE = 'LTE',
    CONTAINS = 'CONTAINS',
    STARTS_WITH = 'STARTS_WITH',
    ENDS_WITH = 'ENDS_WITH',
    IN_LIST = 'IN_LIST',
    NOT_IN = 'NOT_IN',
}

// Special values that can be used in filters instead of a concrete value
export enum SpecialFilterValue {
    CURRENT_USER = 'CURRENT_USER',
    ACTIVE_SPRINT = 'ACTIVE_SPRINT',
    NOW = "NOW",
    TODAY = "TODAY",
}

// Defines a single filter condition
export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value?: string | number | boolean | (string | number | boolean)[];
    specialValue?: SpecialFilterValue | null;
    type?: PromptVariableType;
}

// NEW: Refined PromptVariableSource
export interface PromptVariableSource {
  entityType: 'PROJECT' | 'TASK' | 'SPRINT' | 'DOCUMENT' | 'MEMBER' | 'WORKSPACE' | 'USER' | 'DATE_FUNCTION';
  field?: string;
  filters?: FilterCondition[]; // UPDATED: Changed to an array to support multiple filters
  aggregation?: AggregationType | null;
  aggregationField?: string;

  format?: FormatType | null;
}


export type PromptVariable = {
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  description?: string;
  type?: PromptVariableType;
  source?: PromptVariableSource | null;
};

export type Block =
  | { type: 'text'; id: string; value?: string; __typename?: 'ContentBlock' }
  | { type: 'variable'; id: string; varId?: string; placeholder?: string; name?: string; __typename?: 'ContentBlock' }

export type Version = {
  id?: string;
  content?: Block[];
  context?: string;
  notes?: string;
  description?: string;
  createdAt?: string;
  variables?: PromptVariable[];
};

export type Prompt = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  model?: string;
  content: Block[];
  context: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  aiEnhancedContent?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    __typename?: string;
  };
  project?: {
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
  projectId?: string;
  create: (projectId?: string) => Prompt;
  update: (id: string, patch: Partial<Prompt>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Prompt;
  snapshot: (id: string, notes?: string) => void;
  restore: (promptId: string, versionId: string) => void;
}

const usePromptLabStore = create<PromptLabState>()(
  persist(
    (set, get) => ({
      prompts: [],
      projectId: undefined,

      create: (projectId?: string) => {
        const now = new Date().toISOString();
        const newPrompt: Prompt = {
          id: Math.random().toString(36).slice(2),
          title: 'Untitled Prompt',
          description: '',
          category: '',
          tags: [],
          isPublic: false,
          content: [],
          context: '',
          createdAt: now,
          updatedAt: now,
          versions: [],
          variables: [],
          projectId: projectId,
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
          versions: original.versions.map(v => ({...v, id: Math.random().toString(36).slice(2)})),
          variables: original.variables.map(v => ({...v, id: Math.random().toString(36).slice(2)})),
        };
        set((state) => ({ prompts: [...state.prompts, duplicated] }));
        return duplicated;
      },

      snapshot: (id, notes = `Version saved at ${new Date().toLocaleString()}`) => {
        set((state) => ({
          prompts: state.prompts.map((p) => {
            if (p.id === id) {
              const now = new Date().toISOString();
              const contentWithTypename: Block[] = p.content.map(block => ({ ...block, __typename: block.__typename || 'ContentBlock' }));
              const newVersion: Version = {
                id: Math.random().toString(36).slice(2),
                content: contentWithTypename,
                context: p.context,
                notes,
                description: '',
                createdAt: now,
                variables: p.variables.map(v => ({...v}))
              };
              return {
                ...p,
                versions: [newVersion, ...p.versions],
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
                const restoredContentWithTypename: Block[] = versionToRestore.content?.map(block => ({ ...block, __typename: block.__typename || 'ContentBlock' })) || [];
                return {
                  ...p,
                  content: restoredContentWithTypename,
                  context: versionToRestore.context || '',
                  variables: versionToRestore.variables?.map(v => ({...v})) || [],
                  updatedAt: now,
                };
              }
            }
            return p;
          }),
        }));
      },
    }),
    {
      name: 'prompt-lab-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
export function usePromptLab(projectId?: string) {
    const store = usePromptLabStore();
    return {
        ...store,
        prompts: store.prompts
    };
}
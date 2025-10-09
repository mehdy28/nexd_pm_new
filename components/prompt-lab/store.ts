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
  type: 'PROJECT_FIELD' | 'WORKSPACE_FIELD' | 'USER_FIELD' | 'TASKS_AGGREGATION' | 'SPRINT_FIELD' | 'DOCUMENT_CONTENT' | 'MEMBER_LIST' | 'DATE_FUNCTION'; // Added DATE_FUNCTION for 'Today\'s Date' example
  entityId?: string; // e.g., if specific task or document. Can be 'current_sprint', 'latest' etc.
  field?: string; // e.g., 'name', 'description', 'dueDate'
  filter?: Record<string, any>; // e.g., { status: 'DONE', assigneeId: 'userId' }
  aggregation?: 'COUNT' | 'SUM_POINTS' | 'LIST_TITLES' | 'LIST_DESCRIPTIONS' | 'LIST_NAMES' | 'LIST_ASSIGNEES_NAMES' | 'LAST_CREATED_FIELD_VALUE' | 'JOIN_BY_NEWLINE'; // How to process/aggregate data
  format?: 'BULLET_POINTS' | 'COMMA_SEPARATED' | 'PLAIN_TEXT' | 'JSON_ARRAY'; // how lists are returned for display/prompt injection
  // ... other properties as needed for complex queries
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
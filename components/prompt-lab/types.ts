
// components/prompt-lab/types.ts

// --- TYPES (Mirroring GraphQL Schema) ---

export enum PromptVariableType {
    STRING = 'STRING',
    NUMBER = 'NUMBER',
    BOOLEAN = 'BOOLEAN',
    DATE = 'DATE',
    RICH_TEXT = 'RICH_TEXT',
    LIST_OF_STRINGS = 'LIST_OF_STRINGS',
  }
  
  export interface PromptVariableSource {
    type: string; // e.g., 'PROJECT_FIELD', 'TASKS_AGGREGATION', 'USER_FIELD', 'DATE_FUNCTION'
    field?: string; // e.g., 'name', 'title', 'today'
    entityId?: string; // e.g., 'current_sprint', 'latest', or a specific ID
    filter?: Record<string, any>; // e.g., { status: 'DONE', assigneeId: 'current_user' }
    aggregation?: string; // e.g., 'COUNT', 'LIST_TITLES', 'LIST_NAMES'
    format?: string; // e.g., 'BULLET_POINTS', 'COMMA_SEPARATED'
    // ... other dynamic properties based on the source type
  }
  
  export interface PromptVariable {
    id: string; // Client-side ID for local management (generated with cuid())
    name: string;
    placeholder: string; // e.g., '{{project_name}}'
    description?: string;
    type: PromptVariableType;
    defaultValue?: string;
    source?: PromptVariableSource; // JSON object for dynamic variables
  }
  
  export interface Version {
    id: string; // Client-side ID for local management (generated with cuid())
    content: string;
    context: string;
    variables: PromptVariable[];
    createdAt: string; // ISO date string
    notes?: string;
  }
  
  export interface Prompt {
    id: string;
    title: string;
    content: string;
    context: string;
    description?: string;
    category?: string;
    tags: string[];
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    model: string; // e.g., 'gpt-4o', 'grok-3'
    projectId?: string;
    userId?: string; // Used for personal prompts
    variables: PromptVariable[];
    versions: Version[];
    // Relations from Prisma (minimal, typically only IDs needed for client-side relations)
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
    project?: {
      id: string;
      name: string;
    };
  }
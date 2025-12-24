// components/prompt-lab/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// NEW: Enums and types for PromptVariable
export var PromptVariableType;
(function (PromptVariableType) {
    PromptVariableType["STRING"] = "STRING";
    PromptVariableType["NUMBER"] = "NUMBER";
    PromptVariableType["BOOLEAN"] = "BOOLEAN";
    PromptVariableType["DATE"] = "DATE";
    PromptVariableType["RICH_TEXT"] = "RICH_TEXT";
    PromptVariableType["LIST_OF_STRINGS"] = "LIST_OF_STRINGS";
    PromptVariableType["SELECT"] = "SELECT";
    PromptVariableType["DYNAMIC"] = "DYNAMIC";
})(PromptVariableType || (PromptVariableType = {}));
// NEW: Aggregation types
export var AggregationType;
(function (AggregationType) {
    AggregationType["COUNT"] = "COUNT";
    AggregationType["SUM"] = "SUM";
    AggregationType["AVERAGE"] = "AVERAGE";
    AggregationType["LIST_FIELD_VALUES"] = "LIST_FIELD_VALUES";
    AggregationType["LAST_UPDATED_FIELD_VALUE"] = "LAST_UPDATED_FIELD_VALUE";
    AggregationType["FIRST_CREATED_FIELD_VALUE"] = "FIRST_CREATED_FIELD_VALUE";
    AggregationType["MOST_COMMON_FIELD_VALUE"] = "MOST_COMMON_FIELD_VALUE";
})(AggregationType || (AggregationType = {}));
// NEW: Format types
export var FormatType;
(function (FormatType) {
    FormatType["BULLET_POINTS"] = "BULLET_POINTS";
    FormatType["COMMA_SEPARATED"] = "COMMA_SEPARATED";
    FormatType["NUMBERED_LIST"] = "NUMBERED_LIST";
    FormatType["PLAIN_TEXT"] = "PLAIN_TEXT";
    FormatType["JSON_ARRAY"] = "JSON_ARRAY";
})(FormatType || (FormatType = {}));
// NEW: Filter Operators
export var FilterOperator;
(function (FilterOperator) {
    FilterOperator["EQ"] = "EQ";
    FilterOperator["NEQ"] = "NEQ";
    FilterOperator["GT"] = "GT";
    FilterOperator["GTE"] = "GTE";
    FilterOperator["LT"] = "LT";
    FilterOperator["LTE"] = "LTE";
    FilterOperator["CONTAINS"] = "CONTAINS";
    FilterOperator["STARTS_WITH"] = "STARTS_WITH";
    FilterOperator["ENDS_WITH"] = "ENDS_WITH";
    FilterOperator["IN_LIST"] = "IN_LIST";
    FilterOperator["NOT_IN"] = "NOT_IN";
})(FilterOperator || (FilterOperator = {}));
// Special values that can be used in filters instead of a concrete value
export var SpecialFilterValue;
(function (SpecialFilterValue) {
    SpecialFilterValue["CURRENT_USER"] = "CURRENT_USER";
    SpecialFilterValue["ACTIVE_SPRINT"] = "ACTIVE_SPRINT";
    SpecialFilterValue["NOW"] = "NOW";
    SpecialFilterValue["TODAY"] = "TODAY";
})(SpecialFilterValue || (SpecialFilterValue = {}));
const usePromptLabStore = create()(persist((set, get) => ({
    prompts: [],
    projectId: undefined,
    create: (projectId) => {
        const now = new Date().toISOString();
        const newPrompt = {
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
            prompts: state.prompts.map((p) => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p),
        }));
    },
    remove: (id) => {
        set((state) => ({
            prompts: state.prompts.filter((p) => p.id !== id),
        }));
    },
    duplicate: (id) => {
        const original = get().prompts.find((p) => p.id === id);
        if (!original)
            throw new Error('Prompt not found');
        const now = new Date().toISOString();
        const duplicated = {
            ...original,
            id: Math.random().toString(36).slice(2),
            title: `${original.title} (Copy)`,
            createdAt: now,
            updatedAt: now,
            versions: original.versions.map(v => ({ ...v, id: Math.random().toString(36).slice(2) })),
            variables: original.variables.map(v => ({ ...v, id: Math.random().toString(36).slice(2) })),
        };
        set((state) => ({ prompts: [...state.prompts, duplicated] }));
        return duplicated;
    },
    snapshot: (id, notes = `Version saved at ${new Date().toLocaleString()}`) => {
        set((state) => ({
            prompts: state.prompts.map((p) => {
                if (p.id === id) {
                    const now = new Date().toISOString();
                    const contentWithTypename = p.content.map(block => ({ ...block, __typename: block.__typename || 'ContentBlock' }));
                    const newVersion = {
                        id: Math.random().toString(36).slice(2),
                        content: contentWithTypename,
                        context: p.context,
                        notes,
                        description: '',
                        createdAt: now,
                        variables: p.variables.map(v => ({ ...v }))
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
                        const restoredContentWithTypename = versionToRestore.content?.map(block => ({ ...block, __typename: block.__typename || 'ContentBlock' })) || [];
                        return {
                            ...p,
                            content: restoredContentWithTypename,
                            context: versionToRestore.context || '',
                            variables: versionToRestore.variables?.map(v => ({ ...v })) || [],
                            updatedAt: now,
                        };
                    }
                }
                return p;
            }),
        }));
    },
}), {
    name: 'prompt-lab-storage',
    storage: createJSONStorage(() => localStorage),
}));
export function usePromptLab(projectId) {
    const store = usePromptLabStore();
    return {
        ...store,
        prompts: store.prompts
    };
}

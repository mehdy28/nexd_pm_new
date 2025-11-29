// src/hooks/useEntityDefinitions.ts
import { useMemo, useCallback } from 'react';
import { 
  Briefcase, 
  ListChecks, 
  Calendar, 
  FileText, 
  Users, 
  User, 
  Clock 
} from 'lucide-react';
import { 
  PromptVariableType, 
  AggregationType, 
  FilterOperator, 
  SpecialFilterValue 
} from '@/components/prompt-lab/store'; 

export interface EntityFieldDef {
  value: string;
  label: string;
  type: PromptVariableType;
  description?: string;
}

export interface EntityAggregationDef {
  value: AggregationType;
  label: string;
  resultType: PromptVariableType;
  requiresField: boolean;
  description?: string;
}

export interface EntityFilterDef {
  field: string;
  label: string;
  type: PromptVariableType;
  operators: FilterOperator[];
  options?: string[]; // For static dropdowns like Status
  lookupEntity?: 'MEMBER' | 'SPRINT' | 'PROJECT'; // For dynamic lookups
  isItemPicker?: boolean; // NEW: Triggers the checkbox modal
}

export interface EntityDefinition {
  value: string;
  label: string;
  icon: any;
  fields: EntityFieldDef[];
  aggregations: EntityAggregationDef[];
  filters: EntityFilterDef[];
}

export function useEntityDefinitions() {
  
  const dataCategories = useMemo(() => [
    { value: 'PROJECT', label: 'Project', icon: Briefcase },
    { value: 'TASK', label: 'Tasks', icon: ListChecks },
    { value: 'SPRINT', label: 'Sprints', icon: Calendar },
    { value: 'DOCUMENT', label: 'Documents', icon: FileText },
    { value: 'MEMBER', label: 'Members', icon: Users },
    { value: 'USER', label: 'Current User', icon: User },
  ], []);

  const getEntityDefinition = useCallback((entityType: string): EntityDefinition => {
    
    // Default fallback
    const base = { 
        value: entityType, 
        label: dataCategories.find(c => c.value === entityType)?.label || 'Unknown', 
        icon: dataCategories.find(c => c.value === entityType)?.icon || Briefcase,
        fields: [], 
        aggregations: [], 
        filters: [] 
    };

    switch (entityType) {
      case 'PROJECT': 
        return {
          ...base,
          fields: [
            { value: 'name', label: 'Name', type: PromptVariableType.STRING },
            { value: 'description', label: 'Description', type: PromptVariableType.STRING },
            { value: 'status', label: 'Status', type: PromptVariableType.STRING },
          ],
          aggregations: [], 
          filters: []
        };

      case 'TASK': 
        return {
          ...base,
          fields: [
            { value: 'title', label: 'Task Title', type: PromptVariableType.STRING },
            { value: 'description', label: 'Description', type: PromptVariableType.STRING },
            { value: 'status', label: 'Status', type: PromptVariableType.STRING },
            { value: 'priority', label: 'Priority', type: PromptVariableType.STRING },
            { value: 'dueDate', label: 'Due Date', type: PromptVariableType.DATE },
            { value: 'points', label: 'Story Points', type: PromptVariableType.NUMBER },
          ],
          aggregations: [
            { value: AggregationType.COUNT, label: 'Count of Tasks', resultType: PromptVariableType.NUMBER, requiresField: false },
            { value: AggregationType.SUM, label: 'Sum of...', resultType: PromptVariableType.NUMBER, requiresField: true },
            { value: AggregationType.AVERAGE, label: 'Average of...', resultType: PromptVariableType.NUMBER, requiresField: true },
          ],
          filters: [
            // NEW: ID Filter for Picker
            { 
                field: 'id', 
                label: 'Specific Tasks', 
                type: PromptVariableType.LIST_OF_STRINGS, 
                operators: [FilterOperator.IN_LIST],
                isItemPicker: true
            },
            { 
              field: 'status', 
              label: 'Status', 
              type: PromptVariableType.STRING, 
              operators: [FilterOperator.EQ, FilterOperator.NEQ], 
              options: ['TODO', 'DONE', 'IN_PROGRESS'] 
            },
            { 
              field: 'priority', 
              label: 'Priority', 
              type: PromptVariableType.STRING, 
              operators: [FilterOperator.EQ, FilterOperator.NEQ], 
              options: ['LOW', 'MEDIUM', 'HIGH'] 
            },
            { 
              field: 'assigneeId', 
              label: 'Assignee', 
              type: PromptVariableType.STRING, 
              operators: [FilterOperator.EQ, FilterOperator.NEQ], 
              lookupEntity: 'MEMBER' 
            },
            { 
              field: 'sprintId', 
              label: 'Sprint', 
              type: PromptVariableType.STRING, 
              operators: [FilterOperator.EQ, FilterOperator.NEQ], 
              lookupEntity: 'SPRINT' 
            },
            { 
              field: 'points', 
              label: 'Story Points', 
              type: PromptVariableType.NUMBER, 
              operators: [FilterOperator.GT, FilterOperator.LT, FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE] 
            }
          ]
        };

      case 'SPRINT': 
        return {
          ...base,
          fields: [
            { value: 'name', label: 'Sprint Name', type: PromptVariableType.STRING },
           // { value: 'goal', label: 'Sprint Goal', type: PromptVariableType.STRING },
            { value: 'startDate', label: 'Start Date', type: PromptVariableType.DATE },
            { value: 'endDate', label: 'End Date', type: PromptVariableType.DATE },
          ],
          aggregations: [
             { value: AggregationType.COUNT, label: 'Count of Sprints', resultType: PromptVariableType.NUMBER, requiresField: false },
          ],
          filters: [
            { 
                field: 'status', 
                label: 'Status', 
                type: PromptVariableType.STRING, 
                operators: [FilterOperator.EQ],
                options: ['PLANNING', 'ACTIVE', 'COMPLETED']
            }
          ]
        };

      case 'DOCUMENT': 
        return {
          ...base,
          fields: [
            { value: 'title', label: 'Title', type: PromptVariableType.STRING },
            { value: 'content', label: 'Full Content', type: PromptVariableType.RICH_TEXT },
          ],
          aggregations: [
            { value: AggregationType.COUNT, label: 'Count of Docs', resultType: PromptVariableType.NUMBER, requiresField: false },
          ],
          filters: [
             // NEW: ID Filter for Picker
             { 
                field: 'id', 
                label: 'Specific Documents', 
                type: PromptVariableType.LIST_OF_STRINGS, 
                operators: [FilterOperator.IN_LIST],
                isItemPicker: true
            },
          ]
        };

      case 'MEMBER': 
        return {
          ...base,
          fields: [
            { value: 'user.firstName', label: 'First Name', type: PromptVariableType.STRING },
            { value: 'user.email', label: 'Email', type: PromptVariableType.STRING },
            { value: 'role', label: 'Role', type: PromptVariableType.STRING },
          ],
          aggregations: [
            { value: AggregationType.COUNT, label: 'Count of Members', resultType: PromptVariableType.NUMBER, requiresField: false },
          ],
          filters: [
             { 
                field: 'role', 
                label: 'Role', 
                type: PromptVariableType.STRING, 
                operators: [FilterOperator.EQ],
                options: ['ADMIN', 'MEMBER', 'VIEWER']
            }
          ]
        };

      case 'USER': 
        return {
            ...base,
            fields: [
                { value: 'email', label: 'My Email', type: PromptVariableType.STRING },
                { value: 'fullName', label: 'My Name', type: PromptVariableType.STRING },
                //{ value: 'id', label: 'My ID', type: PromptVariableType.STRING },
            ],
            aggregations: [],
            filters: []
        };

      default: 
        return base;
    }
  }, [dataCategories]);

  return { dataCategories, getEntityDefinition };
}
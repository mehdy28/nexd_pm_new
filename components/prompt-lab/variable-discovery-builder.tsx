// components/prompt-lab/variable-discovery-builder.tsx
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Check, ChevronsUpDown, ArrowLeft, Lightbulb, Keyboard, Database, ListChecks, Calendar, FileText, Users, Briefcase, Loader2, PlusCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptVariable, PromptVariableType, PromptVariableSource, AggregationType, FormatType, FilterCondition, FilterOperator } from './store';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { useLazyQuery } from '@apollo/client';
import { RESOLVE_PROMPT_VARIABLE_QUERY } from '@/graphql/queries/projectPromptVariablesQuerries';
import { usePromptDataLookups } from '@/hooks/usePromptDataLookups';



// Utility to generate a clean placeholder from a name
function generatePlaceholder(name: string): string {
  if (!name) return '';
  const cleaned = name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '');
  return `{{${cleaned}}}`;
}

// Helper for deep comparison of JSON-serializable objects (for useEffect dependency optimization)
function deepCompareJson(a: any, b: any): boolean {
  if (a === b) return true; // Same reference or primitive value
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  
  // Simple check for object type consistency
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Object.keys(a).length !== Object.keys(b).length) return false;

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    console.error("Failed to stringify for deep comparison:", e);
    return false;
  }
}


interface VariableDiscoveryBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (variable: Omit<PromptVariable, 'id'>) => void;
  projectId?: string;
  workspaceId?: string;
}

const SelectionCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon: Icon, title, description, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all text-center h-40",
      "hover:border-primary hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "bg-card"
    )}
  >
    <Icon className="h-10 w-10 text-primary mb-3" />
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </button>
);


export function VariableDiscoveryBuilder({
  open,
  onOpenChange,
  onCreate,
  projectId,
  workspaceId,
}: VariableDiscoveryBuilderProps) {
  const [currentStep, setCurrentStep] = useState<'choose_type' | 'explore_data' | 'manual_config'>(
    'choose_type'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const [tempVariableName, setTempVariableName] = useState('');
  const [tempVariablePlaceholder, setTempVariablePlaceholder] = useState('');
  const [tempVariableDescription, setTempVariableDescription] = useState('');
  const [tempVariableType, setTempVariableType] = useState<PromptVariableType | null>(null);
  const [tempVariableDefaultValue, setTempVariableDefaultValue] = useState('');
  const [tempVariableSource, setTempVariableSource] = useState<PromptVariableSource | null>(null);

  const [selectedCategoryInExplorer, setSelectedCategoryInExplorer] = useState<PromptVariableSource['entityType'] | null>(null);
  const [selectedFieldInExplorer, setSelectedFieldInExplorer] = useState<string | null>(null);
  const [selectedAggregation, setSelectedAggregation] = useState<AggregationType | null>(null);
  const [selectedAggregationField, setSelectedAggregationField] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatType | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<FilterCondition[]>([]);

  const {
    sprints,
    members,
    tasks,
    documents,
    workspace,
    loading: lookupsLoading,
    error: lookupsError,
  } = usePromptDataLookups({ projectId, workspaceId, selectedEntityType: selectedCategoryInExplorer });

  const [fetchPreview, { data: previewData, loading: isLoadingPreview, error: previewErrorObj }] = useLazyQuery(RESOLVE_PROMPT_VARIABLE_QUERY);
  const [debouncedTempVariableSource] = useDebounce(tempVariableSource, 500);
  
  const livePreviewValue = previewData?.resolvePromptVariable;
  const previewError = previewErrorObj ? previewErrorObj.message : null;

  useEffect(() => {
    if (debouncedTempVariableSource && (projectId || workspaceId)) {
      fetchPreview({
        variables: {
          projectId,
          workspaceId,
          variableSource: debouncedTempVariableSource,
          promptVariableId: undefined,
        },
      });
    }
  }, [debouncedTempVariableSource, projectId, workspaceId, fetchPreview]);


  const dataCategories = useMemo(() => [
    { value: 'PROJECT', label: 'Project', icon: Briefcase },
    { value: 'TASK', label: 'Tasks', icon: ListChecks },
    { value: 'SPRINT', label: 'Sprints', icon: Calendar },
    { value: 'DOCUMENT', label: 'Documents', icon: FileText },
    { value: 'MEMBER', label: 'Members', icon: Users },
    { value: 'WORKSPACE', label: 'Workspace', icon: Database },
    { value: 'USER', label: 'Me (Current User)', icon: Users },
  ], []);

  const getEntityDefinition = useCallback((entityType: PromptVariableSource['entityType']) => {
    switch (entityType) {
      case 'PROJECT': return {
        label: 'Project',
        fields: [
          { value: 'name', label: 'Project Name', type: PromptVariableType.STRING, description: 'The name of the current project.' },
          { value: 'description', label: 'Project Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the current project.' },
          { value: 'status', label: 'Project Status', type: PromptVariableType.STRING, description: 'The current status of the project (e.g., ACTIVE, PLANNING).' },
          { value: 'color', label: 'Project Color', type: PromptVariableType.STRING, description: 'The color code assigned to the project.' },
          { value: 'startDate', label: 'Project Start Date', type: PromptVariableType.DATE, description: 'The start date of the project.' },
          { value: 'endDate', label: 'Project End Date', type: PromptVariableType.DATE, description: 'The anticipated end date of the project.' },
        ],
        aggregations: [],
        defaultFormat: null,
        filters: [],
      };
      case 'TASK': return {
        label: 'Task',
        fields: [
          { value: 'title', label: 'Task Title', type: PromptVariableType.STRING, description: 'The title of the task.' },
          { value: 'description', label: 'Task Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the task.' },
          { value: 'status', label: 'Task Status', type: PromptVariableType.STRING, description: 'The status of the task (e.g., TODO, DONE).' },
          { value: 'priority', label: 'Task Priority', type: PromptVariableType.STRING, description: 'The priority of the task (LOW, MEDIUM, HIGH).' },
          { value: 'dueDate', label: 'Task Due Date', type: PromptVariableType.DATE, description: 'The due date of the task.' },
          { value: 'startDate', label: 'Task Start Date', type: PromptVariableType.DATE, description: 'The start date of the task.' },
          { value: 'endDate', label: 'Task End Date', type: PromptVariableType.DATE, description: 'The actual or estimated end date of the task.' },
          { value: 'completed', label: 'Task Completed', type: PromptVariableType.BOOLEAN, description: 'Whether the task is marked as completed.' },
          { value: 'points', label: 'Task Points', type: PromptVariableType.NUMBER, description: 'Story points assigned to the task.' },
          { value: 'completionPercentage', label: 'Task Completion %', type: PromptVariableType.NUMBER, description: 'Percentage of task completion.' },
          { value: 'assignee.firstName', label: 'Assignee First Name', type: PromptVariableType.STRING, description: 'First name of the task assignee.' },
          { value: 'assignee.lastName', label: 'Assignee Last Name', type: PromptVariableType.STRING, description: 'Last name of the task assignee.' },
          { value: 'assignee.email', label: 'Assignee Email', type: PromptVariableType.STRING, description: 'Email of the task assignee.' },
          { value: 'creator.firstName', label: 'Creator First Name', type: PromptVariableType.STRING, description: 'First name of the task creator.' },
        ],
        aggregations: [
          { value: AggregationType.COUNT, label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of tasks matching criteria.' },
          { value: AggregationType.LIST_FIELD_VALUES, label: 'List Titles', aggregationField: 'title', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of titles of tasks matching criteria.' },
          { value: AggregationType.LIST_FIELD_VALUES, label: 'List Descriptions', aggregationField: 'description', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of descriptions of tasks matching criteria.' },
          { value: AggregationType.SUM, label: 'Sum Points', aggregationField: 'points', resultType: PromptVariableType.NUMBER, description: 'Sum of points for tasks matching criteria.' },
          { value: AggregationType.AVERAGE, label: 'Average Points', aggregationField: 'points', resultType: PromptVariableType.NUMBER, description: 'Average points for tasks matching criteria.' },
          { value: AggregationType.LAST_UPDATED_FIELD_VALUE, label: 'Last Updated Task Title', aggregationField: 'title', resultType: PromptVariableType.STRING, description: 'Title of the most recently updated task.' },
        ],
        defaultFormat: FormatType.BULLET_POINTS,
        filters: [
            { field: 'status', label: 'Status Is', type: PromptVariableType.STRING, options: ['TODO', 'DONE'], operators: [FilterOperator.EQ, FilterOperator.NEQ] },
            { field: 'assigneeId', label: 'Assigned To', type: PromptVariableType.STRING, lookupEntity: 'MEMBER', operators: [FilterOperator.EQ, FilterOperator.NEQ, FilterOperator.SPECIAL_CURRENT_USER] },
            { field: 'sprintId', label: 'In Sprint', type: PromptVariableType.STRING, lookupEntity: 'SPRINT', operators: [FilterOperator.EQ, FilterOperator.NEQ] },
            { field: 'completed', label: 'Is Completed', type: PromptVariableType.BOOLEAN, options: ['true', 'false'], operators: [FilterOperator.EQ] },
            { field: 'priority', label: 'Priority Is', type: PromptVariableType.STRING, options: ['LOW', 'MEDIUM', 'HIGH'], operators: [FilterOperator.EQ, FilterOperator.NEQ] },
            { field: 'dueDate', label: 'Due Date', type: PromptVariableType.DATE, operators: [FilterOperator.EQ, FilterOperator.GT, FilterOperator.GTE, FilterOperator.LT, FilterOperator.LTE] },
        ]
      };
      case 'SPRINT': return {
        label: 'Sprint',
        fields: [
          { value: 'name', label: 'Sprint Name', type: PromptVariableType.STRING, description: 'The name of the sprint.' },
          { value: 'description', label: 'Sprint Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the sprint.' },
          { value: 'startDate', label: 'Sprint Start Date', type: PromptVariableType.DATE, description: 'The start date of the sprint.' },
          { value: 'endDate', label: 'Sprint End Date', type: PromptVariableType.DATE, description: 'The end date of the sprint.' },
          { value: 'isCompleted', label: 'Sprint Completed', type: PromptVariableType.BOOLEAN, description: 'Whether the sprint is marked as completed.' },
          { value: 'status', label: 'Sprint Status', type: PromptVariableType.STRING, description: 'The current status of the sprint (e.g., PLANNING, ACTIVE, COMPLETED).' },
        ],
        aggregations: [
          { value: AggregationType.COUNT, label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of sprints matching criteria.' },
          { value: AggregationType.LIST_FIELD_VALUES, label: 'List Names', aggregationField: 'name', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of names of sprints matching criteria.' },
          { value: AggregationType.LAST_UPDATED_FIELD_VALUE, label: 'Last Updated Sprint Name', aggregationField: 'name', resultType: PromptVariableType.STRING, description: 'Name of the most recently updated sprint.' },
        ],
        defaultFormat: FormatType.BULLET_POINTS,
        filters: [
            { field: 'status', label: 'Status Is', type: PromptVariableType.STRING, options: ['PLANNING', 'ACTIVE', 'COMPLETED'], operators: [FilterOperator.EQ, FilterOperator.NEQ, FilterOperator.SPECIAL_ACTIVE_SPRINT] },
            { field: 'isCompleted', label: 'Is Completed', type: PromptVariableType.BOOLEAN, options: ['true', 'false'], operators: [FilterOperator.EQ] },
            { field: 'startDate', label: 'Starts After', type: PromptVariableType.DATE, operators: [FilterOperator.GT, FilterOperator.GTE] },
            { field: 'endDate', label: 'Ends Before', type: PromptVariableType.DATE, operators: [FilterOperator.LT, FilterOperator.LTE] },
        ]
      };
      case 'DOCUMENT': return {
        label: 'Document',
        fields: [
          { value: 'title', label: 'Document Title', type: PromptVariableType.STRING, description: 'The title of the document.' },
          { value: 'content', label: 'Document Content', type: PromptVariableType.RICH_TEXT, description: 'The rich-text content of the document.' },
          { value: 'dataUrl', label: 'Document Data URL', type: PromptVariableType.STRING, description: 'URL for PDF or other file-based content.' },
        ],
        aggregations: [
          { value: AggregationType.COUNT, label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of documents matching criteria.' },
          { value: AggregationType.LIST_FIELD_VALUES, label: 'List Titles', aggregationField: 'title', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of titles of documents matching criteria.' },
          { value: AggregationType.LAST_UPDATED_FIELD_VALUE, label: 'Last Updated Document Title', aggregationField: 'title', resultType: PromptVariableType.STRING, description: 'Title of the most recently updated document.' },
          { value: AggregationType.LAST_UPDATED_FIELD_VALUE, label: 'Last Updated Document Content', aggregationField: 'content', resultType: PromptVariableType.RICH_TEXT, description: 'Content of the most recently updated document.' },
        ],
        defaultFormat: FormatType.BULLET_POINTS,
        filters: [
            { field: 'title', label: 'Title Contains', type: PromptVariableType.STRING, operators: [FilterOperator.CONTAINS, FilterOperator.EQ] }
        ]
      };
      case 'MEMBER': return { // Project Members
        label: 'Member',
        fields: [
          { value: 'user.firstName', label: 'Member First Name', type: PromptVariableType.STRING, description: 'First name of the project member.' },
          { value: 'user.lastName', label: 'Member Last Name', type: PromptVariableType.STRING, description: 'Last name of the project member.' },
          { value: 'user.email', label: 'Member Email', type: PromptVariableType.STRING, description: 'Email of the project member.' },
          { value: 'role', label: 'Member Role', type: PromptVariableType.STRING, description: 'Role of the member in the project.' },
        ],
        aggregations: [
          { value: AggregationType.COUNT, label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of members matching criteria.' },
          { value: AggregationType.LIST_FIELD_VALUES, label: 'List Full Names', aggregationField: 'user.fullName', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of full names of members matching criteria.' },
          { value: AggregationType.LIST_FIELD_VALUES, label: 'List Emails', aggregationField: 'user.email', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of emails of members matching criteria.' },
        ],
        defaultFormat: FormatType.COMMA_SEPARATED,
        filters: [
            { field: 'role', label: 'Role Is', type: PromptVariableType.STRING, options: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'], operators: [FilterOperator.EQ, FilterOperator.NEQ] },
            { field: 'userId', label: 'User Is', type: PromptVariableType.STRING, lookupEntity: 'MEMBER', operators: [FilterOperator.EQ, FilterOperator.NEQ, FilterOperator.SPECIAL_CURRENT_USER] },
        ]
      };
      case 'WORKSPACE': return {
        label: 'Workspace',
        fields: [
          { value: 'name', label: 'Workspace Name', type: PromptVariableType.STRING, description: 'The name of the workspace.' },
          { value: 'description', label: 'Workspace Description', type: PromptVariableType.RICH_TEXT, description: 'The description of the workspace.' },
          { value: 'industry', label: 'Workspace Industry', type: PromptVariableType.STRING, description: 'The industry of the workspace.' },
          { value: 'teamSize', label: 'Workspace Team Size', type: PromptVariableType.STRING, description: 'The team size of the workspace.' },
          { value: 'workFields', label: 'Workspace Work Fields', type: PromptVariableType.LIST_OF_STRINGS, description: 'List of work fields for the workspace.' },
          { value: 'owner.firstName', label: 'Owner First Name', type: PromptVariableType.STRING, description: 'First name of the workspace owner.' },
          { value: 'owner.email', label: 'Owner Email', type: PromptVariableType.STRING, description: 'Email of the workspace owner.' },
        ],
        aggregations: [],
        defaultFormat: null,
        filters: []
      };
      case 'USER': return { // Current User
        label: 'User',
        fields: [
          { value: 'firstName', label: 'My First Name', type: PromptVariableType.STRING, description: 'The first name of the current user.' },
          { value: 'lastName', label: 'My Last Name', type: PromptVariableType.STRING, description: 'The last name of the current user.' },
          { value: 'email', label: 'My Email', type: PromptVariableType.STRING, description: 'The email address of the current user.' },
          { value: 'role', label: 'My Role', type: PromptVariableType.STRING, description: 'The global role of the current user.' },
        ],
        aggregations: [],
        defaultFormat: null,
        filters: []
      };
      case 'DATE_FUNCTION': return {
        label: 'Date Function',
        fields: [
          { value: 'today', label: 'Today\'s Date', type: PromptVariableType.DATE, description: 'The current date.' },
        ],
        aggregations: [],
        defaultFormat: null,
        filters: []
      };
      default: return { label: 'Unknown', fields: [], aggregations: [], defaultFormat: null, filters: [] };
    }
  }, []);

  // Helper to construct PromptVariableSource based on selections
  // IMPORTANT: This function should NOT be memoized with useCallback, or its dependencies
  // need to be extremely stable, as its invocation will be carefully managed.
  const createPromptVariableSource = (
    entityType: PromptVariableSource['entityType'] | null,
    field: string | null = null,
    aggregation: AggregationType | null = null,
    aggregationField: string | null = null,
    format: FormatType | null = null,
    filters: FilterCondition[] = [],
  ): PromptVariableSource | null => {
    if (!entityType) return null;

    const source: PromptVariableSource = { entityType };

    if (field) source.field = field;
    if (aggregation) source.aggregation = aggregation;
    if (aggregationField) source.aggregationField = aggregationField;
    if (format) source.format = format;
    if (filters.length > 0) source.filters = filters;

    return source;
  };


  const generalSuggestions = useMemo(() => [
    { 
      name: 'Project Name', 
      placeholder: generatePlaceholder('Project Name'), 
      type: PromptVariableType.STRING, 
      description: 'The name of the current project.', 
      source: createPromptVariableSource('PROJECT', 'name') 
    },
    { 
      name: 'My Email', 
      placeholder: generatePlaceholder('My Email'), 
      type: PromptVariableType.STRING, 
      description: 'The email address of the current user.', 
      source: createPromptVariableSource('USER', 'email') 
    },
    { 
      name: 'Today\'s Date', 
      placeholder: generatePlaceholder('Today\'s Date'), 
      type: PromptVariableType.DATE, 
      description: 'The current date.', 
      source: createPromptVariableSource('DATE_FUNCTION', 'today') 
    },
    { 
      name: 'Total Tasks Count', 
      placeholder: generatePlaceholder('Total Tasks Count'), 
      type: PromptVariableType.NUMBER, 
      description: 'The total number of tasks in the project.', 
      source: createPromptVariableSource('TASK', null, AggregationType.COUNT) 
    },
    { 
      name: 'Completed Tasks Count', 
      placeholder: generatePlaceholder('Completed Tasks Count'), 
      type: PromptVariableType.NUMBER, 
      description: 'The number of tasks in the project that are marked as DONE.', 
      source: createPromptVariableSource('TASK', null, AggregationType.COUNT, null, null, [{ field: 'status', operator: FilterOperator.EQ, value: 'DONE', type: PromptVariableType.STRING }]) 
    },
    { 
      name: 'All Task Titles List', 
      placeholder: generatePlaceholder('All Task Titles List'), 
      type: PromptVariableType.LIST_OF_STRINGS, 
      description: 'A bulleted list of all task titles in the project.', 
      source: createPromptVariableSource('TASK', null, AggregationType.LIST_FIELD_VALUES, 'title', FormatType.BULLET_POINTS) 
    },
  ], []); // Dependencies here are stable


  // Filtered suggestions based on search term
  const filteredSuggestions = useMemo(() => {
    if (!debouncedSearchTerm) return generalSuggestions;
    const lowerSearch = debouncedSearchTerm.toLowerCase();

    const allSearchable = [
      ...generalSuggestions,
      ...dataCategories.flatMap(cat => {
        const entityDef = getEntityDefinition(cat.value as PromptVariableSource['entityType']);
        return [
          ...entityDef.fields.map(field => ({
            name: `${cat.label}: ${field.label}`,
            placeholder: generatePlaceholder(`${cat.value}_${field.value}`),
            type: field.type,
            description: field.description,
            source: createPromptVariableSource(cat.value as PromptVariableSource['entityType'], field.value),
            defaultValue: undefined,
          })),
          ...entityDef.aggregations.map(agg => ({
            name: `${cat.label}: ${agg.label}`,
            placeholder: generatePlaceholder(`${cat.value}_${agg.value}_${agg.aggregationField || ''}`),
            type: agg.resultType,
            description: agg.description,
            source: createPromptVariableSource(
                cat.value as PromptVariableSource['entityType'], 
                null, 
                agg.value, 
                agg.aggregationField, 
                entityDef.defaultFormat,
            ),
            defaultValue: undefined,
          })),
        ];
      }),
      // Date Function handled specifically as a category
      ...getEntityDefinition('DATE_FUNCTION').fields.map(field => ({
          name: `Date: ${field.label}`,
          placeholder: generatePlaceholder(`Date_${field.label}`),
          type: field.type,
          description: field.description,
          source: createPromptVariableSource('DATE_FUNCTION', field.value),
          defaultValue: field.value === 'today' ? new Date().toISOString().split('T')[0] : undefined,
      })),
    ];

    const uniqueSuggestionsMap = new Map<string, typeof allSearchable[0]>();
    allSearchable.forEach(s => {
        const sourceKey = s.source 
            ? `${s.source.entityType}-${s.source.field || ''}-${s.source.aggregation || ''}-${s.source.aggregationField || ''}-${s.source.format || ''}-${s.source.filters ? JSON.stringify(s.source.filters) : ''}` 
            : 'manual';
        const key = `${s.type}-${sourceKey}`;
        if (!uniqueSuggestionsMap.has(key)) {
            uniqueSuggestionsMap.set(key, s);
        }
    });

    return Array.from(uniqueSuggestionsMap.values()).filter(s =>
      s.name.toLowerCase().includes(lowerSearch) ||
      s.placeholder.toLowerCase().includes(lowerSearch) ||
      s.description?.toLowerCase().includes(lowerSearch)
    );
  }, [debouncedSearchTerm, generalSuggestions, dataCategories, getEntityDefinition]);


  // --- Reset state when dialog opens or closes ---
  useEffect(() => {
    if (!open) {
      setCurrentStep('choose_type');
      setSearchTerm('');
      setTempVariableName('');
      setTempVariablePlaceholder('');
      setTempVariableDescription('');
      setTempVariableType(null);
      setTempVariableDefaultValue('');
      setTempVariableSource(null);
      setSelectedCategoryInExplorer(null);
      setSelectedFieldInExplorer(null);
      setSelectedAggregation(null);
      setSelectedAggregationField(null);
      setSelectedFormat(null);
      setSelectedFilters([]);
    } else {
      if (!projectId && !workspaceId) {
        setCurrentStep('manual_config');
        setTempVariableSource(null);
        setTempVariableType(PromptVariableType.STRING);
      } else {
        setCurrentStep('choose_type');
      }
    }
  }, [open, projectId, workspaceId]);

  // --- Update tempVariablePlaceholder when tempVariableName changes (for manual) ---
  useEffect(() => {
    if (currentStep === 'manual_config' && tempVariableName && !tempVariableSource) {
      setTempVariablePlaceholder(generatePlaceholder(tempVariableName));
    }
  }, [tempVariableName, currentStep, tempVariableSource]);


  // --- NEW: Effect to synthesize temp variable state from explorer selections ---
  // This is the core fix for the infinite loop.
  useEffect(() => {
    if (currentStep !== 'explore_data') return;

    let newName = '';
    let newPlaceholder = '';
    let newType: PromptVariableType | null = null;
    let newSource: PromptVariableSource | null = null;
    let newDescription = '';
    let newDefaultValue = '';

    if (selectedCategoryInExplorer) {
      const entityDef = getEntityDefinition(selectedCategoryInExplorer);

      if (selectedFieldInExplorer) {
        const matchedField = entityDef.fields.find(f => f.value === selectedFieldInExplorer);
        if (matchedField) {
          newName = matchedField.label;
          newPlaceholder = generatePlaceholder(`${selectedCategoryInExplorer}_${matchedField.value}`);
          newType = matchedField.type;
          newSource = createPromptVariableSource(
            selectedCategoryInExplorer,
            matchedField.value,
            null, null, null,
            selectedFilters
          );
          newDescription = matchedField.description || '';
          if (selectedCategoryInExplorer === 'DATE_FUNCTION' && matchedField.value === 'today') {
              newDefaultValue = new Date().toISOString().split('T')[0];
          }
        }
      } else if (selectedAggregation) {
        const matchedAgg = entityDef.aggregations.find(agg => agg.value === selectedAggregation && (agg.aggregationField === selectedAggregationField || !agg.aggregationField));
        if (matchedAgg) {
            newName = `${entityDef.label} ${matchedAgg.label}${matchedAgg.aggregationField ? ` (${matchedAgg.aggregationField})` : ''}`;
            newPlaceholder = generatePlaceholder(`${selectedCategoryInExplorer}_${matchedAgg.value}_${matchedAgg.aggregationField || ''}`);
            newType = matchedAgg.resultType;
            newSource = createPromptVariableSource(
                selectedCategoryInExplorer,
                null,
                matchedAgg.value,
                matchedAgg.aggregationField,
                selectedFormat || entityDef.defaultFormat,
                selectedFilters
            );
            newDescription = matchedAgg.description || '';
        }
      }
    }

    // Only update state if the *content* of the source or other derived fields has genuinely changed
    if (!deepCompareJson(tempVariableSource, newSource)) {
        setTempVariableSource(newSource);
    }
    // Update other fields unconditionally or with their own comparison if they cause re-renders.
    // For primitive values (string, number, boolean), React handles the comparison.
    if (tempVariableName !== newName) setTempVariableName(newName);
    if (tempVariablePlaceholder !== newPlaceholder) setTempVariablePlaceholder(newPlaceholder);
    if (tempVariableType !== newType) setTempVariableType(newType);
    if (tempVariableDescription !== newDescription) setTempVariableDescription(newDescription);
    if (tempVariableDefaultValue !== newDefaultValue) setTempVariableDefaultValue(newDefaultValue);

  }, [
    selectedCategoryInExplorer, 
    selectedFieldInExplorer, 
    selectedAggregation, 
    selectedAggregationField, 
    selectedFormat,
    selectedFilters, // Dependency on filters array
    currentStep, 
    getEntityDefinition,
    // Add all tempVariable states as dependencies if they are read here
    // But then you'd need careful comparison for each to prevent loop.
    // Better to only put *inputs* to the synthesis here.
    tempVariableSource, // Check tempVariableSource itself for deep comparison
    tempVariableName,
    tempVariablePlaceholder,
    tempVariableType,
    tempVariableDescription,
    tempVariableDefaultValue,
  ]);


  const handleCreateVariable = () => {
    if (!tempVariableName || !tempVariablePlaceholder || !tempVariableType) {
      toast.error('Validation Error', {
        description: 'Variable Name, Placeholder, and Type are required.',
      });
      return;
    }

    onCreate({
      name: tempVariableName,
      placeholder: tempVariablePlaceholder,
      defaultValue: tempVariableDefaultValue,
      description: tempVariableDescription,
      type: tempVariableType,
      source: tempVariableSource,
    });
    onOpenChange(false);
  };

  const isFormValid = useMemo(() => {
    return !!tempVariableName && !!tempVariablePlaceholder && !!tempVariableType;
  }, [tempVariableName, tempVariablePlaceholder, tempVariableType]);


  const selectedEntityDef = useMemo(() => {
    if (!selectedCategoryInExplorer) {
        return { label: 'Unknown', fields: [], aggregations: [], defaultFormat: null, filters: [] };
    }
    return getEntityDefinition(selectedCategoryInExplorer);
  }, [selectedCategoryInExplorer, getEntityDefinition]);


  const availableAggregationFields = useMemo(() => {
    if (!selectedAggregation || !selectedCategoryInExplorer) return [];
    const entityDef = getEntityDefinition(selectedCategoryInExplorer);
    return entityDef.fields.filter(f => 
        (selectedAggregation === AggregationType.SUM || selectedAggregation === AggregationType.AVERAGE) 
            ? f.type === PromptVariableType.NUMBER 
            : true
    );
  }, [selectedAggregation, selectedCategoryInExplorer, getEntityDefinition]);

  const handleAddFilter = () => {
    if (!selectedCategoryInExplorer || (!projectId && !workspaceId)) {
        toast.error("Please select an entity type and ensure a project or workspace is selected to add filters.");
        return;
    }
    setSelectedFilters(prev => [...prev, {
        field: '',
        operator: FilterOperator.EQ,
        value: undefined,
        type: PromptVariableType.STRING,
    }]);
  };

  const handleUpdateFilter = useCallback((index: number, updates: Partial<FilterCondition>) => {
    setSelectedFilters(prev => {
      const newFilters = [...prev];
      newFilters[index] = { ...newFilters[index], ...updates };
      return newFilters;
    });
  }, []);

  const handleRemoveFilter = useCallback((index: number) => {
    setSelectedFilters(prev => prev.filter((_, i) => i !== index));
  }, []);


  const getLookupOptions = useCallback((
    filterField: string,
    lookupEntity: PromptVariableSource['entityType'] | undefined
  ): Array<{ id: string; name: string }> => {
    if (!lookupEntity) return [];

    switch (lookupEntity) {
      case 'SPRINT': return sprints.map(s => ({ id: s.id, name: `${s.name} (${s.status})` }));
      case 'MEMBER': return members.map(m => ({
        id: m.user.id,
        name: `${m.user.firstName || ''} ${m.user.lastName || ''} (${m.role})`.trim()
      }));
      case 'TASK': return tasks.map(t => ({ id: t.id, name: `${t.title} (Status: ${t.status})` }));
      case 'DOCUMENT': return documents.map(d => ({ id: d.id, name: `${d.title} (Type: ${d.type})` }));
      case 'WORKSPACE': return workspace ? [{ id: workspace.id, name: workspace.name }] : [];
      default: return [];
    }
  }, [sprints, members, tasks, documents, workspace]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white">
        <DialogHeader className="p-0 border-b">
          <DialogTitle className="text-2xl">Variable Discovery & Builder</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-2 grid grid-cols-2 gap-6">
          {/* Left Column: Discovery & Selection */}
          <div className="flex flex-col space-y-4 border-r pr-6 overflow-y-auto">
            {(!projectId && !workspaceId) && currentStep !== 'manual_config' ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-semibold mb-2">No Project or Workspace Selected</p>
                <p className="mb-4">Dynamic Data Variables require an active project or workspace context.</p>
                <Button onClick={() => { setCurrentStep('manual_config'); setTempVariableSource(null); setTempVariableType(PromptVariableType.STRING); }}>Create Manual Variable Instead</Button>
              </div>
            ) : (
              <>
                {currentStep === 'choose_type' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">What kind of variable do you want?</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <SelectionCard
                        icon={Database}
                        title="Dynamic Project Data"
                        description="Automatically pull live data from your projects, tasks, sprints, and more."
                        onClick={() => setCurrentStep('explore_data')}
                        disabled={!projectId && !workspaceId}
                      />
                      <SelectionCard
                        icon={Keyboard}
                        title="Manual Input Variable"
                        description="Define a variable whose value you will manually enter or update."
                        onClick={() => { setCurrentStep('manual_config'); setTempVariableSource(null); setTempVariableType(PromptVariableType.STRING); }}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 'explore_data' && (
                  <div className="flex flex-col h-full">
                    <Button variant="ghost" onClick={() => {
                      setCurrentStep('choose_type');
                      setSelectedCategoryInExplorer(null);
                      setSelectedFieldInExplorer(null);
                      setSelectedAggregation(null);
                      setSelectedAggregationField(null);
                      setSelectedFormat(null);
                      setSelectedFilters([]);
                      setSearchTerm('');
                      setTempVariableSource(null);
                    }} className="self-start -ml-2 mb-4">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back to Types
                    </Button>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Data from Your Project</h3>
                    <Input
                      placeholder="Search project data, e.g., 'task title', 'project manager', 'latest doc'..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-4"
                    />
                    <Command className="rounded-lg border shadow-sm flex-1">
                      <CommandList className="flex-1 overflow-y-auto">
                        <CommandEmpty>No results found for "{searchTerm}".</CommandEmpty>
                        {/* Suggestions Group */}
                        {filteredSuggestions.length > 0 && searchTerm !== '' && (
                          <CommandGroup heading="Search Results">
                            {filteredSuggestions.map((s, i) => (
                              <CommandItem
                                key={`search-sugg-${s.placeholder + i}`}
                                onSelect={() => {
                                  setTempVariableName(s.name);
                                  setTempVariablePlaceholder(s.placeholder);
                                  setTempVariableType(s.type);
                                  setTempVariableSource(s.source || null);
                                  setTempVariableDescription(s.description || '');
                                  setTempVariableDefaultValue(s.defaultValue || '');
                                  if (s.source) {
                                    setSelectedCategoryInExplorer(s.source.entityType);
                                    setSelectedFieldInExplorer(s.source.field || null);
                                    setSelectedAggregation(s.source.aggregation || null);
                                    setSelectedAggregationField(s.source.aggregationField || null);
                                    setSelectedFormat(s.source.format || null);
                                    setSelectedFilters(s.source.filters || []);
                                  } else {
                                    setSelectedCategoryInExplorer(null);
                                    setSelectedFieldInExplorer(null);
                                    setSelectedAggregation(null);
                                    setSelectedAggregationField(null);
                                    setSelectedFormat(null);
                                    setSelectedFilters([]);
                                  }
                                  setSearchTerm('');
                                }}
                                className="cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-medium">{s.name}</div>
                                  <div className="text-xs text-muted-foreground">{s.description}</div>
                                </div>
                                <Badge variant="secondary" className="ml-2">Data</Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}

                        {/* Browse by Category & Fields (only if no search term) */}
                        {searchTerm === '' && (
                          <>
                            <CommandGroup heading="Browse by Entity Type">
                              {dataCategories.map((cat) => {
                                const Icon = cat.icon;
                                const isProjectEntity = ['PROJECT', 'TASK', 'SPRINT', 'DOCUMENT', 'MEMBER'].includes(cat.value);
                                const isWorkspaceEntity = cat.value === 'WORKSPACE';

                                return (
                                  <CommandItem
                                    key={cat.value}
                                    onSelect={() => {
                                      setSelectedCategoryInExplorer(cat.value as PromptVariableSource['entityType']);
                                      setSelectedFieldInExplorer(null);
                                      setSelectedAggregation(null);
                                      setSelectedAggregationField(null);
                                      setSelectedFormat(null);
                                      setSelectedFilters([]);
                                    }}
                                    className={cn(
                                      "cursor-pointer flex items-center",
                                      selectedCategoryInExplorer === cat.value && "bg-accent text-accent-foreground"
                                    )}
                                    disabled={(isProjectEntity && !projectId) || (isWorkspaceEntity && !workspaceId)}
                                  >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {cat.label}
                                    {((isProjectEntity && !projectId) || (isWorkspaceEntity && !workspaceId)) && (
                                        <Badge variant="destructive" className="ml-auto">No Context</Badge>
                                    )}
                                  </CommandItem>
                                );
                              })}
                                <CommandItem
                                    key="DATE_FUNCTION"
                                    onSelect={() => {
                                      setSelectedCategoryInExplorer('DATE_FUNCTION');
                                      setSelectedFieldInExplorer(null);
                                      setSelectedAggregation(null);
                                      setSelectedAggregationField(null);
                                      setSelectedFormat(null);
                                      setSelectedFilters([]);
                                    }}
                                    className={cn(
                                      "cursor-pointer flex items-center",
                                      selectedCategoryInExplorer === 'DATE_FUNCTION' && "bg-accent text-accent-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Date Functions
                                </CommandItem>
                            </CommandGroup>

                            {selectedCategoryInExplorer && (
                              <>
                                {/* Step 2: Select Field or Aggregation */}
                                {selectedEntityDef.fields.length > 0 && (
                                    <CommandGroup heading={`${selectedEntityDef.label || 'Selected'} Fields`}>
                                        {selectedEntityDef.fields.map((fieldOption) => (
                                            <CommandItem
                                                key={`field-${fieldOption.value}`}
                                                onSelect={() => {
                                                    setSelectedFieldInExplorer(fieldOption.value);
                                                    setSelectedAggregation(null);
                                                    setSelectedAggregationField(null);
                                                    setSelectedFormat(null);
                                                }}
                                                className={cn(
                                                    "cursor-pointer",
                                                    selectedFieldInExplorer === fieldOption.value && !selectedAggregation && "bg-accent text-accent-foreground"
                                                )}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedFieldInExplorer === fieldOption.value && !selectedAggregation ? "opacity-100" : "opacity-0")} />
                                                {fieldOption.label}
                                                <span className="text-xs text-muted-foreground ml-auto">{fieldOption.type.replace(/_/g, ' ')}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                {selectedEntityDef.aggregations.length > 0 && (
                                    <CommandGroup heading={`${selectedEntityDef.label || 'Selected'} Aggregations`}>
                                        {selectedEntityDef.aggregations.map((aggOption) => (
                                            <CommandItem
                                                key={`agg-${aggOption.value}-${aggOption.aggregationField || ''}`}
                                                onSelect={() => {
                                                    setSelectedAggregation(aggOption.value);
                                                    setSelectedAggregationField(aggOption.aggregationField || null);
                                                    setSelectedFieldInExplorer(null);
                                                    setSelectedFormat(aggOption.resultType === PromptVariableType.LIST_OF_STRINGS ? (selectedEntityDef.defaultFormat || FormatType.BULLET_POINTS) : null);
                                                }}
                                                className={cn(
                                                    "cursor-pointer",
                                                    selectedAggregation === aggOption.value && (selectedAggregationField === aggOption.aggregationField || !aggOption.aggregationField) && "bg-accent text-accent-foreground"
                                                )}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedAggregation === aggOption.value && (selectedAggregationField === aggOption.aggregationField || !aggOption.aggregationField) ? "opacity-100" : "opacity-0")} />
                                                {aggOption.label}
                                                {aggOption.aggregationField && <span className="text-xs text-muted-foreground ml-1">({aggOption.aggregationField})</span>}
                                                <span className="text-xs text-muted-foreground ml-auto">{aggOption.resultType.replace(/_/g, ' ')}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                {/* Step 3 (Advanced): Filters */}
                                { (selectedFieldInExplorer || selectedAggregation) && selectedEntityDef.filters && selectedEntityDef.filters.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold text-md text-gray-800">Filters for {selectedEntityDef.label}</h4>
                                            <Button variant="ghost" size="sm" onClick={handleAddFilter} disabled={lookupsLoading}>
                                                <PlusCircle className="h-4 w-4 mr-2" /> Add Filter
                                            </Button>
                                        </div>
                                        {lookupsLoading && (
                                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                                                <Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading lookup data...
                                            </div>
                                        )}
                                        {lookupsError && (
                                            <p className="text-sm text-red-500 mb-2">Error loading filter options: {lookupsError.message}</p>
                                        )}

                                        <div className="space-y-3">
                                            {selectedFilters.map((filter, index) => {
                                                const filterDefinition = selectedEntityDef.filters.find(f => f.field === filter.field);
                                                const currentLookupOptions = filterDefinition ? getLookupOptions(filterDefinition.field, filterDefinition.lookupEntity) : [];

                                                return (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                                    <Select
                                                        value={filter.field}
                                                        onValueChange={(value) => {
                                                            const newFilterDef = selectedEntityDef.filters.find(f => f.field === value);
                                                            handleUpdateFilter(index, {
                                                                field: value,
                                                                value: undefined, // Reset value when field changes
                                                                type: newFilterDef?.type || PromptVariableType.STRING,
                                                                operator: newFilterDef?.operators?.[0] || FilterOperator.EQ, // Default to first operator
                                                            });
                                                        }}
                                                        className="w-1/3"
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                                                        <SelectContent>
                                                            {selectedEntityDef.filters.map((opt) => (
                                                                <SelectItem key={opt.field} value={opt.field}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {filterDefinition && filterDefinition.operators && filterDefinition.operators.length > 0 && (
                                                        <Select
                                                            value={filter.operator}
                                                            onValueChange={(value) => handleUpdateFilter(index, { operator: value as FilterOperator })}
                                                            className="w-1/4"
                                                        >
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {filterDefinition.operators.map(op => (
                                                                    <SelectItem key={op} value={op}>
                                                                        {op.replace(/_/g, ' ')}
                                                                        {op === FilterOperator.SPECIAL_CURRENT_USER && "(Me)"}
                                                                        {op === FilterOperator.SPECIAL_ACTIVE_SPRINT && "(Active)"}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}

                                                    {filter.operator !== FilterOperator.SPECIAL_CURRENT_USER && filter.operator !== FilterOperator.SPECIAL_ACTIVE_SPRINT && (
                                                        filterDefinition?.lookupEntity ? (
                                                            <Select
                                                                value={filter.value ? String(filter.value) : ''}
                                                                onValueChange={(value) => handleUpdateFilter(index, { value })}
                                                                className="flex-1"
                                                                disabled={currentLookupOptions.length === 0}
                                                            >
                                                                <SelectTrigger><SelectValue placeholder={`Select ${filterDefinition.label}`} /></SelectTrigger>
                                                                <SelectContent>
                                                                    {currentLookupOptions.map(option => (
                                                                        <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : filterDefinition?.options ? (
                                                            <Select
                                                                value={filter.value ? String(filter.value) : ''}
                                                                onValueChange={(value) => handleUpdateFilter(index, { value })}
                                                                className="flex-1"
                                                            >
                                                                <SelectTrigger><SelectValue placeholder="Select value" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {filterDefinition.options.map(option => (
                                                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                type={filter.type === PromptVariableType.NUMBER ? 'number' : (filter.type === PromptVariableType.DATE ? 'date' : 'text')}
                                                                value={filter.value !== undefined ? String(filter.value) : ''}
                                                                onChange={(e) => {
                                                                    let val: string | number | boolean = e.target.value;
                                                                    if (filter.type === PromptVariableType.NUMBER) val = parseFloat(e.target.value);
                                                                    if (filter.type === PromptVariableType.BOOLEAN) val = e.target.value.toLowerCase() === 'true';
                                                                    handleUpdateFilter(index, { value: val });
                                                                }}
                                                                placeholder="Enter value"
                                                                className="flex-1"
                                                            />
                                                        )
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveFilter(index)}>
                                                        <XCircle className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Format Output (only for list types) */}
                                {(selectedAggregation === AggregationType.LIST_FIELD_VALUES && (selectedAggregationField || selectedEntityDef.fields.some(f => f.value === selectedAggregationField && f.type === PromptVariableType.LIST_OF_STRINGS))) && (
                                    <div className="mt-4 border-t pt-4">
                                        <h4 className="font-semibold text-md text-gray-800 mb-2">Format Output</h4>
                                        <Select value={selectedFormat || ''} onValueChange={(val) => setSelectedFormat(val as FormatType)}>
                                            <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                                            <SelectContent>
                                                {Object.values(FormatType).map(f => (
                                                    <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </div>
                )}

                {currentStep === 'manual_config' && (
                  <div className="space-y-4">
                    <Button variant="ghost" onClick={() => setCurrentStep('choose_type')} className="self-start -ml-2 mb-4">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back to Types
                    </Button>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Configure Manual Variable</h3>
                    <p className="text-sm text-muted-foreground mb-4">This variable's value will be set manually, or you can provide a default value.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Configuration & Preview */}
          <div className="flex flex-col space-y-4 overflow-y-auto">
            <h3 className="text-xl font-semibold mb-2">Configure Your Variable</h3>
            <p className="text-sm text-muted-foreground">Finalize the details of your selected variable.</p>

            <div className="grid gap-4 flex-1 pr-2">
              <div className="grid gap-2">
                <label className="block text-sm font-medium">Variable Name <span className="text-red-500">*</span></label>
                <Input
                  value={tempVariableName}
                  onChange={(e) => setTempVariableName(e.target.value)}
                  placeholder="A descriptive name for your variable"
                  disabled={!!tempVariableSource && currentStep === 'explore_data'}
                />
                {tempVariableSource && currentStep === 'explore_data' && (
                  <p className="text-xs text-muted-foreground mt-1">Name is auto-generated for project data. Go back to change data selection.</p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="block text-sm font-medium">Placeholder <span className="text-red-500">*</span></label>
                <Input
                  value={tempVariablePlaceholder}
                  readOnly={!!tempVariableSource || currentStep !== 'manual_config'}
                  className="font-mono text-sm"
                  placeholder="e.g., {{project_name}}"
                  onChange={(e) => {
                    if (currentStep === 'manual_config' && !tempVariableSource) {
                      setTempVariablePlaceholder(e.target.value);
                    }
                  }}
                />
                 {tempVariableSource && (
                  <p className="text-xs text-muted-foreground mt-1">Placeholder is generated automatically from data source.</p>
                )}
                 {currentStep === 'manual_config' && (
                  <p className="text-xs text-muted-foreground mt-1">Placeholder is generated from name, but can be customized. (e.g. {'{{' + generatePlaceholder(tempVariableName).slice(2, -2) + '}}'})</p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="block text-sm font-medium">Type <span className="text-red-500">*</span></label>
                <Select value={tempVariableType || ''} onValueChange={(val) => setTempVariableType(val as PromptVariableType)} disabled={!!tempVariableSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select variable type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PromptVariableType).map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 {tempVariableSource && (
                  <p className="text-xs text-muted-foreground mt-1">Type is inferred from data source.</p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="block text-sm font-medium">Description</label>
                <Textarea
                  value={tempVariableDescription}
                  onChange={(e) => setTempVariableDescription(e.target.value)}
                  placeholder="Explain what this variable represents"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <label className="block text-sm font-medium">Default Value {tempVariableSource ? '(used if data is unavailable)' : ''}</label>
                <Input
                  value={tempVariableDefaultValue}
                  onChange={(e) => setTempVariableDefaultValue(e.target.value)}
                  placeholder="Optional default value"
                />
                 {tempVariableSource && (
                  <p className="text-xs text-muted-foreground mt-1">This value will be used if project data is unavailable, or for live preview purposes if data not mocked.</p>
                )}
              </div>

              {/* Live Preview Section */}
              <div className="mt-4 p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold text-sm mb-2">Live Preview {tempVariableSource ? '(Project Data)' : ''}</h4>
                {isLoadingPreview ? (
                  <p className="text-sm text-gray-500 flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching live data...</p>
                ) : previewError ? (
                  <p className="text-sm text-red-500">{previewError}</p>
                ) : (tempVariableSource && (projectId || workspaceId)) ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap max-h-[100px] overflow-y-auto bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    {livePreviewValue || tempVariableDefaultValue || 'N/A (No value or default provided)'}
                  </pre>
                ) : !tempVariableSource && tempVariableDefaultValue ? (
                     <pre className="text-sm font-mono whitespace-pre-wrap max-h-[100px] overflow-y-auto bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                        {tempVariableDefaultValue}
                    </pre>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    { !tempVariableSource && "No dynamic data source selected. Preview not applicable for manual variables (value comes from default/user input)." }
                    { tempVariableSource && (!projectId && !workspaceId) && "Cannot show live preview without a project or workspace ID." }
                    { !tempVariableSource && !tempVariableDefaultValue && "No dynamic data or default value to preview."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateVariable} disabled={!isFormValid}>
            Add Variable to Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

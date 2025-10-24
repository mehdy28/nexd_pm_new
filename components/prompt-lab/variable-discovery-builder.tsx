// components/prompt-lab/variable-discovery-builder.tsx
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Check, ChevronsUpDown, ArrowLeft, Lightbulb, Keyboard, Database, ListChecks, Calendar, FileText, Users, Briefcase, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptVariable, PromptVariableType, PromptVariableSource } from './store'; // Import the updated PromptVariableSource
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
// Import Apollo Client hooks and queries
import { useLazyQuery } from '@apollo/client';
import { RESOLVE_PROMPT_VARIABLE_QUERY } from '@/graphql/queries/promptRelatedQueries';


// Utility to generate a clean placeholder from a name
function generatePlaceholder(name: string): string {
  if (!name) return '';
  const cleaned = name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '');
  return `{{${cleaned}}}`;
}

interface VariableDiscoveryBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (variable: Omit<PromptVariable, 'id'>) => void;
  projectId?: string; // Keep projectId for context
}

// Helper component for visually distinct cards
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
}: VariableDiscoveryBuilderProps) {
  const [currentStep, setCurrentStep] = useState<'choose_type' | 'explore_data' | 'manual_config'>(
    'choose_type'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // State for the variable being built (Configuration Panel)
  const [tempVariableName, setTempVariableName] = useState('');
  const [tempVariablePlaceholder, setTempVariablePlaceholder] = useState('');
  const [tempVariableDescription, setTempVariableDescription] = useState('');
  const [tempVariableType, setTempVariableType] = useState<PromptVariableType | null>(null);
  const [tempVariableDefaultValue, setTempVariableDefaultValue] = useState('');
  const [tempVariableSource, setTempVariableSource] = useState<PromptVariableSource | null>(null);

  // State for the Data Explorer
  const [selectedCategoryInExplorer, setSelectedCategoryInExplorer] = useState<string | null>(null);
  const [selectedFieldInExplorer, setSelectedFieldInExplorer] = useState<string | null>(null);
  // NEW: State for aggregation and format if applicable
  const [selectedAggregation, setSelectedAggregation] = useState<PromptVariableSource['aggregation'] | null>(null);
  const [selectedAggregationField, setSelectedAggregationField] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PromptVariableSource['format'] | null>(null);
  // NEW: State for filter if applicable (simplified for V1 UI)
  const [selectedFilter, setSelectedFilter] = useState<PromptVariableSource['filter'] | null>(null);

  // NEW: Use useLazyQuery directly in VariableDiscoveryBuilder
  const [fetchPreview, { data: previewData, loading: isLoadingPreview, error: previewErrorObj }] = useLazyQuery(RESOLVE_PROMPT_VARIABLE_QUERY);
  const [debouncedTempVariableSource] = useDebounce(tempVariableSource, 500);
  
  const livePreviewValue = previewData?.resolvePromptVariable;
  const previewError = previewErrorObj ? previewErrorObj.message : null;

  // Effect to trigger the preview fetch when debounced source changes
  useEffect(() => {
    if (debouncedTempVariableSource && projectId) {
      fetchPreview({
        variables: {
          projectId,
          variableSource: debouncedTempVariableSource,
          promptVariableId: undefined, // Not applicable for builder preview
        },
      });
    }
  }, [debouncedTempVariableSource, projectId, fetchPreview]);


  // --- Data for Suggestions & Explorer ---
  const dataCategories = useMemo(() => [
    { value: 'PROJECT', label: 'Project', icon: Briefcase },
    { value: 'TASK', label: 'Tasks', icon: ListChecks },
    { value: 'SPRINT', label: 'Sprints', icon: Calendar },
    { value: 'DOCUMENT', label: 'Documents', icon: FileText },
    { value: 'MEMBER', label: 'Members', icon: Users }, // Project Members
    { value: 'WORKSPACE', label: 'Workspace', icon: Database },
    { value: 'USER', label: 'Me (Current User)', icon: Users },
  ], []);

  // Define fields and potential default aggregations/formats for each entity type
  const getEntityDefinition = useCallback((entityType: PromptVariableSource['entityType']) => {
    switch (entityType) {
      case 'PROJECT': return {
        fields: [
          { value: 'name', label: 'Project Name', type: PromptVariableType.STRING, description: 'The name of the current project.' },
          { value: 'description', label: 'Project Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the current project.' },
          { value: 'status', label: 'Project Status', type: PromptVariableType.STRING, description: 'The current status of the project (e.g., ACTIVE, PLANNING).' },
          { value: 'color', label: 'Project Color', type: PromptVariableType.STRING, description: 'The color code assigned to the project.' },
          { value: 'startDate', label: 'Project Start Date', type: PromptVariableType.DATE, description: 'The start date of the project.' },
          { value: 'endDate', label: 'Project End Date', type: PromptVariableType.DATE, description: 'The anticipated end date of the project.' },
          // Note: totalTaskCount/completedTaskCount are now aggregations on TASKS entity
        ],
        aggregations: [], // Project is a single entity, no direct aggregations on it
        defaultFormat: null,
      };
      case 'TASK': return {
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
          { value: 'COUNT', label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of tasks matching criteria.' },
          { value: 'LIST_FIELD_VALUES', label: 'List Titles', aggregationField: 'title', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of titles of tasks matching criteria.' },
          { value: 'LIST_FIELD_VALUES', label: 'List Descriptions', aggregationField: 'description', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of descriptions of tasks matching criteria.' },
          { value: 'SUM', label: 'Sum Points', aggregationField: 'points', resultType: PromptVariableType.NUMBER, description: 'Sum of points for tasks matching criteria.' },
          { value: 'AVERAGE', label: 'Average Points', aggregationField: 'points', resultType: PromptVariableType.NUMBER, description: 'Average points for tasks matching criteria.' },
          { value: 'LAST_UPDATED_FIELD_VALUE', label: 'Last Updated Task Title', aggregationField: 'title', resultType: PromptVariableType.STRING, description: 'Title of the most recently updated task.' },
        ],
        defaultFormat: 'BULLET_POINTS',
        filters: [
            { field: 'status', label: 'Status Is', type: 'select', options: ['TODO', 'DONE'] },
            { field: 'assigneeId', label: 'Assigned To', type: 'special', specialValue: 'CURRENT_USER_ID' },
            { field: 'completed', label: 'Is Completed', type: 'boolean' },
            { field: 'priority', label: 'Priority Is', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
        ]
      };
      case 'SPRINT': return {
        fields: [
          { value: 'name', label: 'Sprint Name', type: PromptVariableType.STRING, description: 'The name of the sprint.' },
          { value: 'description', label: 'Sprint Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the sprint.' },
          { value: 'startDate', label: 'Sprint Start Date', type: PromptVariableType.DATE, description: 'The start date of the sprint.' },
          { value: 'endDate', label: 'Sprint End Date', type: PromptVariableType.DATE, description: 'The end date of the sprint.' },
          { value: 'isCompleted', label: 'Sprint Completed', type: PromptVariableType.BOOLEAN, description: 'Whether the sprint is marked as completed.' },
          { value: 'status', label: 'Sprint Status', type: PromptVariableType.STRING, description: 'The current status of the sprint (e.g., PLANNING, ACTIVE, COMPLETED).' },
        ],
        aggregations: [
          { value: 'COUNT', label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of sprints matching criteria.' },
          { value: 'LIST_FIELD_VALUES', label: 'List Names', aggregationField: 'name', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of names of sprints matching criteria.' },
          { value: 'LAST_UPDATED_FIELD_VALUE', label: 'Last Updated Sprint Name', aggregationField: 'name', resultType: PromptVariableType.STRING, description: 'Name of the most recently updated sprint.' },
        ],
        defaultFormat: 'BULLET_POINTS',
        filters: [
            { field: 'status', label: 'Status Is', type: 'select', options: ['PLANNING', 'ACTIVE', 'COMPLETED'] },
            { field: 'isCompleted', label: 'Is Completed', type: 'boolean' },
            { field: 'specialValue', label: 'Is Active Sprint', type: 'special', specialValue: 'ACTIVE_SPRINT' },
        ]
      };
      case 'DOCUMENT': return {
        fields: [
          { value: 'title', label: 'Document Title', type: PromptVariableType.STRING, description: 'The title of the document.' },
          { value: 'content', label: 'Document Content', type: PromptVariableType.RICH_TEXT, description: 'The rich-text content of the document.' },
          { value: 'dataUrl', label: 'Document Data URL', type: PromptVariableType.STRING, description: 'URL for PDF or other file-based content.' },
        ],
        aggregations: [
          { value: 'COUNT', label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of documents matching criteria.' },
          { value: 'LIST_FIELD_VALUES', label: 'List Titles', aggregationField: 'title', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of titles of documents matching criteria.' },
          { value: 'LAST_UPDATED_FIELD_VALUE', label: 'Last Updated Document Title', aggregationField: 'title', resultType: PromptVariableType.STRING, description: 'Title of the most recently updated document.' },
          { value: 'LAST_UPDATED_FIELD_VALUE', label: 'Last Updated Document Content', aggregationField: 'content', resultType: PromptVariableType.RICH_TEXT, description: 'Content of the most recently updated document.' },
        ],
        defaultFormat: 'BULLET_POINTS',
      };
      case 'MEMBER': return { // Project Members
        fields: [
          { value: 'user.firstName', label: 'Member First Name', type: PromptVariableType.STRING, description: 'First name of the project member.' },
          { value: 'user.lastName', label: 'Member Last Name', type: PromptVariableType.STRING, description: 'Last name of the project member.' },
          { value: 'user.email', label: 'Member Email', type: PromptVariableType.STRING, description: 'Email of the project member.' },
          { value: 'role', label: 'Member Role', type: PromptVariableType.STRING, description: 'Role of the member in the project.' },
        ],
        aggregations: [
          { value: 'COUNT', label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of members matching criteria.' },
          { value: 'LIST_FIELD_VALUES', label: 'List Full Names', aggregationField: 'user.fullName', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of full names of members matching criteria.' },
          { value: 'LIST_FIELD_VALUES', label: 'List Emails', aggregationField: 'user.email', resultType: PromptVariableType.LIST_OF_STRINGS, description: 'A list of emails of members matching criteria.' },
        ],
        defaultFormat: 'COMMA_SEPARATED',
        filters: [
            { field: 'role', label: 'Role Is', type: 'select', options: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
        ]
      };
      case 'WORKSPACE': return {
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
      };
      case 'USER': return { // Current User
        fields: [
          { value: 'firstName', label: 'My First Name', type: PromptVariableType.STRING, description: 'The first name of the current user.' },
          { value: 'lastName', label: 'My Last Name', type: PromptVariableType.STRING, description: 'The last name of the current user.' },
          { value: 'email', label: 'My Email', type: PromptVariableType.STRING, description: 'The email address of the current user.' },
          { value: 'role', label: 'My Role', type: PromptVariableType.STRING, description: 'The global role of the current user.' },
        ],
        aggregations: [],
        defaultFormat: null,
      };
      case 'DATE_FUNCTION': return {
        fields: [
          { value: 'today', label: 'Today\'s Date', type: PromptVariableType.DATE, description: 'The current date.' },
        ],
        aggregations: [],
        defaultFormat: null,
      };
      default: return { fields: [], aggregations: [], defaultFormat: null };
    }
  }, []);

  // Helper to construct PromptVariableSource based on selections
  const buildPromptVariableSource = useCallback((
    entityType: PromptVariableSource['entityType'] | null,
    field: string | null,
    aggregation: PromptVariableSource['aggregation'] | null = null,
    aggregationField: string | null = null,
    format: PromptVariableSource['format'] | null = null,
    filter: PromptVariableSource['filter'] | null = null,
  ): PromptVariableSource | null => {
    if (!entityType) return null;

    const source: PromptVariableSource = { entityType };

    if (field) source.field = field;
    if (aggregation) source.aggregation = aggregation;
    if (aggregationField) source.aggregationField = aggregationField;
    if (format) source.format = format;
    if (filter) source.filter = filter;

    return source;
  }, []);

  const generalSuggestions = useMemo(() => [
    { 
      name: 'Project Name', 
      placeholder: generatePlaceholder('Project Name'), 
      type: PromptVariableType.STRING, 
      description: 'The name of the current project.', 
      source: buildPromptVariableSource('PROJECT', 'name') 
    },
    { 
      name: 'My Email', 
      placeholder: generatePlaceholder('My Email'), 
      type: PromptVariableType.STRING, 
      description: 'The email address of the current user.', 
      source: buildPromptVariableSource('USER', 'email') 
    },
    { 
      name: 'Today\'s Date', 
      placeholder: generatePlaceholder('Today\'s Date'), 
      type: PromptVariableType.DATE, 
      description: 'The current date.', 
      source: buildPromptVariableSource('DATE_FUNCTION', 'today') 
    },
    { 
      name: 'Total Tasks Count', 
      placeholder: generatePlaceholder('Total Tasks Count'), 
      type: PromptVariableType.NUMBER, 
      description: 'The total number of tasks in the project.', 
      source: buildPromptVariableSource('TASK', null, 'COUNT') 
    },
    { 
      name: 'Completed Tasks Count', 
      placeholder: generatePlaceholder('Completed Tasks Count'), 
      type: PromptVariableType.NUMBER, 
      description: 'The number of tasks in the project that are marked as DONE.', 
      source: buildPromptVariableSource('TASK', null, 'COUNT', null, null, { field: 'status', operator: 'EQ', value: 'DONE' }) 
    },
    { 
      name: 'All Task Titles List', 
      placeholder: generatePlaceholder('All Task Titles List'), 
      type: PromptVariableType.LIST_OF_STRINGS, 
      description: 'A bulleted list of all task titles in the project.', 
      source: buildPromptVariableSource('TASK', null, 'LIST_FIELD_VALUES', 'title', 'BULLET_POINTS') 
    },
  ], [buildPromptVariableSource]);

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
            source: buildPromptVariableSource(cat.value as PromptVariableSource['entityType'], field.value),
            defaultValue: undefined, // No default value for dynamic fields generally
          })),
          ...entityDef.aggregations.map(agg => ({
            name: `${cat.label}: ${agg.label}`,
            placeholder: generatePlaceholder(`${cat.value}_${agg.value}_${agg.aggregationField || ''}`),
            type: agg.resultType,
            description: agg.description,
            source: buildPromptVariableSource(
                cat.value as PromptVariableSource['entityType'], 
                null, // No single field if it's an aggregation
                agg.value, 
                agg.aggregationField, 
                entityDef.defaultFormat // Use default format from entity def
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
          source: buildPromptVariableSource('DATE_FUNCTION', field.value),
          defaultValue: field.value === 'today' ? new Date().toISOString().split('T')[0] : undefined,
      })),
    ];

    const uniqueSuggestionsMap = new Map<string, typeof allSearchable[0]>();
    allSearchable.forEach(s => {
        // NEW: More robust sourceKey generation for uniqueness
        const sourceKey = s.source 
            ? `${s.source.entityType}-${s.source.field || ''}-${s.source.aggregation || ''}-${s.source.aggregationField || ''}-${s.source.format || ''}-${s.source.filter ? JSON.stringify(s.source.filter) : ''}` 
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
  }, [debouncedSearchTerm, generalSuggestions, dataCategories, getEntityDefinition, buildPromptVariableSource]);


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
      setSelectedFilter(null);
    } else {
      if (!projectId) {
        setCurrentStep('manual_config');
        setTempVariableSource(null);
        setTempVariableType(PromptVariableType.STRING);
      } else {
        setCurrentStep('choose_type');
      }
    }
  }, [open, projectId]);

  // --- Update tempVariablePlaceholder when tempVariableName changes (for manual) ---
  useEffect(() => {
    if (currentStep === 'manual_config' && tempVariableName && !tempVariableSource) {
      setTempVariablePlaceholder(generatePlaceholder(tempVariableName));
    }
  }, [tempVariableName, currentStep, tempVariableSource]);


  // --- Update temp variable state when explorer selections change ---
  useEffect(() => {
    if (currentStep === 'explore_data' && selectedCategoryInExplorer) {
      const entityDef = getEntityDefinition(selectedCategoryInExplorer as PromptVariableSource['entityType']);
      let newName = '';
      let newPlaceholder = '';
      let newType: PromptVariableType | null = null;
      let newSource: PromptVariableSource | null = null;
      let newDescription = '';
      let newDefaultValue = '';

      if (selectedFieldInExplorer) {
        const matchedField = entityDef.fields.find(f => f.value === selectedFieldInExplorer);
        if (matchedField) {
          newName = matchedField.label;
          newPlaceholder = generatePlaceholder(`${selectedCategoryInExplorer}_${matchedField.value}`);
          newType = matchedField.type;
          newSource = buildPromptVariableSource(
            selectedCategoryInExplorer as PromptVariableSource['entityType'],
            matchedField.value
          );
          newDescription = matchedField.description || '';
          if (selectedCategoryInExplorer === 'DATE_FUNCTION' && matchedField.value === 'today') {
              newDefaultValue = new Date().toISOString().split('T')[0];
          }
        } else {
          // Fallback for custom/unlisted field (less common with structured fields)
          newName = `${entityDef.label || selectedCategoryInExplorer}: ${selectedFieldInExplorer}`;
          newPlaceholder = generatePlaceholder(`${selectedCategoryInExplorer}_${selectedFieldInExplorer}`);
          newType = PromptVariableType.STRING; // Default to string for unknown fields
          newSource = buildPromptVariableSource(
            selectedCategoryInExplorer as PromptVariableSource['entityType'],
            selectedFieldInExplorer
          );
          newDescription = `Custom field '${selectedFieldInExplorer}' from ${entityDef.label || selectedCategoryInExplorer}`;
        }
      } else if (selectedAggregation) {
        const matchedAgg = entityDef.aggregations.find(agg => agg.value === selectedAggregation && (agg.aggregationField === selectedAggregationField || !agg.aggregationField));
        if (matchedAgg) {
            newName = `${entityDef.label} ${matchedAgg.label}${matchedAgg.aggregationField ? ` (${matchedAgg.aggregationField})` : ''}`;
            newPlaceholder = generatePlaceholder(`${selectedCategoryInExplorer}_${matchedAgg.value}_${matchedAgg.aggregationField || ''}`);
            newType = matchedAgg.resultType;
            newSource = buildPromptVariableSource(
                selectedCategoryInExplorer as PromptVariableSource['entityType'],
                null, // No single field for aggregations
                matchedAgg.value,
                matchedAgg.aggregationField,
                selectedFormat || entityDef.defaultFormat,
                selectedFilter // Apply filter if selected
            );
            newDescription = matchedAgg.description || '';
        }
      }

      setTempVariableName(newName);
      setTempVariablePlaceholder(newPlaceholder);
      setTempVariableType(newType);
      setTempVariableSource(newSource);
      setTempVariableDescription(newDescription);
      setTempVariableDefaultValue(newDefaultValue);
    } else if (currentStep === 'explore_data' && !selectedCategoryInExplorer) {
      // Clear configuration if no category is selected
      setTempVariableName('');
      setTempVariablePlaceholder('');
      setTempVariableType(null);
      setTempVariableSource(null);
      setTempVariableDescription('');
      setTempVariableDefaultValue('');
      setSelectedAggregation(null);
      setSelectedAggregationField(null);
      setSelectedFormat(null);
      setSelectedFilter(null);
    }
  }, [
    selectedCategoryInExplorer, 
    selectedFieldInExplorer, 
    selectedAggregation, 
    selectedAggregationField, 
    selectedFormat,
    selectedFilter,
    getEntityDefinition, 
    currentStep, 
    buildPromptVariableSource
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


  const selectedEntityDef = selectedCategoryInExplorer 
    ? getEntityDefinition(selectedCategoryInExplorer as PromptVariableSource['entityType']) 
    : { fields: [], aggregations: [], defaultFormat: null, filters: [] };

  const availableAggregationFields = useMemo(() => {
    if (!selectedAggregation || !selectedCategoryInExplorer) return [];
    const entityDef = getEntityDefinition(selectedCategoryInExplorer as PromptVariableSource['entityType']);
    // Filter fields that are suitable for aggregation
    return entityDef.fields.filter(f => 
        (selectedAggregation === 'SUM' || selectedAggregation === 'AVERAGE') 
            ? f.type === PromptVariableType.NUMBER 
            : true // All fields can be listed
    );
  }, [selectedAggregation, selectedCategoryInExplorer, getEntityDefinition]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white">
        <DialogHeader className="p-0 border-b">
          <DialogTitle className="text-2xl">Variable Discovery & Builder</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-2 grid grid-cols-2 gap-6">
          {/* Left Column: Discovery & Selection */}
          <div className="flex flex-col space-y-4 border-r pr-6 overflow-y-auto">
            {!projectId && currentStep !== 'manual_config' ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-semibold mb-2">No Project Selected</p>
                <p className="mb-4">Dynamic Project Data Variables require an active project context.</p>
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
                        disabled={!projectId}
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
                      setSelectedAggregation(null); // Clear aggregation
                      setSelectedAggregationField(null); // Clear aggregation field
                      setSelectedFormat(null); // Clear format
                      setSelectedFilter(null); // Clear filter
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
                                  // Update explorer state based on selected suggestion's source for UI consistency
                                  if (s.source) {
                                    setSelectedCategoryInExplorer(s.source.entityType);
                                    setSelectedFieldInExplorer(s.source.field || null);
                                    setSelectedAggregation(s.source.aggregation || null);
                                    setSelectedAggregationField(s.source.aggregationField || null);
                                    setSelectedFormat(s.source.format || null);
                                    setSelectedFilter(s.source.filter || null);
                                  } else {
                                    setSelectedCategoryInExplorer(null);
                                    setSelectedFieldInExplorer(null);
                                    setSelectedAggregation(null);
                                    setSelectedAggregationField(null);
                                    setSelectedFormat(null);
                                    setSelectedFilter(null);
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
                                return (
                                  <CommandItem
                                    key={cat.value}
                                    onSelect={() => {
                                      setSelectedCategoryInExplorer(cat.value);
                                      setSelectedFieldInExplorer(null);
                                      setSelectedAggregation(null);
                                      setSelectedAggregationField(null);
                                      setSelectedFormat(null);
                                      setSelectedFilter(null);
                                    }}
                                    className={cn(
                                      "cursor-pointer flex items-center",
                                      selectedCategoryInExplorer === cat.value && "bg-accent text-accent-foreground"
                                    )}
                                  >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {cat.label}
                                  </CommandItem>
                                );
                              })}
                                <CommandItem
                                    key="DATE_FUNCTION" // Changed from 'date_function' to 'DATE_FUNCTION'
                                    onSelect={() => {
                                      setSelectedCategoryInExplorer('DATE_FUNCTION');
                                      setSelectedFieldInExplorer(null);
                                      setSelectedAggregation(null);
                                      setSelectedAggregationField(null);
                                      setSelectedFormat(null);
                                      setSelectedFilter(null);
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
                                                    setSelectedAggregation(null); // Clear aggregation if a field is selected
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
                                                    setSelectedFieldInExplorer(null); // Clear field selection if an aggregation is selected
                                                    setSelectedFormat(aggOption.resultType === PromptVariableType.LIST_OF_STRINGS ? (entityDef.defaultFormat || 'BULLET_POINTS') : null); // Set default format if applicable
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

                                {/* Step 3 (Advanced): Filters & Format (Simplified UI for V1) */}
                                { (selectedFieldInExplorer || selectedAggregation) && selectedEntityDef.filters && selectedEntityDef.filters.length > 0 && (
                                    <CommandGroup heading={`${selectedEntityDef.label || 'Selected'} Filters`}>
                                        {selectedEntityDef.filters.map((filterOption) => (
                                            <CommandItem
                                                key={`filter-${filterOption.field}-${filterOption.specialValue || filterOption.value || 'any'}`}
                                                onSelect={() => {
                                                    // This is a simplified filter selection for V1
                                                    // In a real PowerBI-like UI, this would open a sub-dialog to configure filter conditions
                                                    if (filterOption.specialValue === 'CURRENT_USER_ID') {
                                                        setSelectedFilter({ field: filterOption.field, operator: 'EQ', specialValue: 'CURRENT_USER_ID' });
                                                    } else if (filterOption.specialValue === 'ACTIVE_SPRINT') {
                                                        setSelectedFilter({ field: 'status', operator: 'EQ', value: 'ACTIVE' }); // Or a more complex source for active sprint
                                                    }
                                                    // For simple select/boolean filters, you'd implement a separate input control here
                                                    // For now, we'll just demonstrate the selection of predefined 'filter types'
                                                }}
                                                className={cn(
                                                    "cursor-pointer",
                                                    selectedFilter && selectedFilter.field === filterOption.field && "bg-accent text-accent-foreground"
                                                )}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedFilter && selectedFilter.field === filterOption.field ? "opacity-100" : "opacity-0")} />
                                                {filterOption.label}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                {(selectedAggregation && selectedAggregationField && selectedAggregationField.includes('List')) && (
                                    <CommandGroup heading="Format Output">
                                        {Object.values(PromptVariableType).includes(PromptVariableType.LIST_OF_STRINGS) && ( // Ensure LIST_OF_STRINGS is a valid type
                                            <>
                                                <CommandItem onSelect={() => setSelectedFormat('BULLET_POINTS')} className={cn("cursor-pointer", selectedFormat === 'BULLET_POINTS' && "bg-accent text-accent-foreground")}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedFormat === 'BULLET_POINTS' ? "opacity-100" : "opacity-0")} />
                                                    Bullet Points
                                                </CommandItem>
                                                <CommandItem onSelect={() => setSelectedFormat('COMMA_SEPARATED')} className={cn("cursor-pointer", selectedFormat === 'COMMA_SEPARATED' && "bg-accent text-accent-foreground")}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedFormat === 'COMMA_SEPARATED' ? "opacity-100" : "opacity-0")} />
                                                    Comma Separated
                                                </CommandItem>
                                                <CommandItem onSelect={() => setSelectedFormat('PLAIN_TEXT')} className={cn("cursor-pointer", selectedFormat === 'PLAIN_TEXT' && "bg-accent text-accent-foreground")}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedFormat === 'PLAIN_TEXT' ? "opacity-100" : "opacity-0")} />
                                                    Plain Text (Newline Delimited)
                                                </CommandItem>
                                            </>
                                        )}
                                    </CommandGroup>
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
                ) : (tempVariableSource && projectId) ? (
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
                    { tempVariableSource && !projectId && "Cannot show live preview without a project ID." }
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
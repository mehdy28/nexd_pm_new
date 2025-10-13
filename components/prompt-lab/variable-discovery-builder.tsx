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
import { Check, ChevronsUpDown, ArrowLeft, Lightbulb, Keyboard, Database, ListChecks, Calendar, FileText, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptVariable, PromptVariableType, PromptVariableSource } from './store'; // Adjust path as needed
// Assuming you have a GraphQL client hook or similar
//  import { useGraphQLClient } from '@/hooks/use-graphql-client';
// import { gql } from 'graphql-request';
import { useDebounce } from 'use-debounce'; // For live preview debouncing
import { toast } from 'sonner'; // For better user feedback than alert()

// GraphQL query stub for resolving variable value
const RESOLVE_PROMPT_VARIABLE_QUERY = `
  query ResolvePromptVariable($projectId: ID, $variableSource: JSON!, $promptVariableId: ID) {
    resolvePromptVariable(projectId: $projectId, variableSource: $variableSource, promptVariableId: $promptVariableId)
  }
`;

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
  projectId?: string;
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
      "flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all text-center h-40", // Added h-40 for consistent height
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
  const [selectedCategoryInExplorer, setSelectedCategoryInExplorer] = useState<string | null>(null); // e.g., 'project', 'tasks'
  const [selectedFieldInExplorer, setSelectedFieldInExplorer] = useState<string | null>(null); // e.g., 'name', 'titles_list'

  // Live preview state
  const [livePreviewValue, setLivePreviewValue] = useState<string>('N/A');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // --- Mock Data for Suggestions & Explorer (replace with backend calls) ---
  const dataCategories = useMemo(() => [
    { value: 'project', label: 'Project', icon: Briefcase },
    { value: 'tasks', label: 'Tasks', icon: ListChecks },
    { value: 'sprints', label: 'Sprints', icon: Calendar },
    { value: 'documents', label: 'Documents', icon: FileText },
    { value: 'members', label: 'Members', icon: Users },
    { value: 'workspace', label: 'Workspace', icon: Database },
    { value: 'user', label: 'Me (Current User)', icon: Users }, // Assuming User icon is appropriate for 'Me'
  ], []);

  const getFieldsForCategory = useCallback((category: string | null) => {
    if (!category) return [];
    switch (category) {
      case 'project': return [
        { value: 'name', label: 'Project Name', type: PromptVariableType.STRING, description: 'The name of the current project.', source: { type: 'PROJECT_FIELD', field: 'name' } },
        { value: 'description', label: 'Project Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the current project.', source: { type: 'PROJECT_FIELD', field: 'description' } },
        { value: 'status', label: 'Project Status', type: PromptVariableType.STRING, description: 'The current status of the project (e.g., ACTIVE, PLANNING).', source: { type: 'PROJECT_FIELD', field: 'status' } },
        { value: 'totalTaskCount', label: 'Total Tasks Count', type: PromptVariableType.NUMBER, description: 'The total number of tasks in the project.', source: { type: 'PROJECT_FIELD', field: 'totalTaskCount', aggregation: 'COUNT' } },
        { value: 'completedTaskCount', label: 'Completed Tasks Count', type: PromptVariableType.NUMBER, description: 'The number of tasks in the project that are marked as DONE.', source: { type: 'PROJECT_FIELD', field: 'completedTaskCount', aggregation: 'COUNT', filter: { status: 'DONE' } } },
      ];
      case 'tasks': return [
        { value: 'all_titles_list', label: 'All Tasks Titles List', type: PromptVariableType.LIST_OF_STRINGS, description: 'A bulleted list of all task titles in the project.', source: { type: 'TASKS_AGGREGATION', aggregation: 'LIST_TITLES', format: 'BULLET_POINTS' } },
        { value: 'my_tasks_titles_list', label: 'My Tasks Titles List', type: PromptVariableType.LIST_OF_STRINGS, description: 'A bulleted list of task titles assigned to the current user.', source: { type: 'TASKS_AGGREGATION', filter: { assigneeId: 'current_user' }, aggregation: 'LIST_TITLES', format: 'BULLET_POINTS' } },
        { value: 'completed_count', label: 'Completed Tasks Count', type: PromptVariableType.NUMBER, description: 'The total count of completed tasks in the project.', source: { type: 'TASKS_AGGREGATION', filter: { status: 'DONE' }, aggregation: 'COUNT' } },
        { value: 'task_title_by_id', label: 'Specific Task: Title (by ID)', type: PromptVariableType.STRING, description: 'The title of a specific task (requires a task ID to be provided in the filter).', source: { type: 'SINGLE_TASK_FIELD', field: 'title', entityId: 'prompt_for_task_id' } }, // 'prompt_for_task_id' means we'd prompt user for it
      ];
      case 'sprints': return [
        { value: 'current_name', label: 'Current Sprint Name', type: PromptVariableType.STRING, description: 'The name of the currently active sprint.', source: { type: 'SPRINT_FIELD', entityId: 'current_sprint', field: 'name' } },
        { value: 'current_endDate', label: 'Current Sprint End Date', type: PromptVariableType.DATE, description: 'The end date of the currently active sprint.', source: { type: 'SPRINT_FIELD', entityId: 'current_sprint', field: 'endDate' } },
        { value: 'upcoming_names_list', label: 'Upcoming Sprints Names List', type: PromptVariableType.LIST_OF_STRINGS, description: 'A bulleted list of names of all upcoming (planning) sprints.', source: { type: 'SPRINT_AGGREGATION', filter: { status: 'PLANNING' }, aggregation: 'LIST_NAMES', format: 'BULLET_POINTS' } },
      ];
      case 'documents': return [
        { value: 'latest_title', label: 'Latest Document Title', type: PromptVariableType.STRING, description: 'The title of the most recently updated document.', source: { type: 'DOCUMENT_FIELD', entityId: 'latest', field: 'title' } },
        { value: 'latest_content', label: 'Latest Document Content', type: PromptVariableType.RICH_TEXT, description: 'The full rich-text content of the most recently updated document.', source: { type: 'DOCUMENT_FIELD', entityId: 'latest', field: 'content' } },
        { value: 'all_titles_list', label: 'All Documents Titles List', type: PromptVariableType.LIST_OF_STRINGS, description: 'A bulleted list of titles of all documents in the project.', source: { type: 'DOCUMENT_AGGREGATION', aggregation: 'LIST_TITLES', format: 'BULLET_POINTS' } },
      ];
      case 'members': return [
        { value: 'all_names_list', label: 'All Project Members Names List', type: PromptVariableType.LIST_OF_STRINGS, description: 'A comma-separated list of names of all members in the project.', source: { type: 'MEMBER_LIST', aggregation: 'LIST_NAMES', format: 'COMMA_SEPARATED' } },
        { value: 'admin_names_list', label: 'Admin Members Names List', type: PromptVariableType.LIST_OF_STRINGS, description: 'A comma-separated list of names of project administrators.', source: { type: 'MEMBER_LIST', filter: { role: 'ADMIN' }, aggregation: 'LIST_NAMES', format: 'COMMA_SEPARATED' } },
      ];
      case 'workspace': return [
        { value: 'name', label: 'Workspace Name', type: PromptVariableType.STRING, description: 'The name of the workspace this project belongs to.', source: { type: 'WORKSPACE_FIELD', field: 'name' } },
        { value: 'industry', label: 'Workspace Industry', type: PromptVariableType.STRING, description: 'The industry defined for the workspace.', source: { type: 'WORKSPACE_FIELD', field: 'industry' } },
      ];
      case 'user': return [
        { value: 'firstName', label: 'My First Name', type: PromptVariableType.STRING, description: 'The first name of the current user.', source: { type: 'USER_FIELD', field: 'firstName' } },
        { value: 'email', label: 'My Email', type: PromptVariableType.STRING, description: 'The email address of the current user.', source: { type: 'USER_FIELD', field: 'email' } },
      ];
      default: return [];
    }
  }, []);

  const generalSuggestions = useMemo(() => [
    { name: 'Project Name', placeholder: generatePlaceholder('Project Name'), type: PromptVariableType.STRING, description: 'The name of the current project.', source: { type: 'PROJECT_FIELD', field: 'name' } },
    { name: 'My Email', placeholder: generatePlaceholder('My Email'), type: PromptVariableType.STRING, description: 'The email address of the current user.', source: { type: 'USER_FIELD', field: 'email' } },
    { name: 'Today\'s Date', placeholder: generatePlaceholder('Today\'s Date'), type: PromptVariableType.DATE, description: 'The current date.', source: { type: 'DATE_FUNCTION', field: 'today' }, defaultValue: new Date().toISOString().split('T')[0] },
    { name: 'Total Tasks Count', placeholder: generatePlaceholder('Total Tasks Count'), type: PromptVariableType.NUMBER, description: 'The total number of tasks in the project.', source: { type: 'PROJECT_FIELD', field: 'totalTaskCount', aggregation: 'COUNT' } },
    { name: 'All Task Titles List', placeholder: generatePlaceholder('All Task Titles List'), type: PromptVariableType.LIST_OF_STRINGS, description: 'A bulleted list of all task titles in the project.', source: { type: 'TASKS_AGGREGATION', aggregation: 'LIST_TITLES', format: 'BULLET_POINTS' } },
  ], []);

  // Filtered suggestions based on search term
  const filteredSuggestions = useMemo(() => {
    if (!debouncedSearchTerm) return generalSuggestions;
    const lowerSearch = debouncedSearchTerm.toLowerCase();

    // Combine all potential suggestions for searching
    const allSearchable = [
      ...generalSuggestions,
      ...dataCategories.flatMap(cat =>
        getFieldsForCategory(cat.value).map(field => ({
          name: `${cat.label}: ${field.label}`,
          placeholder: generatePlaceholder(`${cat.value}_${field.label}`),
          type: field.type,
          description: field.description,
          source: field.source,
          defaultValue: field.defaultValue, // Include defaultValue for suggestions
        }))
      )
    ];

    // Ensure unique suggestions by placeholder (or a more robust key)
    const uniqueSuggestionsMap = new Map<string, typeof allSearchable[0]>();
    allSearchable.forEach(s => {
        // Use a more robust key if placeholder can be non-unique (e.g., combine type + source)
        const key = JSON.stringify({ type: s.type, source: s.source });
        if (!uniqueSuggestionsMap.has(key)) {
            uniqueSuggestionsMap.set(key, s);
        }
    });

    return Array.from(uniqueSuggestionsMap.values()).filter(s =>
      s.name.toLowerCase().includes(lowerSearch) ||
      s.placeholder.toLowerCase().includes(lowerSearch) ||
      s.description?.toLowerCase().includes(lowerSearch)
    );
  }, [debouncedSearchTerm, generalSuggestions, dataCategories, getFieldsForCategory]);


  // --- Reset state when dialog opens or closes ---
  useEffect(() => {
    if (!open) {
      // Reset all states when dialog closes
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
      setLivePreviewValue('N/A');
      setIsLoadingPreview(false);
      setPreviewError(null);
    } else {
      // Optional: Initialize based on initial projectId if needed, or just ensure default starting step
      if (!projectId && currentStep === 'explore_data') {
        setCurrentStep('choose_type'); // Or redirect to manual if no project
      }
    }
  }, [open, projectId, currentStep]);

  // --- Update tempVariablePlaceholder when tempVariableName changes (for manual) ---
  useEffect(() => {
    // Only update placeholder automatically if it's a manual variable and not explicitly set
    if (currentStep === 'manual_config' && tempVariableName && !tempVariableSource) {
      setTempVariablePlaceholder(generatePlaceholder(tempVariableName));
    }
  }, [tempVariableName, currentStep, tempVariableSource]);


  // --- Update temp variable state when explorer selections change ---
  useEffect(() => {
    if (currentStep === 'explore_data' && selectedCategoryInExplorer && selectedFieldInExplorer) {
      const categoryFields = getFieldsForCategory(selectedCategoryInExplorer);
      const matchedField = categoryFields.find(f => f.value === selectedFieldInExplorer);

      if (matchedField) {
        setTempVariableName(matchedField.label);
        setTempVariablePlaceholder(generatePlaceholder(`${selectedCategoryInExplorer}_${matchedField.label}`));
        setTempVariableType(matchedField.type);
        setTempVariableSource(matchedField.source || { type: selectedCategoryInExplorer.toUpperCase() + '_FIELD', field: matchedField.value });
        setTempVariableDescription(matchedField.description || '');
        setTempVariableDefaultValue(matchedField.defaultValue || ''); // Use default if provided
      } else {
        // Fallback for custom fields or when direct match isn't found for source config
        // This case might mean the field isn't in our mock, but could exist via API
        setTempVariableName(`Custom ${selectedCategoryInExplorer} Field: ${selectedFieldInExplorer}`);
        setTempVariablePlaceholder(generatePlaceholder(`${selectedCategoryInExplorer}_${selectedFieldInExplorer}`));
        setTempVariableType(PromptVariableType.STRING); // Default to string for unknown types
        setTempVariableSource({ type: selectedCategoryInExplorer.toUpperCase() + '_FIELD', field: selectedFieldInExplorer });
        setTempVariableDescription('');
        setTempVariableDefaultValue('');
      }
    } else if (currentStep === 'explore_data' && !selectedFieldInExplorer) {
      // If category is selected but no field, clear variable details
      setTempVariableName('');
      setTempVariablePlaceholder('');
      setTempVariableType(null);
      setTempVariableSource(null);
      setTempVariableDescription('');
      setTempVariableDefaultValue('');
    }
  }, [selectedCategoryInExplorer, selectedFieldInExplorer, getFieldsForCategory, currentStep]);


  // --- Live Preview of Variable Value (calls backend) ---
  const fetchLivePreview = useCallback(async () => {
    if (!tempVariableSource || !projectId) {
      setLivePreviewValue('N/A (manual variable or no project context)');
      setIsLoadingPreview(false);
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);
    setLivePreviewValue('Loading...');

    try {
      // TODO: Replace with your actual GraphQL client call
      // Example with a hypothetical `useGraphQLClient` hook:
      // const { client } = useGraphQLClient();
      // const response = await client.request(
      //   RESOLVE_PROMPT_VARIABLE_QUERY,
      //   {
      //     projectId: projectId,
      //     variableSource: tempVariableSource,
      //     promptVariableId: 'temp-id', // Use a temp ID for preview
      //   }
      // );
      // setLivePreviewValue(response.resolvePromptVariable || 'No data found');

      // Mocking a backend response for now
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      let mockValue = `[MOCK] Value for '${tempVariableName || 'selected data'}'`;
      if (tempVariableSource.type === 'PROJECT_FIELD' && tempVariableSource.field === 'name') mockValue = `Acme Corp Rebranding Project`;
      else if (tempVariableSource.type === 'USER_FIELD' && tempVariableSource.field === 'email') mockValue = `john.doe@example.com`;
      else if (tempVariableSource.type === 'TASKS_AGGREGATION' && tempVariableSource.aggregation === 'LIST_TITLES') mockValue = `• Design landing page\n• Develop API endpoints\n• Write marketing copy`;
      else if (tempVariableSource.type === 'TASKS_AGGREGATION' && tempVariableSource.aggregation === 'COUNT') mockValue = `12`;
      else if (tempVariableSource.type === 'DATE_FUNCTION') mockValue = new Date().toISOString().split('T')[0];
      else if (tempVariableDefaultValue) mockValue = tempVariableDefaultValue; // Use default value if present for preview


      setLivePreviewValue(mockValue);

    } catch (err: any) {
      console.error("Error fetching variable preview:", err);
      setPreviewError(`Failed to fetch preview: ${err.message || err.toString()}`);
      setLivePreviewValue('Error');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [projectId, tempVariableSource, tempVariableName, tempVariableDefaultValue]);

  // Debounce the live preview fetch
  const [debouncedTempVariableSource] = useDebounce(tempVariableSource, 500);
  useEffect(() => {
    // Only fetch preview if dialog is open, a project is selected, and a dynamic source exists
    if (open && debouncedTempVariableSource && projectId) {
      fetchLivePreview();
    } else if (open && projectId && !debouncedTempVariableSource) {
      // If no source is selected in explorer or it's a manual variable with no specific source
      if (currentStep === 'explore_data') {
        setLivePreviewValue('Select a data point to see a live preview.');
      } else { // manual_config
        setLivePreviewValue('N/A (manual variable, value set by default/user)');
      }
      setPreviewError(null);
      setIsLoadingPreview(false);
    } else if (open && !projectId && debouncedTempVariableSource) {
      // Scenario where a source is selected but no project context (should be caught earlier, but good for robustness)
      setLivePreviewValue('Cannot show live preview without a project ID.');
      setPreviewError('Missing project context.');
      setIsLoadingPreview(false);
    }
  }, [debouncedTempVariableSource, projectId, open, fetchLivePreview, currentStep]);


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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white">
        <DialogHeader className="p-0 border-b">
          <DialogTitle className="text-2xl">Variable Discovery & Builder</DialogTitle>
          <DialogDescription>
            Craft powerful prompts by leveraging project data or defining custom inputs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-2 grid grid-cols-2 gap-6">
          {/* Left Column: Discovery & Selection */}
          <div className="flex flex-col space-y-4 border-r pr-6">
            {/* Re-introducing the content that was in renderLeftPanelContent */}
            {!projectId && currentStep !== 'manual_config' ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-semibold mb-2">No Project Selected</p>
                <p className="mb-4">Dynamic Project Data Variables require an active project context.</p>
                <Button onClick={() => { setCurrentStep('manual_config'); setTempVariableSource(null); setTempVariableType(PromptVariableType.STRING); }}>Create Manual Variable Instead</Button>
              </div>
            ) : (
              <> {/* Use a React Fragment to group multiple top-level elements */}
                {currentStep === 'choose_type' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">What kind of variable do you want?</h3>
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
                      setSearchTerm(''); // Clear search when going back
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
                                key={`search-sugg-${s.placeholder + i}`} // More robust key
                                onSelect={() => {
                                  setTempVariableName(s.name);
                                  setTempVariablePlaceholder(s.placeholder);
                                  setTempVariableType(s.type);
                                  setTempVariableSource(s.source || null);
                                  setTempVariableDescription(s.description || '');
                                  setTempVariableDefaultValue(s.defaultValue || ''); // Set default if suggestion has one
                                  // Keep currentStep as explore_data, but update explorer selections
                                  // to reflect the chosen suggestion
                                  const categoryValue = s.source?.type?.toLowerCase().replace('_field', '').replace('_aggregation', '').replace('_list', '') || null;
                                  setSelectedCategoryInExplorer(categoryValue);
                                  setSelectedFieldInExplorer(s.source?.field || null);
                                  setSearchTerm(''); // Clear search after selection
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
                            <CommandGroup heading="Browse by Category">
                              {dataCategories.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                  <CommandItem
                                    key={cat.value}
                                    onSelect={() => {
                                      setSelectedCategoryInExplorer(cat.value);
                                      setSelectedFieldInExplorer(null); // Clear field when category changes
                                      // We don't change `currentStep` here, as the explorer view is already active
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
                            </CommandGroup>

                            {selectedCategoryInExplorer && (
                              <CommandGroup heading={`${dataCategories.find(c => c.value === selectedCategoryInExplorer)?.label} Fields`}>
                                {getFieldsForCategory(selectedCategoryInExplorer).map((fieldOption) => (
                                  <CommandItem
                                    key={fieldOption.value}
                                    onSelect={() => {
                                      setSelectedFieldInExplorer(fieldOption.value);
                                      // This will trigger the effect to update temp variable details
                                    }}
                                    className={cn(
                                      "cursor-pointer",
                                      selectedFieldInExplorer === fieldOption.value && "bg-accent text-accent-foreground"
                                    )}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedFieldInExplorer === fieldOption.value ? "opacity-100" : "opacity-0")} />
                                    {fieldOption.label}
                                    <span className="text-xs text-muted-foreground ml-auto">{fieldOption.type.replace(/_/g, ' ')}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
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
                    {/* The actual input fields for name, type, etc., are now consistently in the right panel */}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Configuration & Preview */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-xl font-semibold mb-2">Configure Your Variable</h3>
            <p className="text-sm text-muted-foreground">Finalize the details of your selected variable.</p>

            <div className="grid gap-4 flex-1 overflow-y-auto pr-2">
              <div className="grid gap-2">
                <label className="block text-sm font-medium">Variable Name <span className="text-red-500">*</span></label>
                <Input
                  value={tempVariableName}
                  onChange={(e) => setTempVariableName(e.target.value)}
                  placeholder="A descriptive name for your variable"
                  // Editable only if manual, or if it's a project data variable that allows custom naming
                  disabled={!!tempVariableSource && currentStep === 'explore_data'}
                />
                {tempVariableSource && currentStep === 'explore_data' && (
                  <p className="text-xs text-muted-foreground mt-1">Name is auto-generated for project data. Go back to change data selection.</p>
                )}
              </div>

              {/* Placeholder field block */}
              <div className="grid gap-2">
                <label className="block text-sm font-medium">Placeholder <span className="text-red-500">*</span></label>
                <Input
                  value={tempVariablePlaceholder}
                  readOnly={!!tempVariableSource || currentStep !== 'manual_config'}
                  className="font-mono text-sm"
                  placeholder="e.g., {{project_name}}"
                  onChange={(e) => {
                    if (currentStep === 'manual_config') {
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
              <div className="mt-4 p-3 border rounded-md bg-gray-50 dark:bg-gray-800"> {/* Added dark mode support */}
                <h4 className="font-semibold text-sm mb-2">Live Preview {tempVariableSource ? '(Project Data)' : ''}</h4>
                {isLoadingPreview ? (
                  <p className="text-sm text-gray-500">Fetching live data...</p>
                ) : previewError ? (
                  <p className="text-sm text-red-500">{previewError}</p>
                ) : (
                  <pre className="text-sm font-mono whitespace-pre-wrap max-h-[100px] overflow-y-auto bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    {livePreviewValue}
                  </pre>
                )}
                {tempVariableSource && !projectId && (
                  <p className="text-red-500 text-xs mt-2">Cannot show live preview without a project ID. Select a project context.</p>
                )}
                {!tempVariableSource && (
                  <p className="text-sm text-muted-foreground mt-2">No dynamic data source selected. Preview not applicable for manual variables (value comes from default/user input).</p>
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
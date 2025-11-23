// components/prompt-lab/variable-discovery-builder.tsx
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLazyQuery } from '@apollo/client';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { ArrowLeft, Keyboard, Database, ListChecks, Calendar, FileText, Users, Briefcase, Loader2, PlusCircle, XCircle, Wand2, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptVariable, PromptVariableType, PromptVariableSource, AggregationType, FormatType, FilterCondition, FilterOperator, SpecialFilterValue } from './store';
import { RESOLVE_PROMPT_VARIABLE_QUERY } from '@/graphql/queries/projectPromptVariablesQuerries';
import { usePromptDataLookups } from '@/hooks/usePromptDataLookups';

function generatePlaceholder(name: string): string {
  if (!name) return '';
  const cleaned = name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '');
  return `{{${cleaned}}}`;
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


// =================================================================
// MAIN COMPONENT
// =================================================================
export function VariableDiscoveryBuilder({ open, onOpenChange, onCreate, projectId, workspaceId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (variable: Omit<PromptVariable, 'id'>) => void;
  projectId?: string;
  workspaceId?: string;
}) {
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState<'choose_type' | 'explore_data' | 'manual_config'>('choose_type');

  // Builder state for dynamic variables
  const [entity, setEntity] = useState<PromptVariableSource['entityType'] | null>(null);
  const [retrievalType, setRetrievalType] = useState<'field' | 'aggregation' | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [aggregation, setAggregation] = useState<AggregationType | null>(null);
  const [aggregationField, setAggregationField] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [format, setFormat] = useState<FormatType | null>(null);

  // Final configuration state
  const [name, setName] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromptVariableType | null>(null);
  const [defaultValue, setDefaultValue] = useState('');

  // --- DATA FETCHING & DEFINITIONS ---
  const { dataCategories, getEntityDefinition } = useEntityDefinitions();
  const entityDef = useMemo(() => entity ? getEntityDefinition(entity) : null, [entity, getEntityDefinition]);

  // --- LIVE PREVIEW ---
  const [sourceForPreview, setSourceForPreview] = useState<PromptVariableSource | null>(null);
  const [debouncedSource] = useDebounce(sourceForPreview, 500);
  const [fetchPreview, { data: previewData, loading: isLoadingPreview, error: previewErrorObj }] = useLazyQuery(RESOLVE_PROMPT_VARIABLE_QUERY);

  useEffect(() => {
    if (debouncedSource && (projectId || workspaceId)) {
      fetchPreview({ variables: { projectId, workspaceId, variableSource: debouncedSource } });
    }
  }, [debouncedSource, projectId, workspaceId, fetchPreview]);


  // --- LOGIC & SIDE EFFECTS ---
  const resetBuilderState = () => {
    setEntity(null);
    setRetrievalType(null);
    setField(null);
    setAggregation(null);
    setAggregationField(null);
    setFilters([]);
    setFormat(null);
  };

  const resetAllState = () => {
    resetBuilderState();
    setName('');
    setPlaceholder('');
    setDescription('');
    setType(null);
    setDefaultValue('');
    setSourceForPreview(null);
  };

  useEffect(() => {
    if (!open) {
      setTimeout(resetAllState, 200); // Reset after dialog close animation
    } else {
      setStep((!projectId && !workspaceId) ? 'manual_config' : 'choose_type');
    }
  }, [open, projectId, workspaceId]);


  // Synthesize final configuration from builder state
  useEffect(() => {
    if (step !== 'explore_data') return;

    let newName = '';
    let newPlaceholder = '';
    let newType: PromptVariableType | null = null;
    let newDescription = '';
    let newSource: PromptVariableSource | null = null;

    if (entity && entityDef && retrievalType) {
      const source: PromptVariableSource = { entityType: entity };
      if (filters.length > 0) source.filters = filters;

      if (retrievalType === 'field' && field) {
        const fieldDef = entityDef.fields.find(f => f.value === field);
        if (fieldDef) {
          newName = `${entityDef.label}: ${fieldDef.label}`;
          newPlaceholder = generatePlaceholder(`${entityDef.label} ${fieldDef.label}`);
          newType = fieldDef.type;
          newDescription = fieldDef.description;
          source.field = field;
        }
      } else if (retrievalType === 'aggregation' && aggregation) {
        const aggDef = entityDef.aggregations.find(a => a.value === aggregation);
        if (aggDef) {
          newName = `${entityDef.label}: ${aggDef.label}`;
          newDescription = aggDef.description;
          newType = aggDef.resultType;
          source.aggregation = aggregation;

          if (aggDef.requiresField) {
            if (aggregationField) {
              const aggFieldDef = entityDef.fields.find(f => f.value === aggregationField);
              newName += ` of ${aggFieldDef?.label || 'Field'}`;
              source.aggregationField = aggregationField;
            } else {
              newName += ` of... (select field)`;
            }
          }
          if (newType === PromptVariableType.LIST_OF_STRINGS) {
            source.format = format || FormatType.BULLET_POINTS;
          }
          newPlaceholder = generatePlaceholder(newName);
        }
      }
      newSource = source;
    }
    setName(newName);
    setPlaceholder(newPlaceholder);
    setType(newType);
    setDescription(newDescription);
    setSourceForPreview(newSource);
  }, [entity, entityDef, retrievalType, field, aggregation, aggregationField, filters, format, step]);

  // Handle manual config placeholder generation
  useEffect(() => {
    if (step === 'manual_config') {
      setPlaceholder(generatePlaceholder(name));
      setType(PromptVariableType.STRING);
      resetBuilderState();
    }
  }, [name, step]);

  const handleCreate = () => {
    if (!name || !placeholder || !type) {
      toast.error("Name, Placeholder, and Type are required.");
      return;
    }
    onCreate({
      name,
      placeholder,
      description,
      type,
      defaultValue,
      source: step === 'explore_data' ? sourceForPreview : null,
    });
    onOpenChange(false);
  };
  
  const isFormValid = !!name && !!placeholder && !!type && (step === 'manual_config' || (entity && retrievalType && (field || aggregation)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl">Variable Builder</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          {/* LEFT: BUILDER */}
          <div className="flex flex-col space-y-4 border-r pr-6 overflow-y-auto">
            {step === 'choose_type' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">What kind of variable do you want?</h3>
                <SelectionCard icon={Database} title="Dynamic Project Data" description="Pull live data from your projects, tasks, sprints, and more." onClick={() => setStep('explore_data')} />
                <SelectionCard icon={Keyboard} title="Manual Input" description="A simple placeholder for manual text entry." onClick={() => setStep('manual_config')} />
              </div>
            )}

            {(step === 'explore_data' || step === 'manual_config') && (
              <>
                <Button variant="ghost" onClick={() => { setStep('choose_type'); resetAllState(); }} className="self-start -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Types
                </Button>

                {step === 'explore_data' ? (
                  <div className="space-y-6">
                    {/* Step 1: Select Entity */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-700">1. Select Data Source</h4>
                      <Select value={entity || ''} onValueChange={val => { resetBuilderState(); setEntity(val as any); }}>
                        <SelectTrigger><SelectValue placeholder="Choose an entity..." /></SelectTrigger>
                        <SelectContent>
                          {dataCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value} disabled={cat.disabled}>
                              <div className="flex items-center">{React.createElement(cat.icon, { className: 'h-4 w-4 mr-2' })} {cat.label}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 2: Select Retrieval Type */}
                    {entity && entityDef && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">2. Choose What to Get</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setRetrievalType('field')} className={cn("p-4 border rounded-md text-left", retrievalType === 'field' && 'border-primary ring-2 ring-primary')}>
                                <Rows3 className="h-5 w-5 mb-1"/>
                                <h5 className="font-semibold">Get a list of values</h5>
                                <p className="text-xs text-muted-foreground">e.g., a list of all task titles</p>
                            </button>
                            <button onClick={() => setRetrievalType('aggregation')} className={cn("p-4 border rounded-md text-left", retrievalType === 'aggregation' && 'border-primary ring-2 ring-primary')}>
                                <Wand2 className="h-5 w-5 mb-1"/>
                                <h5 className="font-semibold">Calculate a summary</h5>
                                <p className="text-xs text-muted-foreground">e.g., count of completed tasks</p>
                            </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2a: Fields / Aggregations */}
                    {retrievalType === 'field' && entityDef && (
                        <Select value={field || ''} onValueChange={setField}>
                            <SelectTrigger><SelectValue placeholder="Select a field..." /></SelectTrigger>
                            <SelectContent>{entityDef.fields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    {retrievalType === 'aggregation' && entityDef && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Select value={aggregation || ''} onValueChange={setAggregation}>
                                <SelectTrigger><SelectValue placeholder="Select calculation..." /></SelectTrigger>
                                <SelectContent>{entityDef.aggregations.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                            </Select>
                            {entityDef.aggregations.find(a => a.value === aggregation)?.requiresField && (
                                <Select value={aggregationField || ''} onValueChange={setAggregationField}>
                                    <SelectTrigger><SelectValue placeholder="...of field..." /></SelectTrigger>
                                    <SelectContent>{entityDef.fields.filter(f => f.type === 'NUMBER' || f.type === 'STRING').map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {/* Step 3: Filters */}
                    {entity && entityDef && (retrievalType) && (
                        <FilterBuilder entityDef={entityDef} filters={filters} setFilters={setFilters} projectId={projectId} workspaceId={workspaceId} />
                    )}

                    {/* Step 4: Formatting */}
                    {type === PromptVariableType.LIST_OF_STRINGS && (
                         <div className="space-y-2">
                            <h4 className="font-semibold text-gray-700">4. Format Output</h4>
                             <Select value={format || ''} onValueChange={val => setFormat(val as FormatType)}>
                                <SelectTrigger><SelectValue placeholder="Select a format..." /></SelectTrigger>
                                <SelectContent>
                                    {Object.values(FormatType).map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">This variable will be a simple placeholder. You will provide its value when using the prompt.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT: CONFIGURATION & PREVIEW */}
          <div className="flex flex-col space-y-4 overflow-y-auto">
            <h3 className="text-lg font-semibold">Configuration</h3>
            
            {step === 'explore_data' && sourceForPreview && (
                <div className="p-3 border rounded-md bg-muted/50 text-sm">
                    <h4 className="font-semibold mb-2">Query Summary</h4>
                    <p className="text-muted-foreground">
                        Getting the <strong className="text-primary">{aggregation ? aggregation.toLowerCase().replace(/_/g, ' ') : `list of ${field || '...'}`}</strong> of <strong className="text-primary">{entityDef?.label}</strong>
                        {filters.length > 0 && ` where:`}
                    </p>
                    {filters.length > 0 && (
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
                            {filters.map((f, i) => <li key={i}><strong className="text-primary">{f.field}</strong> {f.operator.toLowerCase().replace(/_/g, ' ')} <strong className="text-primary">{f.specialValue || `'${f.value}'`}</strong></li>)}
                        </ul>
                    )}
                </div>
            )}

            <div className="grid gap-4 flex-1 pr-2">
                <div>
                    <label className="text-sm font-medium">Variable Name <span className="text-red-500">*</span></label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Completed Task Titles" />
                </div>
                <div>
                    <label className="text-sm font-medium">Placeholder <span className="text-red-500">*</span></label>
                    <Input value={placeholder} readOnly className="font-mono bg-gray-100" />
                </div>
                <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain what this variable is" />
                </div>
                <div>
                    <label className="text-sm font-medium">Default Value <span className="text-xs text-muted-foreground">(optional)</span></label>
                    <Input value={defaultValue} onChange={e => setDefaultValue(e.target.value)} placeholder="Used if live data is unavailable" />
                </div>

                 <div className="mt-2 p-3 border rounded-md bg-gray-50">
                    <h4 className="font-semibold text-sm mb-2">Live Preview</h4>
                    {isLoadingPreview ? (
                      <p className="text-sm text-gray-500 flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</p>
                    ) : previewErrorObj ? (
                      <p className="text-sm text-red-500">{previewErrorObj.message}</p>
                    ) : (step === 'explore_data' && sourceForPreview) ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap max-h-24 overflow-y-auto bg-white p-2 rounded border">
                        {previewData?.resolvePromptVariable || defaultValue || 'No data returned.'}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">Preview requires a dynamic data source.</p>
                    )}
                 </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isFormValid}>Add Variable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// =================================================================
// SUB-COMPONENTS & HOOKS
// =================================================================

function FilterBuilder({ entityDef, filters, setFilters, projectId, workspaceId }: {
    entityDef: NonNullable<ReturnType<ReturnType<typeof useEntityDefinitions>['getEntityDefinition']>>,
    filters: FilterCondition[],
    setFilters: React.Dispatch<React.SetStateAction<FilterCondition[]>>,
    projectId?: string,
    workspaceId?: string,
}) {
    const { loading, error } = usePromptDataLookups({ projectId, workspaceId, selectedEntityType: entityDef.value });
    const addFilter = () => setFilters(prev => [...prev, { field: '', operator: FilterOperator.EQ, type: PromptVariableType.STRING }]);
    const removeFilter = (index: number) => setFilters(prev => prev.filter((_, i) => i !== index));
    const updateFilter = (index: number, newFilter: Partial<FilterCondition>) => {
        setFilters(prev => prev.map((f, i) => i === index ? { ...f, ...newFilter } : f));
    };

    if (!entityDef.filters || entityDef.filters.length === 0) return null;
    
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-700">3. Refine with Filters <span className="text-xs font-normal text-muted-foreground">(optional)</span></h4>
                <Button variant="ghost" size="sm" onClick={addFilter}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>
            </div>
            {loading && <p className="text-xs text-muted-foreground">Loading filter options...</p>}
            {error && <p className="text-xs text-red-500">Error loading options: {error.message}</p>}
            <div className="space-y-2">
                {filters.map((filter, index) => (
                    <FilterRow key={index} index={index} filter={filter} entityDef={entityDef} onUpdate={updateFilter} onRemove={removeFilter} />
                ))}
            </div>
        </div>
    );
}

function FilterRow({ index, filter, entityDef, onUpdate, onRemove }: {
    index: number,
    filter: FilterCondition,
    entityDef: NonNullable<ReturnType<ReturnType<typeof useEntityDefinitions>['getEntityDefinition']>>,
    onUpdate: (index: number, newFilter: Partial<FilterCondition>) => void,
    onRemove: (index: number) => void
}) {
    const { sprints, members } = usePromptDataLookups({ selectedEntityType: entityDef.value });
    const filterDef = entityDef.filters.find(f => f.field === filter.field);
    const handleFieldChange = (value: string) => {
        const newDef = entityDef.filters.find(f => f.field === value);
        onUpdate(index, { field: value, operator: newDef?.operators[0] || FilterOperator.EQ, type: newDef?.type, value: undefined, specialValue: undefined });
    };

    const handleOperatorChange = (value: string) => {
        if (value === SpecialFilterValue.CURRENT_USER || value === SpecialFilterValue.ACTIVE_SPRINT) {
            onUpdate(index, { operator: FilterOperator.EQ, specialValue: value as SpecialFilterValue, value: undefined });
        } else {
            onUpdate(index, { operator: value as FilterOperator, specialValue: undefined });
        }
    };
    
    const lookupOptions = useMemo(() => {
        if (!filterDef?.lookupEntity) return [];
        if (filterDef.lookupEntity === 'MEMBER') return members.map(m => ({ id: m.user.id, name: `${m.user.firstName} ${m.user.lastName}`.trim() }));
        if (filterDef.lookupEntity === 'SPRINT') return sprints.map(s => ({ id: s.id, name: s.name }));
        return [];
    }, [filterDef, members, sprints]);

    return (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center p-2 bg-gray-50 rounded">
            <Select value={filter.field} onValueChange={handleFieldChange}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Field..." /></SelectTrigger>
                <SelectContent>{entityDef.filters.map(f => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}</SelectContent>
            </Select>

            <Select value={filter.specialValue || filter.operator} onValueChange={handleOperatorChange}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{filterDef?.operators.map(op => <SelectItem key={op} value={op}>{op.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>

            {!filter.specialValue && (
                filterDef?.lookupEntity ?
                    <Select value={String(filter.value || '')} onValueChange={v => onUpdate(index, { value: v })}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{lookupOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}</SelectContent>
                    </Select> :
                filterDef?.options ?
                    <Select value={String(filter.value || '')} onValueChange={v => onUpdate(index, { value: v })}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{filterDef.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select> :
                    <Input type={filter.type === 'DATE' ? 'date' : 'text'} value={String(filter.value || '')} onChange={e => onUpdate(index, { value: e.target.value })} className="text-xs h-8"/>
            )}
            {filter.specialValue && <div className="text-xs text-muted-foreground italic h-8 flex items-center">(auto)</div>}

            <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-8 w-8"><XCircle className="h-4 w-4 text-red-500" /></Button>
        </div>
    );
}


function useEntityDefinitions() {
    const dataCategories = useMemo(() => [
        { value: 'PROJECT', label: 'Project', icon: Briefcase, disabled: false },
        { value: 'TASK', label: 'Tasks', icon: ListChecks, disabled: false },
        { value: 'SPRINT', label: 'Sprints', icon: Calendar, disabled: false },
        { value: 'DOCUMENT', label: 'Documents', icon: FileText, disabled: false },
        { value: 'MEMBER', label: 'Members', icon: Users, disabled: false },
        { value: 'USER', label: 'Me (Current User)', icon: Users, disabled: false },
        { value: 'DATE_FUNCTION', label: 'Date Functions', icon: Calendar, disabled: false },
    ], []);

    const getEntityDefinition = useCallback((entityType: PromptVariableSource['entityType']) => {
        const base = { value: entityType, label: dataCategories.find(c => c.value === entityType)?.label || 'Unknown', fields: [], aggregations: [], filters: [] };
        switch (entityType) {
            case 'PROJECT': return { ...base, fields: [
                { value: 'name', label: 'Project Name', type: PromptVariableType.STRING, description: 'The name of the current project.' },
                { value: 'description', label: 'Project Description', type: PromptVariableType.RICH_TEXT, description: 'The detailed description of the current project.' },
            ]};
            case 'TASK': return { ...base,
                fields: [
                    { value: 'title', label: 'Title', type: PromptVariableType.STRING, description: 'The title of the task.' },
                    { value: 'status', label: 'Status', type: PromptVariableType.STRING, description: 'The status of the task (e.g., TODO, DONE).' },
                    { value: 'priority', label: 'Priority', type: PromptVariableType.STRING, description: 'The priority of the task (LOW, MEDIUM, HIGH).' },
                    { value: 'dueDate', label: 'Due Date', type: PromptVariableType.DATE, description: 'The due date of the task.' },
                    { value: 'points', label: 'Points', type: PromptVariableType.NUMBER, description: 'Story points assigned to the task.' },
                ],
                aggregations: [
                    { value: AggregationType.COUNT, label: 'Count', resultType: PromptVariableType.NUMBER, description: 'Total number of tasks.' },
                    { value: AggregationType.SUM, label: 'Sum', resultType: PromptVariableType.NUMBER, requiresField: true, description: 'Sum of a numeric field for all tasks.' },
                    { value: AggregationType.LIST_FIELD_VALUES, label: 'List Values', resultType: PromptVariableType.LIST_OF_STRINGS, requiresField: true, description: 'A list of values from a specific field.' },
                ],
                filters: [
                    { field: 'status', label: 'Status', type: PromptVariableType.STRING, options: ['TODO', 'DONE'], operators: [FilterOperator.EQ, FilterOperator.NEQ] },
                    { field: 'priority', label: 'Priority', type: PromptVariableType.STRING, options: ['LOW', 'MEDIUM', 'HIGH'], operators: [FilterOperator.EQ, FilterOperator.NEQ] },
                    { field: 'assigneeId', label: 'Assignee', type: PromptVariableType.STRING, lookupEntity: 'MEMBER', operators: [FilterOperator.EQ, FilterOperator.NEQ, SpecialFilterValue.CURRENT_USER] },
                    { field: 'sprintId', label: 'Sprint', type: PromptVariableType.STRING, lookupEntity: 'SPRINT', operators: [FilterOperator.EQ, FilterOperator.NEQ, SpecialFilterValue.ACTIVE_SPRINT] },
                ]
            };
            case 'SPRINT': return { ...base, fields: [ { value: 'name', label: 'Sprint Name', type: PromptVariableType.STRING, description: 'Name of the sprint.' } ] };
            case 'DOCUMENT': return { ...base, fields: [ { value: 'title', label: 'Document Title', type: PromptVariableType.STRING, description: 'Title of the document.' }, { value: 'content', label: 'Document Content', type: PromptVariableType.RICH_TEXT, description: 'Content of the document.' } ] };
            case 'MEMBER': return { ...base, fields: [ { value: 'user.firstName', label: 'First Name', type: PromptVariableType.STRING, description: 'First name of the member.' } ] };
            case 'USER': return { ...base, fields: [ { value: 'email', label: 'My Email', type: PromptVariableType.STRING, description: 'Email of the current user.' } ] };
            case 'DATE_FUNCTION': return { ...base, fields: [ { value: 'today', label: 'Today\'s Date', type: PromptVariableType.DATE, description: 'The current date.' } ] };
            default: return base;
        }
    }, [dataCategories]);

    return { dataCategories, getEntityDefinition };
}
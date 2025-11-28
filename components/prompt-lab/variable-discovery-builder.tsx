//components/prompt-lab/variable-discovery-builder.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLazyQuery } from '@apollo/client';
import { useDebounce } from 'use-debounce';
import { 
  Database, ListChecks, Calendar, FileText, Users, Briefcase, 
  Loader2, Plus, X, Wand2, Rows3, PlayCircle, Settings2,
  Keyboard, Type, Hash, CalendarDays, CheckCircle2, AlertCircle, Target, User, Search, CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Reuse your existing types/store imports
import { PromptVariable, PromptVariableType, PromptVariableSource, AggregationType, FormatType, FilterCondition, FilterOperator, SpecialFilterValue } from './store';
import { RESOLVE_PROMPT_VARIABLE_QUERY } from '@/graphql/queries/projectPromptVariablesQuerries';
import { usePromptDataLookups } from '@/hooks/usePromptDataLookups';
import { useEntityDefinitions } from '@/hooks/useEntityDefinitions';

// --- HELPER: Generate clean placeholder ---
function generatePlaceholder(name: string): string {
  if (!name) return '';
  const cleaned = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `{{${cleaned}}}`;
}

// --- TYPES FOR PRESETS ---
interface VariablePreset {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  config: {
    mode: 'dynamic' | 'manual';
    // Dynamic props
    entity?: PromptVariableSource['entityType'];
    retrievalType?: 'field' | 'aggregation';
    field?: string;
    aggregation?: AggregationType;
    aggregationField?: string;
    filters?: FilterCondition[];
    // Shared props
    type: PromptVariableType;
    defaultValue?: string;
  };
}

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
  // LOG: Init
  useEffect(() => {
    if(open) {
      console.log('🔥🔥 [VariableDiscoveryBuilder] MOUNT/OPEN 🔥🔥');
      console.log('Props:', { projectId, workspaceId });
    }
  }, [open, projectId, workspaceId]);

  const [activeTab, setActiveTab] = useState<'library' | 'builder'>('library');
  const [builderMode, setBuilderMode] = useState<'dynamic' | 'manual'>('dynamic');
  
  // --- BUILDER STATE (DYNAMIC) ---
  const [entity, setEntity] = useState<PromptVariableSource['entityType'] | null>(null);
  const [retrievalType, setRetrievalType] = useState<'field' | 'aggregation'>('field');
  const [field, setField] = useState<string | null>(null);
  const [aggregation, setAggregation] = useState<AggregationType | null>(null);
  const [aggregationField, setAggregationField] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [format, setFormat] = useState<FormatType>(FormatType.BULLET_POINTS);

  // --- ITEM PICKER STATE ---
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

  // --- BUILDER STATE (MANUAL) ---
  const [manualType, setManualType] = useState<PromptVariableType>(PromptVariableType.STRING);

  // --- FINAL CONFIG STATE ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  
  // LOG: Detailed State Tracking
  useEffect(() => {
    if(!open) return;
    console.log('⚡ [VariableDiscoveryBuilder] STATE UPDATE ⚡', {
      activeTab,
      builderMode,
      entity,
      retrievalType,
      field,
      aggregation,
      filtersCount: filters.length,
      name
    });
  }, [activeTab, builderMode, entity, retrievalType, field, aggregation, filters, name, open]);

  // --- HOOKS ---
  const { dataCategories, getEntityDefinition } = useEntityDefinitions();
  const entityDef = useMemo(() => entity ? getEntityDefinition(entity) : null, [entity, getEntityDefinition]);

  // --- LIVE PREVIEW ---
  const [sourceForPreview, setSourceForPreview] = useState<PromptVariableSource | null>(null);
  const [debouncedSource] = useDebounce(sourceForPreview, 800);
  
  const [fetchPreview, { data: previewData, loading: isLoadingPreview, error: previewError }] = useLazyQuery(RESOLVE_PROMPT_VARIABLE_QUERY, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true
  });

  // LOG: Preview Fetching
  useEffect(() => {
    if (debouncedSource) {
      console.log('👀 [VariableDiscoveryBuilder] Fetching Preview for:', debouncedSource);
    }
  }, [debouncedSource]);

  useEffect(() => {
    if (previewData) console.log('✅ [VariableDiscoveryBuilder] Preview Data Recieved:', previewData);
    if (previewError) console.error('❌ [VariableDiscoveryBuilder] Preview Error:', previewError);
  }, [previewData, previewError]);

  // --- PRESETS DEFINITION ---
  const PRESETS: VariablePreset[] = [
    // --- AGILE & TASKS ---
    {
      id: 'active_sprint_tasks',
      title: 'Active Sprint Tasks',
      description: 'List of all incomplete tasks in the current sprint.',
      icon: CalendarDays,
      config: {
        mode: 'dynamic',
        entity: 'TASK',
        retrievalType: 'field',
        field: 'title',
        type: PromptVariableType.LIST_OF_STRINGS,
        filters: [
          { field: 'status', operator: FilterOperator.NEQ, value: 'DONE', type: PromptVariableType.STRING },
          { field: 'sprintId', operator: FilterOperator.EQ, specialValue: SpecialFilterValue.ACTIVE_SPRINT, type: PromptVariableType.STRING }
        ]
      }
    },
    {
      id: 'my_tasks',
      title: 'My Assigned Tasks',
      description: 'Tasks assigned to me that are not done.',
      icon: CheckCircle2,
      config: {
        mode: 'dynamic',
        entity: 'TASK',
        retrievalType: 'field',
        field: 'title',
        type: PromptVariableType.LIST_OF_STRINGS,
        filters: [
          { field: 'status', operator: FilterOperator.NEQ, value: 'DONE', type: PromptVariableType.STRING },
          { field: 'assigneeId', operator: FilterOperator.EQ, specialValue: SpecialFilterValue.CURRENT_USER, type: PromptVariableType.STRING }
        ]
      }
    },
    {
      id: 'high_priority_bugs',
      title: 'High Priority Items',
      description: 'List of all high priority tasks.',
      icon: AlertCircle,
      config: {
        mode: 'dynamic',
        entity: 'TASK',
        retrievalType: 'field',
        field: 'title',
        type: PromptVariableType.LIST_OF_STRINGS,
        filters: [
          { field: 'status', operator: FilterOperator.NEQ, value: 'DONE', type: PromptVariableType.STRING },
          { field: 'priority', operator: FilterOperator.EQ, value: 'HIGH', type: PromptVariableType.STRING }
        ]
      }
    },
    // --- METRICS ---
    {
      id: 'completed_points',
      title: 'Completed Points',
      description: 'Total story points completed in this project.',
      icon: Hash,
      config: {
        mode: 'dynamic',
        entity: 'TASK',
        retrievalType: 'aggregation',
        aggregation: AggregationType.SUM,
        aggregationField: 'points',
        type: PromptVariableType.NUMBER,
        filters: [
          { field: 'status', operator: FilterOperator.EQ, value: 'DONE', type: PromptVariableType.STRING }
        ]
      }
    },
    {
      id: 'sprint_velocity',
      title: 'Current Velocity',
      description: 'Sum of points completed in the active sprint.',
      icon: Target,
      config: {
        mode: 'dynamic',
        entity: 'TASK',
        retrievalType: 'aggregation',
        aggregation: AggregationType.SUM,
        aggregationField: 'points',
        type: PromptVariableType.NUMBER,
        filters: [
          { field: 'status', operator: FilterOperator.EQ, value: 'DONE', type: PromptVariableType.STRING },
          { field: 'sprintId', operator: FilterOperator.EQ, specialValue: SpecialFilterValue.ACTIVE_SPRINT, type: PromptVariableType.STRING }
        ]
      }
    },
    // --- CONTEXT ---
    {
      id: 'project_desc',
      title: 'Project Context',
      description: 'The full description of the current project.',
      icon: Briefcase,
      config: {
        mode: 'dynamic',
        entity: 'PROJECT',
        retrievalType: 'field',
        field: 'description',
        type: PromptVariableType.RICH_TEXT
      }
    },
    {
      id: 'team_roster',
      title: 'Team Roster',
      description: 'List of all members in this project.',
      icon: Users,
      config: {
        mode: 'dynamic',
        entity: 'MEMBER',
        retrievalType: 'field',
        field: 'user.firstName',
        type: PromptVariableType.LIST_OF_STRINGS
      }
    },
    {
      id: 'doc_titles',
      title: 'Documentation Index',
      description: 'List of all document titles.',
      icon: FileText,
      config: {
        mode: 'dynamic',
        entity: 'DOCUMENT',
        retrievalType: 'field',
        field: 'title',
        type: PromptVariableType.LIST_OF_STRINGS
      }
    },
    // --- MANUAL INPUTS ---
    {
      id: 'manual_tone',
      title: 'Tone of Voice',
      description: 'Manual input for the desired AI tone.',
      icon: Settings2,
      config: {
        mode: 'manual',
        type: PromptVariableType.STRING,
        defaultValue: 'Professional and Concise'
      }
    },
    {
      id: 'manual_audience',
      title: 'Target Audience',
      description: 'Manual input for who is reading this.',
      icon: User,
      config: {
        mode: 'manual',
        type: PromptVariableType.STRING,
        defaultValue: 'Stakeholders'
      }
    },
     {
      id: 'manual_generic',
      title: 'Generic Text Input',
      description: 'A standard fill-in-the-blank field.',
      icon: Type,
      config: {
        mode: 'manual',
        type: PromptVariableType.STRING,
      }
    }
  ];

  // --- EFFECTS ---

  // 1. Reset on open
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setEntity(null);
        setFilters([]);
        setName('');
        setActiveTab('library');
        setBuilderMode('dynamic');
        setSourceForPreview(null);
      }, 200);
    }
  }, [open]);

  // LOG FOR PICKER OPENING
  useEffect(() => {
    if (isItemPickerOpen) {
        console.log('--------------------------------------------------');
        console.log('📌 [VariableDiscoveryBuilder] Opening Item Picker');
        console.log('   Entity:', entity);
        console.log('   Filters:', filters);
        console.log('--------------------------------------------------');
    }
  }, [isItemPickerOpen, entity, filters]);

  // 2. Fetch Preview (Only for Dynamic)
  useEffect(() => {
    if (builderMode === 'dynamic' && debouncedSource && (projectId || workspaceId)) {
      fetchPreview({ variables: { projectId, workspaceId, variableSource: debouncedSource } });
    }
  }, [debouncedSource, projectId, workspaceId, fetchPreview, builderMode]);

  // 3. Construct Source Object & Name Auto-Generation
  useEffect(() => {
    if (builderMode === 'manual') {
      setSourceForPreview(null);
      return;
    }

    if (!entity || !entityDef) {
      setSourceForPreview(null);
      return;
    }

    const source: PromptVariableSource = { entityType: entity };
    let suggestedName = "";
    
    // Check if ID filter is present (Specific Items)
    const specificItemFilter = filters.find(f => f.field === 'id' && f.operator === FilterOperator.IN_LIST);

    // Build Source
    if (retrievalType === 'field' && field) {
      source.field = field;
      const fDef = entityDef.fields.find(f => f.value === field);
      
      if (specificItemFilter) {
          suggestedName = `Selected ${entityDef.label}s (${fDef?.label || field})`;
      } else {
          suggestedName = `All ${entityDef.label} ${fDef?.label || field}`;
      }
    } 
    else if (retrievalType === 'aggregation' && aggregation) {
      source.aggregation = aggregation;
      const aggDef = entityDef.aggregations.find(a => a.value === aggregation);
      suggestedName = `${aggDef?.label || aggregation} of ${entityDef.label}`;

      if (aggDef?.requiresField && aggregationField) {
        source.aggregationField = aggregationField;
        const fDef = entityDef.fields.find(f => f.value === aggregationField);
        suggestedName += ` (${fDef?.label || aggregationField})`;
      }
    }

    if (filters.length > 0) source.filters = filters;
    if (retrievalType === 'field') source.format = format;

    // Only auto-update name if user hasn't typed a custom one
    if (!name || name.startsWith("All ") || name.startsWith("Count ") || name.startsWith("Sum ") || name.startsWith("Selected ")) {
      setName(suggestedName);
    }

    setSourceForPreview(source);

  }, [entity, retrievalType, field, aggregation, aggregationField, filters, format, entityDef, builderMode]);


  // --- HANDLERS ---
  const handleApplyPreset = (preset: VariablePreset) => {
    console.log('🔘 [VariableDiscoveryBuilder] Applying Preset:', preset.id);
    setBuilderMode(preset.config.mode);
    setName(preset.title);
    setDescription(preset.description);
    setDefaultValue(preset.config.defaultValue || '');

    if (preset.config.mode === 'dynamic') {
      setEntity(preset.config.entity!);
      setRetrievalType(preset.config.retrievalType!);
      setField(preset.config.field || null);
      setAggregation(preset.config.aggregation || null);
      setAggregationField(preset.config.aggregationField || null);
      setFilters(preset.config.filters || []); 
    } else {
      setManualType(preset.config.type);
    }
    
    setActiveTab('builder');
  };

  const handleCreate = () => {
    console.log('🚀 [VariableDiscoveryBuilder] Creating Variable. Name:', name);
    if (!name) return;
    
    let finalType = manualType;
    let finalSource: PromptVariableSource | null = null;

    if (builderMode === 'dynamic') {
      if (!entity) return;
      finalSource = sourceForPreview;
      
      // Determine final type for dynamic
      if (retrievalType === 'field') finalType = PromptVariableType.LIST_OF_STRINGS;
      else if (retrievalType === 'aggregation') {
         const aggDef = entityDef?.aggregations.find(a => a.value === aggregation);
         if (aggDef) finalType = aggDef.resultType;
      }
    }

    const payload = {
      name,
      placeholder: generatePlaceholder(name),
      description,
      type: finalType,
      defaultValue,
      source: finalSource,
    };
    
    console.log('📦 [VariableDiscoveryBuilder] Payload:', payload);
    onCreate(payload);
    onOpenChange(false);
  };
  
  // Handle adding specific IDs from the modal
  const handleAddSpecificItems = (ids: string[]) => {
      console.log('📌 [VariableDiscoveryBuilder] Adding Specific Items:', ids);
      // Remove existing ID filter if present
      const newFilters = filters.filter(f => f.field !== 'id');
      
      if (ids.length > 0) {
          newFilters.push({
              field: 'id',
              operator: FilterOperator.IN_LIST,
              value: ids, 
              type: PromptVariableType.LIST_OF_STRINGS
          });
      }
      setFilters(newFilters);
      setIsItemPickerOpen(false);
  };

  const currentPlaceholder = generatePlaceholder(name);
  
  const isValid = useMemo(() => {
    if (!name) return false;
    if (builderMode === 'manual') return true;
    return !!entity && (retrievalType === 'field' ? !!field : !!aggregation);
  }, [name, builderMode, entity, retrievalType, field, aggregation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 flex flex-col bg-white overflow-hidden text-slate-900 shadow-2xl rounded-xl">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white z-10">
          <div>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">New Prompt Variable</DialogTitle>
            <DialogDescription className="mt-1 text-slate-500">Add dynamic data or input fields to your prompt context.</DialogDescription>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="library" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Library</TabsTrigger>
              <TabsTrigger value="builder" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Builder</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: CONTENT */}
          <div className={cn("flex-1 overflow-y-auto transition-all duration-300 bg-white", (builderMode === 'dynamic' && activeTab === 'builder') ? "w-[60%]" : "w-full")}>
            
            {/* TAB: LIBRARY */}
            {activeTab === 'library' && (
               <div className="p-8">
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Popular Presets</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/40 hover:shadow-sm transition-all text-left group"
                      >
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors", 
                            preset.config.mode === 'dynamic' ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100" : "bg-amber-50 text-amber-600 group-hover:bg-amber-100"
                        )}>
                          <preset.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{preset.title}</h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{preset.description}</p>
                          <Badge variant="outline" className="mt-2 text-[10px] h-5 px-1.5 bg-transparent border-slate-200 text-slate-400 font-normal">
                            {preset.config.mode === 'dynamic' ? 'Dynamic Data' : 'Manual Input'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                 </div>
               </div>
            )}

            {/* TAB: BUILDER */}
            {activeTab === 'builder' && (
              <div className="p-8 space-y-8">
                
                {/* 0. MODE TOGGLE */}
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                        <button 
                            onClick={() => setBuilderMode('dynamic')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                builderMode === 'dynamic' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                            )}>
                            <Database className="h-4 w-4" /> Dynamic Data
                        </button>
                        <button 
                             onClick={() => setBuilderMode('manual')}
                             className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                builderMode === 'manual' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                            )}>
                            <Keyboard className="h-4 w-4" /> Manual Input
                        </button>
                    </div>
                </div>

                {/* --- DYNAMIC MODE CONTENT --- */}
                {builderMode === 'dynamic' && (
                  <>
                    <section>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">1. Source Data</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {dataCategories.map((cat) => (
                          <button
                            key={cat.value}
                            onClick={() => { 
                                console.log('🖱️ [VariableDiscoveryBuilder] Selected Entity:', cat.value);
                                // Aggressively reset all state when switching entities manually
                                setEntity(cat.value as any); 
                                setField(null); 
                                setFilters([]); 
                                setRetrievalType('field');
                                setAggregation(null);
                                setAggregationField(null);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all h-24 gap-2",
                              entity === cat.value 
                                ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" 
                                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            )}
                          >
                            {React.createElement(cat.icon, { className: cn("h-6 w-6", entity === cat.value ? "text-indigo-600" : "text-slate-400") })}
                            <span className={cn("text-xs font-medium", entity === cat.value ? "text-indigo-700" : "text-slate-600")}>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {entity && entityDef && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Separator className="bg-slate-100" />
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">2. What to retrieve?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={cn("p-4 rounded-xl border cursor-pointer transition-all bg-white", retrievalType === 'field' ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50")}
                                onClick={() => setRetrievalType('field')}>
                              <div className="flex items-center gap-2 mb-2">
                                <Rows3 className={cn("h-4 w-4", retrievalType === 'field' ? "text-indigo-600" : "text-slate-500")}/>
                                <span className="font-semibold text-slate-900">List of Values</span>
                              </div>
                              <Select value={field || ''} onValueChange={(v) => { console.log('Set Field:', v); setField(v); }}>
                                  <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Select field..." /></SelectTrigger>
                                  <SelectContent>{entityDef.fields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>

                            <div className={cn("p-4 rounded-xl border cursor-pointer transition-all bg-white", retrievalType === 'aggregation' ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50")}
                                onClick={() => setRetrievalType('aggregation')}>
                                <div className="flex items-center gap-2 mb-2">
                                <Wand2 className={cn("h-4 w-4", retrievalType === 'aggregation' ? "text-indigo-600" : "text-slate-500")}/>
                                <span className="font-semibold text-slate-900">Calculated Value</span>
                              </div>
                              <div className="flex gap-2">
                                <Select value={aggregation || ''} onValueChange={(v) => setAggregation(v as AggregationType)}>
                                    <SelectTrigger className="bg-white border-slate-200 w-[130px]"><SelectValue placeholder="Function" /></SelectTrigger>
                                    <SelectContent>{entityDef.aggregations.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                </Select>
                                {entityDef.aggregations.find(a => a.value === aggregation)?.requiresField && (
                                    <Select value={aggregationField || ''} onValueChange={setAggregationField}>
                                        <SelectTrigger className="bg-white border-slate-200 flex-1"><SelectValue placeholder="Field" /></SelectTrigger>
                                        <SelectContent>{entityDef.fields.filter(f => f.type === 'NUMBER').map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                )}
                              </div>
                            </div>
                        </div>
                      </section>
                      
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">3. Filters</h3>
                          <div className="flex gap-2">
                             {/* Specific Item Picker Trigger */}
                             {entityDef.filters.some(f => f.isItemPicker) && (
                                <Button 
                                    variant="outline" size="sm" 
                                    className="h-8 gap-1 rounded-full border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-white"
                                    onClick={() => setIsItemPickerOpen(true)}
                                >
                                    <CheckSquare className="h-3 w-3" /> Pick Specific {entityDef.label}s
                                </Button>
                             )}
                             {/* CHANGED: Using FilterAddDialog instead of Popover to fix Select close issues */}
                             <FilterAddDialog 
                                entityDef={entityDef} 
                                onAddFilter={(f) => {
                                    console.log('➕ [FilterAdd] Adding:', f);
                                    setFilters([...filters, f]);
                                }} 
                                projectId={projectId}
                                workspaceId={workspaceId}
                             />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[60px] items-center">
                            {filters.length === 0 && <span className="text-sm text-slate-400 italic pl-1">No filters applied</span>}
                            {filters.map((f, i) => (
                              <Badge key={i} variant="secondary" className="px-3 py-1 text-sm flex gap-2 items-center bg-white border-slate-200 shadow-sm text-slate-700">
                                  <span className="font-medium text-slate-500">{f.label || f.field}</span>
                                  <span className="font-bold text-indigo-600">{f.operator === FilterOperator.IN_LIST ? 'in' : (f.operator === FilterOperator.EQ ? '=' : f.operator)}</span>
                                  <span className="max-w-[150px] truncate">
                                      {f.operator === FilterOperator.IN_LIST 
                                        ? `[${Array.isArray(f.value) ? f.value.length : 0} items]` 
                                        : (f.specialValue ? <span className="italic text-purple-600">{f.specialValue.toLowerCase().replace('_', ' ')}</span> : f.value)
                                      }
                                  </span>
                                  <button onClick={() => setFilters(filters.filter((_, idx) => idx !== i))} className="ml-1 hover:bg-slate-100 rounded-full p-0.5 transition-colors"><X className="h-3 w-3 text-slate-400 hover:text-red-500"/></button>
                              </Badge>
                            ))}
                        </div>
                      </section>
                      </div>
                    )}
                  </>
                )}

                {/* --- MANUAL MODE CONTENT --- */}
                {builderMode === 'manual' && (
                   <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Data Type</label>
                                <Select value={manualType} onValueChange={(v) => setManualType(v as PromptVariableType)}>
                                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={PromptVariableType.STRING}>Text (Single Line)</SelectItem>
                                        <SelectItem value={PromptVariableType.RICH_TEXT}>Text (Paragraph)</SelectItem>
                                        <SelectItem value={PromptVariableType.NUMBER}>Number</SelectItem>
                                        <SelectItem value={PromptVariableType.DATE}>Date</SelectItem>
                                        <SelectItem value={PromptVariableType.BOOLEAN}>Yes / No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Variable Name <span className="text-red-500">*</span></label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Client Name" className="bg-white" />
                            </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this variable used for?" className="bg-white" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Default Value <span className="text-xs text-slate-400">(optional)</span></label>
                            <Input value={defaultValue} onChange={e => setDefaultValue(e.target.value)} placeholder="Value to use if left empty..." className="bg-white" />
                         </div>
                      </div>

                      <div className="p-4 bg-amber-50 text-amber-900 rounded-lg text-sm border border-amber-100 flex items-start gap-3">
                         <Keyboard className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                         <div>
                            <p className="font-semibold text-amber-800">Manual Input Field</p>
                            <p className="mt-1 opacity-90 text-amber-700">
                                This creates a blank space in your prompt. You will be asked to type <strong>{currentPlaceholder || '{{...}}'}</strong> manually every time you use this prompt.
                            </p>
                         </div>
                      </div>
                   </div>
                )}
                
                {/* 4. SHARED SETTINGS (DYNAMIC ONLY) */}
                {builderMode === 'dynamic' && entity && (
                  <section className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                     <div>
                       <label className="text-sm font-medium mb-1.5 block text-slate-700">Variable Name</label>
                       <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Completed Tasks" className="bg-white border-slate-200" />
                       <p className="text-xs text-slate-500 mt-1">Placeholder: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{currentPlaceholder}</code></p>
                     </div>
                     <div>
                        <label className="text-sm font-medium mb-1.5 block text-slate-700">Default Value</label>
                        <Input value={defaultValue} onChange={e => setDefaultValue(e.target.value)} placeholder="Fallback text..." className="bg-white border-slate-200" />
                     </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: LIVE PREVIEW PANEL (DYNAMIC ONLY) */}
          {builderMode === 'dynamic' && activeTab === 'builder' && (
            <div className="w-[40%] border-l border-slate-200 bg-slate-50 flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                 <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <PlayCircle className="h-4 w-4 text-indigo-600" /> Live Preview
                 </div>
                 {retrievalType === 'field' && (
                    <Select value={format} onValueChange={(v) => setFormat(v as FormatType)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200"><SelectValue placeholder="Format" /></SelectTrigger>
                        <SelectContent>{Object.values(FormatType).map(f => <SelectItem key={f} value={f} className="text-xs">{f.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                 )}
              </div>
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                 <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 z-10"></div>
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Result Output</span>
                        {isLoadingPreview ? (
                             <span className="flex items-center text-xs text-indigo-600 gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Syncing...</span>
                        ) : (
                             <span className="text-xs text-emerald-600 font-medium">Ready</span>
                        )}
                    </div>
                    <ScrollArea className="flex-1 p-4 bg-white">
                         {previewError ? (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 flex gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{previewError.message}</span>
                            </div>
                        ) : !entity ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                                <Database className="h-8 w-8 opacity-20" />
                                <span className="text-sm">Select data source...</span>
                            </div>
                        ) : (
                            <div className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed selection:bg-indigo-100 selection:text-indigo-900">
                                {previewData?.resolvePromptVariable ? previewData.resolvePromptVariable : <span className="text-slate-400 italic">// Empty result</span>}
                            </div>
                        )}
                    </ScrollArea>
                 </div>
                 
                 <div className="mt-6 text-xs text-slate-500">
                    <h5 className="font-semibold mb-2 text-slate-700 flex items-center gap-2"><Settings2 className="h-3 w-3"/> Generated Logic</h5>
                    <div className="bg-white p-3 rounded-md border border-slate-200 font-mono shadow-sm text-slate-600 leading-relaxed">
                        {entity ? (
                            <>
                            <span className="text-indigo-600 font-bold">GET</span> {retrievalType === 'aggregation' ? aggregation : 'LIST'} 
                            <span className="text-slate-400 mx-1">FROM</span> <span className="font-semibold text-slate-800">{entity}</span>
                            {filters.length > 0 && (
                                <div className="mt-1 pl-4 border-l-2 border-slate-100">
                                    <span className="text-purple-600 font-bold">WHERE</span>
                                    {filters.map((f, i) => (
                                        <div key={i} className="ml-1">
                                            {f.field} <span className="text-slate-400">{f.operator === FilterOperator.IN_LIST ? 'in' : f.operator}</span> 
                                            {f.operator === FilterOperator.IN_LIST 
                                              ? ` [${Array.isArray(f.value) ? f.value.length : 0} items]` 
                                              : ` ${f.specialValue || f.value}`}
                                        </div>
                                    ))}
                                </div>
                            )}
                            </>
                        ) : <span className="italic opacity-50">Waiting for configuration...</span>}
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t border-slate-200 bg-white">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-slate-100">Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid || activeTab !== 'builder'} className="min-w-[140px] shadow-sm">
            {activeTab === 'library' ? 'Select & Customize' : 'Create Variable'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* --- SPECIFIC ITEM PICKER MODAL --- */}
      {isItemPickerOpen && entity && (
          <SpecificItemPicker 
            entityType={entity}
            open={isItemPickerOpen}
            onOpenChange={setIsItemPickerOpen}
            onConfirm={handleAddSpecificItems}
            existingSelection={filters.find(f => f.field === 'id' && f.operator === FilterOperator.IN_LIST)?.value as string[] || []}
            projectId={projectId}
            workspaceId={workspaceId}
            currentFilters={filters}
          />
      )}
    </Dialog>
  );
}


// =================================================================
// SPECIFIC ITEM PICKER COMPONENT
// =================================================================
function SpecificItemPicker({ entityType, open, onOpenChange, onConfirm, existingSelection, projectId, workspaceId, currentFilters = [] }: {
    entityType: PromptVariableSource['entityType'],
    open: boolean,
    onOpenChange: (val: boolean) => void,
    onConfirm: (ids: string[]) => void,
    existingSelection: string[],
    projectId?: string,
    workspaceId?: string,
    currentFilters?: FilterCondition[]
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>(existingSelection);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch] = useDebounce(searchTerm, 300);

    // DEBUG LOG
    console.log('[SpecificItemPicker] Initializing with entityType:', entityType);

    // Fetch data using existing hook
    const { tasks, documents, loading } = usePromptDataLookups({ 
        selectedEntityType: entityType,
        projectId,
        workspaceId 
    });

    // DEBUG LOG
    useEffect(() => {
        console.log('[SpecificItemPicker] Data Loaded:', { loading, tasks: tasks?.length, docs: documents?.length });
    }, [tasks, documents, loading]);

    // Normalize data for display AND apply client-side filtering
    const items = useMemo(() => {
        console.log('[SpecificItemPicker] Calculation Items. Search:', debouncedSearch);
        
        let rawItems: any[] = [];
        if (entityType === 'TASK') rawItems = tasks || [];
        else if (entityType === 'DOCUMENT') rawItems = documents || [];
        
        const filtered = rawItems.filter(item => {
            // 1. Filter by Search Term
            if (!item || !item.title) return false;
            if (!item.title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;

            // 2. Filter by Current Filters (Client Side)
            for (const filter of currentFilters) {
                if (filter.field === 'id') continue;
                if (filter.specialValue) continue;

                const itemValue = item[filter.field];
                
                if (filter.operator === FilterOperator.EQ) {
                     if (itemValue != filter.value) return false;
                }
                else if (filter.operator === FilterOperator.NEQ) {
                     if (itemValue == filter.value) return false;
                }
                else if (filter.operator === FilterOperator.GT) {
                     if (Number(itemValue) <= Number(filter.value)) return false;
                }
                else if (filter.operator === FilterOperator.LT) {
                     if (Number(itemValue) >= Number(filter.value)) return false;
                }
            }

            return true;
        });
            
        return filtered.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: (entityType === 'TASK' && item.sprint) ? item.sprint.name : (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '')
        }));
    }, [entityType, tasks, documents, debouncedSearch, currentFilters]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === items.length) setSelectedIds([]);
        else setSelectedIds(items.map(i => i.id));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl h-[70vh] flex flex-col bg-white overflow-hidden p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b bg-white">
                    <DialogTitle>Select {entityType === 'TASK' ? 'Tasks' : 'Documents'}</DialogTitle>
                    <DialogDescription>Choose specific items to include in your prompt context.</DialogDescription>
                </DialogHeader>
                
                <div className="p-4 border-b flex gap-2 bg-slate-50">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search by title..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-9 bg-white border-slate-200"
                        />
                    </div>
                    <Button variant="outline" onClick={handleSelectAll} className="bg-white">
                        {selectedIds.length === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4 bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-indigo-600"/> Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                             <div>No items found.</div>
                             {currentFilters.filter(f => f.field !== 'id').length > 0 && (
                                 <div className="text-xs text-slate-400 mt-1">
                                    (Filtered by: {currentFilters.filter(f => f.field !== 'id').map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')})
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map(item => (
                                <div key={item.id} 
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-indigo-300",
                                        selectedIds.includes(item.id) ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100"
                                    )}
                                    onClick={() => handleToggle(item.id)}
                                >
                                    <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => handleToggle(item.id)} className="mt-1" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className={cn("text-sm font-medium truncate", selectedIds.includes(item.id) ? "text-indigo-900" : "text-slate-700")}>{item.title}</p>
                                        {item.subtitle && <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-white">
                    <div className="flex-1 flex items-center text-sm text-slate-500 font-medium">
                        {selectedIds.length} items selected
                    </div>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onConfirm(selectedIds)}>Apply Selection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// =================================================================
// FILTER DIALOG COMPONENT (Replaces Popover to fix Select issue)
// =================================================================
function FilterAddDialog({ entityDef, onAddFilter, projectId, workspaceId }: { 
    entityDef: any, 
    onAddFilter: (f: FilterCondition) => void,
    projectId?: string,
    workspaceId?: string
}) {
    const [open, setOpen] = useState(false);
    const [selectedField, setSelectedField] = useState<string>('');
    const [operator, setOperator] = useState<FilterOperator>(FilterOperator.EQ);
    const [value, setValue] = useState('');
    const [specialValue, setSpecialValue] = useState<string>('');
    
    // Reset internal state when opening
    useEffect(() => { 
        if(open) { 
            console.log('🔓 [FilterAddDialog] Opened');
            setSelectedField(''); 
            setValue(''); 
            setSpecialValue(''); 
        } 
    }, [open]);

    // Derived Lookups
    const fieldDef = entityDef.filters?.find((f: any) => f.field === selectedField);
    const { members, sprints } = usePromptDataLookups({ 
        selectedEntityType: entityDef.value,
        projectId,
        workspaceId
    });
    
    const handleAdd = () => {
        console.log('📝 [FilterAddDialog] Submitting filter:', { selectedField, operator, value, specialValue });
        if (!selectedField) return;
        
        const filter: FilterCondition = {
            field: selectedField,
            operator: operator,
            type: fieldDef?.type || PromptVariableType.STRING,
            value: specialValue ? undefined : value,
            specialValue: specialValue as SpecialFilterValue || undefined
        };
        onAddFilter(filter);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 rounded-full border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-white">
                    <Plus className="h-3 w-3" /> Filter
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[400px] p-6 bg-white border-slate-200 shadow-xl rounded-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-slate-900">Add Filter</DialogTitle>
                    <DialogDescription>Define a condition to filter your data.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* 1. Field */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Field</label>
                        <Select value={selectedField} onValueChange={(v) => { console.log('Selected Filter Field:', v); setSelectedField(v); }}>
                            <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Select field..." /></SelectTrigger>
                            <SelectContent>
                                {entityDef.filters?.filter((f: any) => !f.isItemPicker).map((f: any) => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedField && (
                        <>
                        {/* 2. Operator */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Operator</label>
                            <Select value={operator} onValueChange={(v) => setOperator(v as FilterOperator)}>
                                <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={FilterOperator.EQ}>is</SelectItem>
                                    <SelectItem value={FilterOperator.NEQ}>is not</SelectItem>
                                    {fieldDef?.type === 'NUMBER' && (
                                        <>
                                        <SelectItem value={FilterOperator.GT}>greater than</SelectItem>
                                        <SelectItem value={FilterOperator.LT}>less than</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Value (Dynamic based on field type) */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Value</label>
                            {fieldDef?.lookupEntity === 'MEMBER' ? (
                                <Select value={value || specialValue} onValueChange={(v) => {
                                    console.log('Selected Member:', v);
                                    if (v === SpecialFilterValue.CURRENT_USER) { setSpecialValue(v); setValue(''); }
                                    else { setValue(v); setSpecialValue(''); }
                                }}>
                                    <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Select Member" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={SpecialFilterValue.CURRENT_USER} className="text-purple-600 font-medium">Me (Current User)</SelectItem>
                                        {members.map(m => <SelectItem key={m.id} value={m.user.id}>{m.user.firstName} {m.user.lastName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : fieldDef?.lookupEntity === 'SPRINT' ? (
                                <Select value={value || specialValue} onValueChange={(v) => {
                                    console.log('Selected Sprint:', v);
                                    if (v === SpecialFilterValue.ACTIVE_SPRINT) { setSpecialValue(v); setValue(''); }
                                    else { setValue(v); setSpecialValue(''); }
                                }}>
                                    <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Select Sprint" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={SpecialFilterValue.ACTIVE_SPRINT} className="text-purple-600 font-medium">Current Active Sprint</SelectItem>
                                        {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : fieldDef?.options ? (
                                <Select value={value} onValueChange={setValue}>
                                    <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>{fieldDef.options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            ) : (
                                <Input placeholder="Type a value..." value={value} onChange={e => setValue(e.target.value)} className="bg-white border-slate-200" />
                            )}
                        </div>
                        </>
                    )}
                </div>

                <DialogFooter className="mt-2">
                    <Button onClick={handleAdd} disabled={!selectedField} className="w-full">Add Filter</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

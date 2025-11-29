//components/prompt-lab/manual-variable-discovery-builder.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, User, FileText, Hash, CalendarDays, 
  AlignLeft, Target, ShieldAlert, Languages, PenTool, 
  Lightbulb, GraduationCap, XCircle, Keyboard, Type,
  UserCircle, List, Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { PromptVariable, PromptVariableType } from './store';

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
    type: PromptVariableType;
    defaultValue?: string;
  };
}

// =================================================================
// MAIN COMPONENT
// =================================================================
export function ManualVariableDiscoveryBuilder({ open, onOpenChange, onCreate, projectId, workspaceId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (variable: Omit<PromptVariable, 'id'>) => void;
  projectId?: string;
  workspaceId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'library' | 'builder'>('library');
  
  // --- BUILDER STATE (MANUAL) ---
  const [manualType, setManualType] = useState<PromptVariableType>(PromptVariableType.STRING);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  
  // --- PRESETS DEFINITION (15 ITEMS) ---
  const PRESETS: VariablePreset[] = [
    {
      id: 'manual_tone',
      title: 'Tone of Voice',
      description: 'Define the tone for the AI response (e.g., Professional, Casual).',
      icon: Settings2,
      config: { type: PromptVariableType.STRING, defaultValue: 'Professional and Concise' }
    },
    {
      id: 'manual_audience',
      title: 'Target Audience',
      description: 'Who is this content intended for?',
      icon: User,
      config: { type: PromptVariableType.STRING, defaultValue: 'Stakeholders' }
    },
    {
      id: 'manual_goal',
      title: 'Primary Goal',
      description: 'The main objective of the generated content.',
      icon: Target,
      config: { type: PromptVariableType.RICH_TEXT }
    },
    {
      id: 'manual_format',
      title: 'Output Format',
      description: 'How should the output be structured (Markdown, JSON, HTML)?',
      icon: FileText,
      config: { type: PromptVariableType.STRING, defaultValue: 'Markdown' }
    },
    {
      id: 'manual_constraints',
      title: 'Constraints & Rules',
      description: 'What should the AI avoid or strictly follow?',
      icon: ShieldAlert,
      config: { type: PromptVariableType.RICH_TEXT }
    },
    {
      id: 'manual_language',
      title: 'Language Style',
      description: 'Specific language or dialect requirements.',
      icon: Languages,
      config: { type: PromptVariableType.STRING, defaultValue: 'English (US)' }
    },
    {
      id: 'manual_context',
      title: 'Background Context',
      description: 'Additional context required to answer the prompt.',
      icon: AlignLeft,
      config: { type: PromptVariableType.RICH_TEXT }
    },
    {
      id: 'manual_persona',
      title: 'AI Persona',
      description: 'The role the AI should adopt (e.g., Senior Engineer).',
      icon: UserCircle,
      config: { type: PromptVariableType.STRING, defaultValue: 'Expert Assistant' }
    },
    {
      id: 'manual_keywords',
      title: 'Key Terminology',
      description: 'Specific terms that must be included.',
      icon: Hash,
      config: { type: PromptVariableType.STRING }
    },
    {
      id: 'manual_creativity',
      title: 'Creativity Level',
      description: 'Instruction on how creative or deterministic the output should be.',
      icon: Lightbulb,
      config: { type: PromptVariableType.STRING, defaultValue: 'Balanced' }
    },
    {
      id: 'manual_length',
      title: 'Length / Word Count',
      description: 'Target length for the response.',
      icon: Scale,
      config: { type: PromptVariableType.STRING, defaultValue: 'Concise' }
    },
    {
      id: 'manual_style',
      title: 'Writing Style',
      description: 'Descriptive style (e.g. Technical, Descriptive, Persuasive).',
      icon: PenTool,
      config: { type: PromptVariableType.STRING }
    },
    {
      id: 'manual_exclusions',
      title: 'Negative Constraints',
      description: 'Topics or styles to explicitly exclude.',
      icon: XCircle,
      config: { type: PromptVariableType.STRING }
    },
    {
      id: 'manual_examples',
      title: 'Few-Shot Examples',
      description: 'Provide examples of desired input/output pairs.',
      icon: List,
      config: { type: PromptVariableType.RICH_TEXT }
    },
    {
      id: 'manual_deadline',
      title: 'Date Reference',
      description: 'A specific date relevant to the prompt context.',
      icon: CalendarDays,
      config: { type: PromptVariableType.DATE }
    },
    {
      id: 'manual_generic',
      title: 'Custom Input',
      description: 'A standard blank input field for any purpose.',
      icon: Type,
      config: { type: PromptVariableType.STRING }
    }
  ];

  // --- EFFECTS ---

  // Reset on open
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setName('');
        setDescription('');
        setDefaultValue('');
        setManualType(PromptVariableType.STRING);
        setActiveTab('library');
      }, 200);
    }
  }, [open]);

  // --- HANDLERS ---
  const handleApplyPreset = (preset: VariablePreset) => {
    setName(preset.title);
    setDescription(preset.description);
    setDefaultValue(preset.config.defaultValue || '');
    setManualType(preset.config.type);
    
    setActiveTab('builder');
  };

  const handleCreate = () => {
    if (!name) return;
    
    onCreate({
      name,
      placeholder: generatePlaceholder(name),
      description,
      type: manualType,
      defaultValue,
      source: null,
    });
    onOpenChange(false);
  };
  
  const currentPlaceholder = generatePlaceholder(name);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col bg-white overflow-hidden text-slate-900 shadow-2xl rounded-xl">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white z-10">
          <div>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">New Manual Variable</DialogTitle>
            <DialogDescription className="mt-1 text-slate-500">Add input fields to your prompt context.</DialogDescription>
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
          
          <div className="flex-1 overflow-y-auto transition-all duration-300 bg-white w-full">
            
            {/* TAB: LIBRARY */}
            {activeTab === 'library' && (
               <div className="p-8">
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Input Presets</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-amber-200 hover:shadow-sm transition-all text-left group"
                      >
                        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors bg-amber-50 text-amber-600 group-hover:bg-amber-100">
                          <preset.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{preset.title}</h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{preset.description}</p>
                          <Badge variant="outline" className="mt-2 text-[10px] h-5 px-1.5 bg-transparent border-slate-200 text-slate-400 font-normal">
                             Manual Input
                          </Badge>
                        </div>
                      </button>
                    ))}
                 </div>
               </div>
            )}

            {/* TAB: BUILDER */}
            {activeTab === 'builder' && (
              <div className="p-8 max-w-2xl mx-auto space-y-8">
                
                   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                         <div className="min-w-0 flex-1">
                            <p className="font-semibold text-amber-800">Manual Input Field</p>
                            <p className="mt-1 opacity-90 text-amber-700 break-all">
                                This creates a blank space in your prompt. You will be asked to type <strong>{currentPlaceholder || '{{...}}'}</strong> manually every time you use this prompt.
                            </p>
                         </div>
                      </div>
                   </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t border-slate-200 bg-white">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-slate-100">Cancel</Button>
          <Button onClick={handleCreate} disabled={!name} className="min-w-[140px] shadow-sm">
            {activeTab === 'library' ? 'Customize Selected' : 'Create Variable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

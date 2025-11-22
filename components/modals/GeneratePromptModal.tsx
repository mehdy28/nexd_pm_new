//components/modals/GeneratePromptModal.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useCreatePrompt, useGeneratePromptContent } from "@/hooks/usePromptsAi";
import { Loader2, Sparkles } from "lucide-react";

interface GeneratePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  wireframeImageBase64: string | null;
  wireframeId?: string | null;
}

const AnimatedDots = () => {
    const [dots, setDots] = useState('');
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(d => (d.length >= 3 ? '' : d + '.'));
        }, 300);
        return () => clearInterval(interval);
    }, []);
    return <span className="ml-1 w-4 inline-block text-left">{dots}</span>;
};

export const GeneratePromptModal: React.FC<GeneratePromptModalProps> = ({
  isOpen,
  onClose,
  wireframeImageBase64,
  wireframeId,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  
  const { 
    generate, 
    loading: isGenerating, 
    error: generateError 
  } = useGeneratePromptContent();

  const { 
    createPrompt, 
    loading: isCreating, 
    error: createError 
  } = useCreatePrompt();
  
  const generationPhases = useMemo(() => ['Thinking', 'Analyzing Wireframe', 'Generating Content'], []);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(-1);

  useEffect(() => {
      let interval: NodeJS.Timeout | undefined;
      if (isGenerating) {
          setGeneratedContent(null);
          setCurrentPhaseIndex(0);
          interval = setInterval(() => {
              setCurrentPhaseIndex(prevIndex => {
                  if (prevIndex < generationPhases.length) {
                      return prevIndex + 1;
                  }
                  clearInterval(interval!);
                  return prevIndex;
              });
          }, 1500);
      } else {
          setCurrentPhaseIndex(-1);
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [isGenerating, generationPhases.length]);

  const handleGenerate = async () => {
    if (!wireframeImageBase64) return;

    try {
      const result = await generate({
        variables: {
          input: {
            imageBase64: wireframeImageBase64,
            context: description,
          },
        },
      });
      if (result.data?.generatePromptFromWireframe) {
        setGeneratedContent(result.data.generatePromptFromWireframe);
      }
    } catch (err) {
      console.error("Failed to generate content:", err);
    }
  };

  const handleCreatePrompt = async () => {
    if (!generatedContent || !title || !wireframeId) return;

    // Construct the version structure required by CreatePromptFromWireframeInput
    const versionInput = {
      context: description, // Context for the version
      content: [{ type: "text", value: generatedContent, order: 0 }],
      variables: [], // Currently empty, but correctly placed inside the version
    };

    const input = {
      title,
      description,
      wireframeId: wireframeId,
      model: 'gemini-pro-vision',
      versions: [versionInput], // Wrap the version in an array
    };

    try {
      await createPrompt({ variables: { input } });
      handleClose();
    } catch (e) {
      console.error("Failed to create prompt:", e);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setGeneratedContent(null);
    onClose();
  };

  if (!isOpen) return null;

  const combinedError = generateError || createError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col saas-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Generate Prompt from Wireframe</h2>
          <p className="text-sm text-gray-500">Use AI to generate a detailed prompt based on your wireframe image.</p>
        </div>

        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Wireframe Preview & Inputs */}
          <div className="flex flex-col space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Wireframe Preview</label>
              {wireframeImageBase64 ? (
                <img src={wireframeImageBase64} alt="Wireframe Preview" className="rounded-md border border-gray-200 shadow-sm w-full object-contain max-h-48" />
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 h-48 flex items-center justify-center">
                  <p className="text-sm text-gray-500">No wireframe image provided.</p>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-600 mb-1">Prompt Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g., User Dashboard UI Prompt"
                disabled={isGenerating}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-600 mb-1">Context / Description</label>
              <textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Provide context for the AI, e.g., 'This is the main dashboard for a project management tool.'"
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Right Column: AI Generation & Output */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-600 mb-1">AI Output</label>
            <div className="flex-1 mt-1 p-4 border border-gray-200 rounded-md bg-gray-50/50 flex flex-col justify-between min-h-[300px]">
              
              <div className="flex-1">
                {isGenerating && (
                  <div className="flex flex-col justify-center items-center h-full text-sm">
                      {generationPhases.map((phase, index) => {
                          if (index > currentPhaseIndex) return null;

                          const isCompleted = index < currentPhaseIndex;
                          const isActive = index === currentPhaseIndex && index < generationPhases.length;

                          return (
                              <div key={phase} className="flex items-center mb-3 last:mb-0 transition-all duration-300 w-full">
                                  <div className="w-6 flex-shrink-0 flex items-center justify-center">
                                  {isCompleted ? (
                                      <span className="text-emerald-500 font-bold">✓</span>
                                  ) : isActive ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                  ) : <div className="h-4 w-4"></div> }
                                  </div>
                                  <span className={`font-medium ml-2 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{phase}</span>
                                  {isActive && <AnimatedDots />}
                              </div>
                          );
                      })}
                  </div>
                )}
                
                {generatedContent && !isGenerating && (
                   <textarea
                     readOnly
                     value={generatedContent}
                     className="w-full h-full bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-700 p-0"
                   />
                )}
                
                {!isGenerating && !generatedContent && (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <div className="p-3 bg-teal-100 rounded-full mb-3">
                      <Sparkles className="h-6 w-6 text-teal-600" />
                    </div>
                    <p className="font-semibold text-gray-700">Ready to Generate</p>
                    <p className="text-xs text-gray-500">Fill in the title and context, then click "Generate Content".</p>
                  </div>
                )}
              </div>

              {!isGenerating && !generatedContent && (
                <button
                  onClick={handleGenerate}
                  disabled={!description || !title || !wireframeImageBase64}
                  className="w-full mt-4 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Content
                </button>
              )}
            </div>
          </div>
        </div>

        {combinedError && 
          <div className="px-6 py-2 border-t">
            <p className="text-red-600 text-sm">{combinedError.message}</p>
          </div>
        }

        <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleCreatePrompt}
            disabled={!generatedContent || !title || isCreating || !wireframeId}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {isCreating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Create Prompt
          </button>
        </div>
      </div>
    </div>
  );
};
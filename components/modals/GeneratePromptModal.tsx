//components/modals/GeneratePromptModal.tsx
"use client";
import React, { useState } from "react";
import { useCreatePrompt, useGeneratePromptContent } from "@/hooks/usePromptsAi";
import { Loader2 } from "lucide-react";

interface GeneratePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  wireframeImageBase64: string | null;
  wireframeId?: string | null;
}

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
      // Error state is already managed by the hook
    }
  };

  const handleCreatePrompt = async () => {
    if (!generatedContent || !title || !wireframeId) return;

    const input = {
      title,
      description,
      context: description,
      content: [{ type: "text", value: generatedContent, order: 0 }], // **FIX**: Add order field
      wireframeId: wireframeId,
      variables: [],
      versions: [],
      model: 'gemini-pro-vision'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Generate Prompt from Wireframe</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Prompt Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="e.g., User Dashboard UI Prompt"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Context / Description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Provide context for the AI, e.g., 'This is the main dashboard for a project management tool.'"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !description || !wireframeImageBase64}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 focus:outline-none"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : "Generate Content"}
          </button>

          {generatedContent && (
             <div>
                <label className="block text-sm font-medium text-gray-700">Generated Prompt Content</label>
                <textarea
                  readOnly
                  rows={8}
                  value={generatedContent}
                  className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
          )}
        </div>
        
        {combinedError && <p className="text-red-500 text-sm mt-2">{combinedError.message}</p>}

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={handleCreatePrompt}
            disabled={!generatedContent || !title || isCreating || !wireframeId}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-400 flex items-center"
          >
            {isCreating && <Loader2 className="animate-spin mr-2" />}
            Create Prompt
          </button>
        </div>
      </div>
    </div>
  );
};
'use client'

import PromptCard from './prompt-card';
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { Prompt } from '@/components/prompt-lab/store';
import { useEffect, useState } from 'react'; // ADDED: useState for modal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // ADDED: AlertDialog for confirmation


interface PromptListProps {
  prompts: Prompt[];
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: () => Promise<any>;
  onDeletePrompt: (id: string) => void; // ADDED: onDeletePrompt prop
  isLoading?: boolean;
  isError?: boolean;
  loadMorePrompts: () => void; // ADDED: Load more function
  hasMorePrompts: boolean; // ADDED: Has more prompts flag
  isFetchingMore?: boolean; // ADDED: Loading state for load more
}

export function PromptList({
  prompts,
  onSelectPrompt,
  onCreatePrompt,
  onDeletePrompt, // Destructure new prop
  isLoading,
  isError,
  loadMorePrompts,
  hasMorePrompts,
  isFetchingMore, // Destructure new prop
}: PromptListProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);

  useEffect(() => {
    console.log(`[data loading sequence] [PromptList] Rendered with props. Prompts count: ${prompts.length}, isLoading: ${isLoading}, isError: ${isError}`);
    prompts.forEach(p => console.log(`[data loading sequence] [PromptList]   - Received Prompt ID: ${p.id}, Title: ${p.title.substring(0,20)}...`));
  }, [prompts, isLoading, isError]);


  const handleDeleteClick = (prompt: Prompt) => {
    setPromptToDelete(prompt);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (promptToDelete) {
      await onDeletePrompt(promptToDelete.id);
      setPromptToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };


  if (isLoading && prompts.length === 0) { // Only show full loader if no prompts are loaded yet
    console.log('[data loading sequence] [PromptList] Rendering internal loading state.');
    return (
      <div className="page-scroller p-6 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-slate-500">Loading prompt list...</p>
      </div>
    );
  }

  if (isError) {
    console.log('[data loading sequence] [PromptList] Rendering internal error state.');
    return (
      <div className="page-scroller p-6 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-red-500">
        <p className="text-lg">Failed to load prompts.</p>
        <p className="text-sm mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  console.log('[data loading sequence] [PromptList] Rendering main content (prompts or "no prompts found" message).');
  return (
    <div className="page-scroller p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Prompt Library</h2>
        <Button onClick={onCreatePrompt}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prompts.length === 0 && !isLoading ? ( // Only show "no prompts" message if not loading
          <p className="col-span-full text-center text-slate-500">No prompts found. Click "New Prompt" to create one.</p>
        ) : (
          prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onClick={() => onSelectPrompt(prompt.id)}
              onDelete={() => handleDeleteClick(prompt)} // Pass delete handler
            />
          ))
        )}
      </div>

      {hasMorePrompts && (
        <div className="flex justify-center mt-6">
          <Button onClick={loadMorePrompts} disabled={isFetchingMore || isLoading}>
            {isFetchingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load More
          </Button>
        </div>
      )}

      {/* Confirmation Modal */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the prompt
              <span className="font-semibold"> "{promptToDelete?.title}"</span> and all its versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
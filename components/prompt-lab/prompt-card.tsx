import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'; // ADDED CardDescription, CardFooter
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // ADDED Button
import { Trash2, Edit, Workflow, Type, Clock } from 'lucide-react'; // ADDED more icons
import { Prompt } from './store';

interface PromptCardProps {
  prompt: Prompt;
  onClick: () => void;
  onDelete: () => void; // ADDED: onDelete prop for the delete button
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick, onDelete }) => {
  // Prevent card click when delete button is clicked
  const handleCardClick = (e: React.MouseEvent) => {
    // If the click originated from the delete button, prevent propagating to card click
    if ((e.target as HTMLElement).closest('.delete-button')) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const formattedUpdatedAt = new Date(prompt.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card onClick={handleCardClick} className="relative cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold leading-none tracking-tight pr-8">{prompt.title}</CardTitle>
          {prompt.description && (
            <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {prompt.description}
            </CardDescription>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="delete-button h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            onDelete();
          }}
          aria-label={`Delete prompt ${prompt.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
        <div className="flex flex-wrap gap-2 mb-4">
          {prompt.isPublic && <Badge variant="default" className="bg-green-500 text-white">Public</Badge>}
          {prompt.tags && prompt.tags.length > 0 && prompt.tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
          {prompt.category && prompt.category !== '' && <Badge variant="outline">{prompt.category}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Type className="mr-2 h-4 w-4 text-primary" />
            <span>{prompt.model || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="truncate">{formattedUpdatedAt}</span>
          </div>
        </div>
      </CardContent>
      {/* Optional: Add a footer for more actions or info if needed */}
      {/* <CardFooter className="flex justify-between items-center pt-2">
        <Button variant="outline" size="sm" onClick={onClick}>
          <Edit className="mr-2 h-4 w-4" /> View/Edit
        </Button>
      </CardFooter> */}
    </Card>
  );
};

export default PromptCard;
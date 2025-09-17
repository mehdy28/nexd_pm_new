
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Prompt } from './store'; // Import the Prompt type

interface PromptCardProps {
  prompt: Prompt; // Use the imported Prompt type
  onClick: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick }) => {
  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle>{prompt.title}</CardTitle> {/* Use prompt.title instead of prompt.name */}
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          {prompt.tags && prompt.tags.map((tag) => ( // Add a check for prompt.tags
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">{new Date(prompt.updatedAt).toLocaleDateString()}</p> {/* Use prompt.updatedAt */}
      </CardContent>
    </Card>
  );
};

export default PromptCard;

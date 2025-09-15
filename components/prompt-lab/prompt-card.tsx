
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PromptCardProps {
  prompt: {
    id: string;
    name: string;
    tags: string[];
    createdAt: string;
  };
  onClick: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick }) => {
  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle>{prompt.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">{new Date(prompt.createdAt).toLocaleDateString()}</p>
      </CardContent>
    </Card>
  );
};

export default PromptCard;

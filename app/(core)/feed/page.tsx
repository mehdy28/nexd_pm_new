// app/(core)/feed/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Rocket, 
  Zap, 
  AlertCircle 
} from "lucide-react";
import { MOCK_FEED_POSTS, MOCK_USERS } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';



// Helper for type badges
const getTypeBadge = (type: string) => {
  switch(type) {
    case 'RELEASE': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><Rocket className="w-3 h-3 mr-1"/> Release</Badge>;
    case 'FEATURE': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Zap className="w-3 h-3 mr-1"/> Feature</Badge>;
    default: return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1"/> Update</Badge>;
  }
};

const FeedPage = () => {
  const [posts, setPosts] = useState(MOCK_FEED_POSTS);
  const [newPostContent, setNewPostContent] = useState("");
  const currentUser = MOCK_USERS[0]; // Simulating Admin

  const handlePost = () => {
    if (!newPostContent.trim()) return;
    
    const newPost = {
      id: `new_${Date.now()}`,
      author: currentUser,
      content: newPostContent,
      type: 'UPDATE',
      createdAt: new Date().toISOString(),
      comments: []
    };

    setPosts([newPost, ...posts]);
    setNewPostContent("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 min-h-screen">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Project Updates</h1>
        <p className="text-muted-foreground">Share releases, features, and important news with clients and the team.</p>
      </div>

      {/* Composer */}
      <Card className="border-indigo-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-indigo-600 text-white">
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea 
                placeholder="What's new with the project?" 
                className="min-h-[100px] resize-none border-gray-200 focus:border-indigo-300"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                   <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Paperclip className="w-4 h-4 mr-2" /> Attach
                   </Button>
                </div>
                <Button onClick={handlePost} disabled={!newPostContent.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                  <Send className="w-4 h-4 mr-2" /> Post Update
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Stream */}
      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start gap-4 pb-2 space-y-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback style={{ backgroundColor: post.author.avatarColor }} className="text-white">
                  {post.author.firstName[0]}{post.author.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{post.author.firstName} {post.author.lastName}</span>
                    {getTypeBadge(post.type)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{post.author.role === 'ADMIN' ? 'Project Lead' : 'Team Member'}</p>
              </div>
            </CardHeader>
            
            <CardContent className="pb-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap pl-16">
              {post.content}
            </CardContent>

            <CardFooter className="flex flex-col bg-gray-50/50 p-4 gap-4">
              {/* Comment Actions */}
              <div className="flex items-center gap-4 w-full pl-12">
                <Button variant="ghost" size="sm" className="text-muted-foreground h-8">
                  <MessageCircle className="w-4 h-4 mr-1.5" /> 
                  {post.comments.length} Comments
                </Button>
              </div>

              {/* Comments Section */}
              {post.comments.length > 0 && (
                <div className="w-full pl-12 space-y-4 pt-2 border-t">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-6 w-6">
                         <AvatarFallback style={{ backgroundColor: comment.author.avatarColor }} className="text-white text-[10px]">
                            {comment.author.firstName[0]}
                         </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-white p-3 rounded-lg border shadow-sm text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-xs">{comment.author.firstName} {comment.author.lastName}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt))}</span>
                        </div>
                        <p className="text-gray-600">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Comment Input */}
              <div className="w-full pl-12 flex gap-3 items-center mt-2">
                 <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-indigo-600 text-white text-[10px]">ME</AvatarFallback>
                 </Avatar>
                 <Input className="h-8 text-xs bg-white" placeholder="Write a comment..." />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeedPage;
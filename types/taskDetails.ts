// types/taskDetails.ts

import { ActivityType } from "@prisma/client";
import {  PriorityUI, TaskStatusUI } from "@/hooks/useProjectTasksAndSections";
import { UserAvatarPartial } from "./useProjectTasksAndSections";


export interface CommentUI {
  __typename: "Comment";
  id: string;
  content: string;
  createdAt: string;
  author: UserAvatarPartial;
}

export interface AttachmentUI {
  __typename: "Attachment";
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: string;
  uploader: UserAvatarPartial;
}

export interface ActivityUI {
  __typename: "Activity";
  id: string;
  type: ActivityType;
  data: any; // The data JSON can have various shapes
  createdAt: string;
  user: UserAvatarPartial;
}

// This represents the full data for the task details sheet
export interface TaskDetailsUI {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusUI;
  priority: PriorityUI;
  dueDate: string | null;
  points: number | null;
  completed: boolean;
  assignee: UserAvatarPartial | null;
  creator: UserAvatarPartial;
  sprint: {
    id: string;
    name: string;
  } | null;
  section: {
    id: string;
    name: string;
  } | null;
  comments: CommentUI[];
  attachments: AttachmentUI[];
  activities: ActivityUI[];
}
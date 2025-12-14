// @/graphql/types.ts

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export enum ActivityType {
    ATTACHMENT_ADDED = "ATTACHMENT_ADDED",
    ATTACHMENT_REMOVED = "ATTACHMENT_REMOVED",
    COMMENT_ADDED = "COMMENT_ADDED",
    COMMENT_DELETED = "COMMENT_DELETED",
    COMMENT_UPDATED = "COMMENT_UPDATED",
    DESCRIPTION_UPDATED = "DESCRIPTION_UPDATED",
    DOCUMENT_CREATED = "DOCUMENT_CREATED",
    DOCUMENT_DELETED = "DOCUMENT_DELETED",
    DOCUMENT_UPDATED = "DOCUMENT_UPDATED",
    DUE_DATE_UPDATED = "DUE_DATE_UPDATED",
    MEMBER_ADDED = "MEMBER_ADDED",
    MEMBER_REMOVED = "MEMBER_REMOVED",
    MEMBER_UPDATED = "MEMBER_UPDATED",
    POINTS_UPDATED = "POINTS_UPDATED",
    PRIORITY_UPDATED = "PRIORITY_UPDATED",
    PROJECT_CREATED = "PROJECT_CREATED",
    PROJECT_DELETED = "PROJECT_DELETED",
    PROJECT_UPDATED = "PROJECT_UPDATED",
    PROMPT_CREATED = "PROMPT_CREATED",
    PROMPT_DELETED = "PROMPT_DELETED",
    PROMPT_UPDATED = "PROMPT_UPDATED",
    STATUS_UPDATED = "STATUS_UPDATED",
    TASK_ASSIGNED = "TASK_ASSIGNED",
    TASK_COMPLETED = "TASK_COMPLETED",
    TASK_CREATED = "TASK_CREATED",
    TASK_DELETED = "TASK_DELETED",
    TASK_UPDATED = "TASK_UPDATED",
    WHITEBOARD_CREATED = "WHITEBOARD_CREATED",
    WHITEBOARD_DELETED = "WHITEBOARD_DELETED",
    WHITEBOARD_UPDATED = "WHITEBOARD_UPDATED",
  }
  
  export enum AggregationType {
    AVERAGE = "AVERAGE",
    COUNT = "COUNT",
    FIRST_CREATED_FIELD_VALUE = "FIRST_CREATED_FIELD_VALUE",
    LAST_UPDATED_FIELD_VALUE = "LAST_UPDATED_FIELD_VALUE",
    LIST_FIELD_VALUES = "LIST_FIELD_VALUES",
    MOST_COMMON_FIELD_VALUE = "MOST_COMMON_FIELD_VALUE",
    SUM = "SUM",
  }
  
  export enum AuditLogAction {
    MEMBER_INVITED = "MEMBER_INVITED",
    MEMBER_REMOVED = "MEMBER_REMOVED",
    MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED",
    PROJECT_CREATED = "PROJECT_CREATED",
    PROJECT_DELETED = "PROJECT_DELETED",
    SUBSCRIPTION_CHANGED = "SUBSCRIPTION_CHANGED",
    WORKSPACE_SETTINGS_UPDATED = "WORKSPACE_SETTINGS_UPDATED",
  }
  
  export enum ConversationType {
    DIRECT = "DIRECT",
    GROUP = "GROUP",
  }
  
  export enum DependencyType {
    FINISH_TO_FINISH = "FINISH_TO_FINISH",
    FINISH_TO_START = "FINISH_TO_START",
    START_TO_FINISH = "START_TO_FINISH",
    START_TO_START = "START_TO_START",
  }
  
  export enum FilterOperator {
    CONTAINS = "CONTAINS",
    ENDS_WITH = "ENDS_WITH",
    EQ = "EQ",
    GT = "GT",
    GTE = "GTE",
    IN_LIST = "IN_LIST",
    LT = "LT",
    LTE = "LTE",
    NEQ = "NEQ",
    NOT_IN = "NOT_IN",
    STARTS_WITH = "STARTS_WITH",
  }
  
  export enum FormatType {
    BULLET_POINTS = "BULLET_POINTS",
    COMMA_SEPARATED = "COMMA_SEPARATED",
    JSON_ARRAY = "JSON_ARRAY",
    PLAIN_TEXT = "PLAIN_TEXT",
  }
  
  export enum InvitationStatus {
    ACCEPTED = "ACCEPTED",
    DECLINED = "DECLINED",
    EXPIRED = "EXPIRED",
    PENDING = "PENDING",
  }
  
  export enum Plan {
    ENTERPRISE = "ENTERPRISE",
    FREE = "FREE",
    PRO = "PRO",
  }
  
  export enum Priority {
    HIGH = "HIGH",
    LOW = "LOW",
    MEDIUM = "MEDIUM",
  }
  
  export enum ProjectRole {
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
    OWNER = "OWNER",
    VIEWER = "VIEWER",
  }
  
  export enum ProjectStatus {
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    CANCELLED = "CANCELLED",
    COMPLETED = "COMPLETED",
    ON_HOLD = "ON_HOLD",
    PLANNING = "PLANNING",
  }
  
  export enum PromptVariableType {
    BOOLEAN = "BOOLEAN",
    DATE = "DATE",
    DYNAMIC = "DYNAMIC",
    LIST_OF_STRINGS = "LIST_OF_STRINGS",
    NUMBER = "NUMBER",
    RICH_TEXT = "RICH_TEXT",
    SELECT = "SELECT",
    STRING = "STRING",
  }
  
  export enum SprintStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    PLANNING = "PLANNING",
  }
  
  export enum SubscriptionStatus {
    ACTIVE = "ACTIVE",
    CANCELLED = "CANCELLED",
    PAST_DUE = "PAST_DUE",
    UNPAID = "UNPAID",
  }
  
  export enum TaskStatus {
    DONE = "DONE",
    TODO = "TODO",
  }
  
  export enum TicketStatus {
    CLOSED = "CLOSED",
    IN_PROGRESS = "IN_PROGRESS",
    OPEN = "OPEN",
    RESOLVED = "RESOLVED",
  }
  
  export enum UserRole {
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
  }
  
  export enum WorkspaceRole {
    ADMIN = "ADMIN",
    GUEST = "GUEST",
    MEMBER = "MEMBER",
    OWNER = "OWNER",
  }
  
  export interface UpdateWorkspaceInput {
    id: string;
    name?: string | null;
    description?: string | null;
    industry?: string | null;
    teamSize?: string | null;
    workFields?: (string)[] | null;
  }
  
  //==============================================================
  // END Enums and Input Objects
  //==============================================================
  
  //==============================================================
  // START Generated Schemas
  //==============================================================
  
  export interface UserPartial {
    __typename: "UserPartial";
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    avatarColor: string | null;
  }
  
  export interface WorkspaceInvitation {
    __typename: "WorkspaceInvitation";
    id: string;
    email: string;
    role: WorkspaceRole;
    status: InvitationStatus;
    expiresAt: any; // DateTime
    createdAt: any; // DateTime
    invitedBy: UserPartial;
  }
  
  export interface WorkspaceMember {
    __typename: "WorkspaceMember";
    id: string;
    role: WorkspaceRole;
    joinedAt: any; // DateTime
    workspace: Workspace;
    user: User;
  }
  
  export interface WorkspaceSettings {
    __typename: "WorkspaceSettings";
    id: string;
    allowGuestAccess: boolean;
    timeZone: string;
    workspace: Workspace;
  }
  
  export interface ProjectMember {
    __typename: "ProjectMember";
    id: string;
    role: ProjectRole;
    joinedAt: any; // DateTime
    project: Project;
    user: User;
  }
  
  export interface Sprint {
    __typename: "Sprint";
    id: string;
    name: string;
    description: string | null;
    startDate: any; // DateTime
    endDate: any; // DateTime
    isCompleted: boolean;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    project: Project;
    tasks: (Task)[];
    milestones: (Milestone)[];
    status: SprintStatus;
  }
  
  export interface Milestone {
    __typename: "Milestone";
    id: string;
    name: string;
    description: string | null;
    dueDate: any; // DateTime
    isCompleted: boolean;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    sprintId: string;
    sprint: Sprint;
  }
  
  export interface Section {
    __typename: "Section";
    id: string;
    name: string;
    order: number;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    projectId: string;
    project: Project;
    tasks: (Task)[];
  }
  
  export interface PersonalSection {
    __typename: "PersonalSection";
    id: string;
    name: string;
    order: number;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    user: User;
    tasks: (Task)[];
  }
  
  export interface TaskDependency {
    __typename: "TaskDependency";
    id: string;
    type: DependencyType;
    lag: number;
    precedingTask: Task;
    dependentTask: Task;
  }
  
  export interface Comment {
    __typename: "Comment";
    id: string;
    content: string;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    author: User;
    task: Task | null;
    document: Document | null;
    WHITEBOARD: WHITEBOARD | null;
    prompt: Prompt | null;
    mentions: (Mention)[];
  }
  
  export interface Mention {
    __typename: "Mention";
    id: string;
    comment: Comment;
    user: User;
  }
  
  export interface Activity {
    __typename: "Activity";
    id: string;
    type: ActivityType;
    data: any; // JSON
    createdAt: any; // DateTime
    user: User;
    project: Project | null;
    task: Task | null;
    document: Document | null;
    WHITEBOARD: WHITEBOARD | null;
    prompt: Prompt | null;
  }
  
  export interface TaskLabel {
    __typename: "TaskLabel";
    taskId: string;
    labelId: string;
    task: Task;
    label: Label;
  }
  
  export interface Label {
    __typename: "Label";
    id: string;
    name: string;
    color: string;
    workspace: Workspace;
    tasks: (TaskLabel)[];
  }
  
  export interface Attachment {
    __typename: "Attachment";
    id: string;
    publicId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url: string;
    createdAt: any; // DateTime
    uploader: User;
  }
  
  export interface Task {
    __typename: "Task";
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: Priority;
    dueDate: any | null; // DateTime
    startDate: any | null; // DateTime
    endDate: any | null; // DateTime
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    completed: boolean;
    points: number | null;
    completionPercentage: number | null;
    project: Project | null;
    sprint: Sprint | null;
    section: Section | null;
    personalUser: User | null;
    personalWorkspace: Workspace | null;
    personalSection: PersonalSection | null;
    assignee: User | null;
    creator: User;
    parent: Task | null;
    subtasks: (Task)[];
    dependencies: (TaskDependency)[];
    dependents: (TaskDependency)[];
    comments: (Comment)[];
    activities: (Activity)[];
    labels: (TaskLabel)[];
    attachments: (Attachment)[];
    commentCount: number;
    attachmentCount: number;
  }
  
  export interface UserLookupPartial {
    __typename: "UserLookupPartial";
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    avatar: string | null;
    avatarColor: string | null;
  }
  
  export interface Message {
    __typename: "Message";
    id: string;
    content: string;
    createdAt: any; // DateTime
    conversationId: string | null;
    sender: UserLookupPartial;
  }
  
  export interface Conversation {
    __typename: "Conversation";
    id: string;
    type: ConversationType;
    name: string | null;
    creatorId: string | null;
    participants: (UserLookupPartial)[];
    messages: (Message)[];
    updatedAt: any; // DateTime
  }
  
  export interface TicketMessage {
    __typename: "TicketMessage";
    id: string;
    content: string;
    createdAt: any; // DateTime
    sender: UserLookupPartial;
    isSupport: boolean;
  }
  
  export interface Ticket {
    __typename: "Ticket";
    id: string;
    subject: string;
    priority: Priority;
    status: TicketStatus;
    creator: UserLookupPartial;
    messages: (TicketMessage)[];
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
  }
  
  export interface UserNotificationSettings {
    __typename: "UserNotificationSettings";
    atMention: boolean;
    taskAssigned: boolean;
    projectUpdates: boolean;
    productNews: boolean;
  }
  
  export interface User {
    __typename: "User";
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    avatarColor: string | null;
    firebaseUid: string | null;
    role: UserRole;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    fullName: string | null;
    workspaceMembers: (WorkspaceMember)[] | null;
    ownedWorkspaces: (Workspace)[] | null;
    projectMembers: (ProjectMember)[] | null;
    assignedTasks: (Task)[] | null;
    createdTasks: (Task)[] | null;
    personalTasks: (Task)[] | null;
    personalDocuments: (Document)[] | null;
    personalWHITEBOARDs: (WHITEBOARD)[] | null;
    personalPrompts: (Prompt)[] | null;
    personalSections: (PersonalSection)[] | null;
    activities: (Activity)[] | null;
    comments: (Comment)[] | null;
    mentions: (Mention)[] | null;
    conversations: (Conversation)[] | null;
    tickets: (Ticket)[] | null;
    notificationSettings: UserNotificationSettings | null;
  }
  
  export interface Document {
    __typename: "Document";
    id: string;
    title: string;
    content: any | null; // JSON
    dataUrl: string | null;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    type: string;
    projectId: string | null;
    project: Project | null;
    personalUser: User | null;
    comments: (Comment)[];
  }
  
  export interface WHITEBOARD {
    __typename: "WHITEBOARD";
    id: string;
    title: string;
    data: any; // JSON
    thumbnail: string | null;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    project: Project | null;
    personalUser: User | null;
    comments: (Comment)[];
    activities: (Activity)[];
  }
  
  export interface Version {
    __typename: "Version";
    id: string;
    content: (ContentBlock)[] | null;
    context: string;
    variables: (PromptVariable)[] | null;
    createdAt: any; // DateTime
    notes: string | null;
    description: string | null;
    aiEnhancedContent: string | null;
    isActive: boolean;
  }
  
  export interface ContentBlock {
    __typename: "ContentBlock";
    id: string;
    type: string;
    value: string | null;
    varId: string | null;
    placeholder: string | null;
    name: string | null;
    order: number;
  }
  
  export interface PromptVariable {
    __typename: "PromptVariable";
    id: string;
    name: string;
    placeholder: string;
    description: string | null;
    type: PromptVariableType;
    defaultValue: string | null;
    source: any | null; // JSON
  }
  
  export interface Prompt {
    __typename: "Prompt";
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    tags: (string)[];
    isPublic: boolean;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    model: string | null;
    projectId: string | null;
    project: Project | null;
    user: User | null;
    WHITEBOARDId: string | null;
    WHITEBOARD: WHITEBOARD | null;
    comments: (Comment)[] | null;
    activities: (Activity)[] | null;
    versions: (Version)[] | null;
    activeVersion: Version | null;
  }
  
  export interface Project {
    __typename: "Project";
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: ProjectStatus;
    startDate: any | null; // DateTime
    endDate: any | null; // DateTime
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    workspace: Workspace;
    members: (ProjectMember)[];
    tasks: (Task)[];
    documents: (Document)[];
    WHITEBOARDs: (WHITEBOARD)[];
    prompts: (Prompt)[];
    activities: (Activity)[];
    sprints: (Sprint)[];
    sections: (Section)[];
    projectMemberCount: number | null;
    totalTaskCount: number;
    completedTaskCount: number;
  }
  
  export interface Subscription {
    __typename: "Subscription";
    id: string;
    plan: Plan;
    status: SubscriptionStatus;
    currentPeriodEnd: any; // DateTime
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    workspace: Workspace;
  }
  
  export interface Workspace {
    __typename: "Workspace";
    id: string;
    name: string;
    slug: string;
    description: string | null;
    avatar: string | null;
    plan: Plan;
    createdAt: any; // DateTime
    updatedAt: any; // DateTime
    owner: User;
    industry: string | null;
    teamSize: string | null;
    workFields: (string)[] | null;
    members: (WorkspaceMember)[];
    projects: (Project)[];
    subscription: Subscription | null;
    settings: WorkspaceSettings | null;
    personalTasks: (Task)[] | null;
    conversations: (Conversation)[] | null;
    tickets: (Ticket)[] | null;
    invitations: (WorkspaceInvitation)[] | null;
  }
  
  export interface UpdateWorkspaceMutation {
    updateWorkspace: Workspace;
  }
  
  export interface UpdateWorkspaceMutationVariables {
    input: UpdateWorkspaceInput;
  }
  
  //==============================================================
  // END Generated Schemas
  //==============================================================
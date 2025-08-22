import { gql } from "apollo-server-micro"

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String
    avatar: String
    role: UserRole!
    createdAt: DateTime!
    updatedAt: DateTime!
    workspaceMembers: [WorkspaceMember!]!
    ownedWorkspaces: [Workspace!]!
    projectMembers: [ProjectMember!]!
    assignedTasks: [Task!]!
    createdTasks: [Task!]!
    activities: [Activity!]!
    comments: [Comment!]!
  }

  type Workspace {
    id: ID!
    name: String!
    slug: String!
    description: String
    avatar: String
    plan: Plan!
    createdAt: DateTime!
    updatedAt: DateTime!
    owner: User!
    members: [WorkspaceMember!]!
    projects: [Project!]!
    subscription: Subscription
    settings: WorkspaceSettings
  }

  type WorkspaceMember {
    id: ID!
    role: WorkspaceRole!
    joinedAt: DateTime!
    workspace: Workspace!
    user: User!
  }

  type WorkspaceSettings {
    id: ID!
    allowGuestAccess: Boolean!
    defaultProjectPrivacy: Privacy!
    timeZone: String!
    workspace: Workspace!
  }

  type Project {
    id: ID!
    name: String!
    description: String
    color: String!
    privacy: Privacy!
    status: Status!
    startDate: DateTime
    endDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    workspace: Workspace!
    members: [ProjectMember!]!
    tasks: [Task!]!
    documents: [Document!]!
    wireframes: [Wireframe!]!
    activities: [Activity!]!
  }

  type ProjectMember {
    id: ID!
    role: ProjectRole!
    joinedAt: DateTime!
    project: Project!
    user: User!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    priority: Priority!
    dueDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project!
    assignee: User
    creator: User!
    parent: Task
    subtasks: [Task!]!
    comments: [Comment!]!
    activities: [Activity!]!
    labels: [Label!]!
  }

  type Label {
    id: ID!
    name: String!
    color: String!
    tasks: [Task!]!
  }

  type Document {
    id: ID!
    title: String!
    content: JSON
    type: DocumentType!
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project!
    comments: [Comment!]!
    activities: [Activity!]!
  }

  type Wireframe {
    id: ID!
    title: String!
    data: JSON!
    thumbnail: String
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project!
    comments: [Comment!]!
    activities: [Activity!]!
  }

  type Comment {
    id: ID!
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    author: User!
    task: Task
    document: Document
    wireframe: Wireframe
    mentions: [User!]!
  }

  type Activity {
    id: ID!
    type: ActivityType!
    data: JSON!
    createdAt: DateTime!
    user: User!
    project: Project
    task: Task
    document: Document
    wireframe: Wireframe
  }

  type Subscription {
    id: ID!
    plan: Plan!
    status: SubscriptionStatus!
    currentPeriodEnd: DateTime!
    cancelAtPeriodEnd: Boolean!
    workspace: Workspace!
  }

  enum UserRole {
    ADMIN
    MEMBER
  }

  enum WorkspaceRole {
    OWNER
    ADMIN
    MEMBER
    GUEST
  }

  enum ProjectRole {
    OWNER
    ADMIN
    MEMBER
  }

  enum Privacy {
    PUBLIC
    PRIVATE
  }

  enum Status {
    ACTIVE
    ARCHIVED
    DELETED
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    IN_REVIEW
    DONE
    CANCELLED
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum DocumentType {
    TEXT
    MARKDOWN
    RICH_TEXT
  }

  enum ActivityType {
    TASK_CREATED
    TASK_UPDATED
    TASK_COMPLETED
    TASK_ASSIGNED
    PROJECT_CREATED
    PROJECT_UPDATED
    DOCUMENT_CREATED
    DOCUMENT_UPDATED
    WIREFRAME_CREATED
    WIREFRAME_UPDATED
    COMMENT_ADDED
    MEMBER_ADDED
    MEMBER_REMOVED
  }

  enum Plan {
    FREE
    PRO
    ENTERPRISE
  }

  enum SubscriptionStatus {
    ACTIVE
    CANCELLED
    PAST_DUE
    UNPAID
  }

  type Query {
    me: User
    workspace(id: ID!): Workspace
    workspaces: [Workspace!]!
    project(id: ID!): Project
    projects(workspaceId: ID!): [Project!]!
    task(id: ID!): Task
    tasks(projectId: ID!): [Task!]!
    document(id: ID!): Document
    documents(projectId: ID!): [Document!]!
    wireframe(id: ID!): Wireframe
    wireframes(projectId: ID!): [Wireframe!]!
    activities(projectId: ID): [Activity!]!
  }

  type Mutation {
    # Auth
    signUp(input: SignUpInput!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
    
    # Workspace
    createWorkspace(input: CreateWorkspaceInput!): Workspace!
    updateWorkspace(id: ID!, input: UpdateWorkspaceInput!): Workspace!
    deleteWorkspace(id: ID!): Boolean!
    
    # Project
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    
    # Task
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
    
    # Document
    createDocument(input: CreateDocumentInput!): Document!
    updateDocument(id: ID!, input: UpdateDocumentInput!): Document!
    deleteDocument(id: ID!): Boolean!
    
    # Wireframe
    createWireframe(input: CreateWireframeInput!): Wireframe!
    updateWireframe(id: ID!, input: UpdateWireframeInput!): Wireframe!
    deleteWireframe(id: ID!): Boolean!
    
    # Comment
    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: ID!, input: UpdateCommentInput!): Comment!
    deleteComment(id: ID!): Boolean!
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  input SignUpInput {
    email: String!
    password: String!
    name: String
  }

  input SignInInput {
    email: String!
    password: String!
  }

  input CreateWorkspaceInput {
    name: String!
    slug: String!
    description: String
  }

  input UpdateWorkspaceInput {
    name: String
    description: String
    avatar: String
  }

  input CreateProjectInput {
    name: String!
    description: String
    color: String
    privacy: Privacy
    workspaceId: ID!
  }

  input UpdateProjectInput {
    name: String
    description: String
    color: String
    privacy: Privacy
    status: Status
    startDate: DateTime
    endDate: DateTime
  }

  input CreateTaskInput {
    title: String!
    description: String
    priority: Priority
    dueDate: DateTime
    projectId: ID!
    assigneeId: ID
    parentId: ID
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: TaskStatus
    priority: Priority
    dueDate: DateTime
    assigneeId: ID
  }

  input CreateDocumentInput {
    title: String!
    content: JSON
    type: DocumentType
    projectId: ID!
  }

  input UpdateDocumentInput {
    title: String
    content: JSON
    type: DocumentType
  }

  input CreateWireframeInput {
    title: String!
    data: JSON!
    thumbnail: String
    projectId: ID!
  }

  input UpdateWireframeInput {
    title: String
    data: JSON
    thumbnail: String
  }

  input CreateCommentInput {
    content: String!
    taskId: ID
    documentId: ID
    wireframeId: ID
    mentions: [ID!]
  }

  input UpdateCommentInput {
    content: String!
  }
`

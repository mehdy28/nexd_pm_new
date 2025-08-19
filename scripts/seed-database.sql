-- Seed script for NEXD.PM database
-- Run this after setting up your database

-- Insert sample users
INSERT INTO users (id, email, name, password, role, created_at, updated_at) VALUES
('user_1', 'admin@nexd.pm', 'Admin User', '$2a$12$LQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yq', 'ADMIN', NOW(), NOW()),
('user_2', 'john@nexd.pm', 'John Doe', '$2a$12$LQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yq', 'MEMBER', NOW(), NOW()),
('user_3', 'jane@nexd.pm', 'Jane Smith', '$2a$12$LQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yqBWVHxkd0LQ4YCOuLQv3c1yq', 'MEMBER', NOW(), NOW());

-- Insert sample workspaces
INSERT INTO workspaces (id, name, slug, description, plan, owner_id, created_at, updated_at) VALUES
('workspace_1', 'NEXD Team', 'nexd-team', 'Main workspace for NEXD.PM development', 'PRO', 'user_1', NOW(), NOW()),
('workspace_2', 'Client Projects', 'client-projects', 'Workspace for client work', 'FREE', 'user_2', NOW(), NOW());

-- Insert workspace members
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES
('wm_1', 'workspace_1', 'user_1', 'OWNER', NOW()),
('wm_2', 'workspace_1', 'user_2', 'ADMIN', NOW()),
('wm_3', 'workspace_1', 'user_3', 'MEMBER', NOW()),
('wm_4', 'workspace_2', 'user_2', 'OWNER', NOW());

-- Insert workspace settings
INSERT INTO workspace_settings (id, workspace_id, allow_guest_access, default_project_privacy, time_zone) VALUES
('ws_1', 'workspace_1', false, 'PRIVATE', 'UTC'),
('ws_2', 'workspace_2', true, 'PUBLIC', 'UTC');

-- Insert sample projects
INSERT INTO projects (id, name, description, color, privacy, status, workspace_id, created_at, updated_at) VALUES
('project_1', 'NEXD.PM Platform', 'Main platform development', '#4ECDC4', 'PRIVATE', 'ACTIVE', 'workspace_1', NOW(), NOW()),
('project_2', 'Mobile App', 'iOS and Android mobile application', '#FF6B6B', 'PRIVATE', 'ACTIVE', 'workspace_1', NOW(), NOW()),
('project_3', 'Client Website', 'Corporate website redesign', '#4ECDC4', 'PUBLIC', 'ACTIVE', 'workspace_2', NOW(), NOW());

-- Insert project members
INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES
('pm_1', 'project_1', 'user_1', 'OWNER', NOW()),
('pm_2', 'project_1', 'user_2', 'ADMIN', NOW()),
('pm_3', 'project_1', 'user_3', 'MEMBER', NOW()),
('pm_4', 'project_2', 'user_1', 'OWNER', NOW()),
('pm_5', 'project_2', 'user_3', 'MEMBER', NOW()),
('pm_6', 'project_3', 'user_2', 'OWNER', NOW());

-- Insert sample tasks
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, created_at, updated_at) VALUES
('task_1', 'Setup Authentication System', 'Implement user authentication with NextAuth.js', 'IN_PROGRESS', 'HIGH', 'project_1', 'user_2', 'user_1', NOW(), NOW()),
('task_2', 'Design Database Schema', 'Create comprehensive Prisma schema', 'DONE', 'HIGH', 'project_1', 'user_1', 'user_1', NOW(), NOW()),
('task_3', 'Build GraphQL API', 'Implement GraphQL resolvers and mutations', 'TODO', 'MEDIUM', 'project_1', 'user_3', 'user_1', NOW(), NOW()),
('task_4', 'Mobile UI Components', 'Create reusable React Native components', 'TODO', 'MEDIUM', 'project_2', 'user_3', 'user_1', NOW(), NOW()),
('task_5', 'Homepage Design', 'Design and implement homepage layout', 'IN_PROGRESS', 'HIGH', 'project_3', 'user_2', 'user_2', NOW(), NOW());

-- Insert sample labels
INSERT INTO labels (id, name, color, workspace_id) VALUES
('label_1', 'Bug', '#FF4444', 'workspace_1'),
('label_2', 'Feature', '#4ECDC4', 'workspace_1'),
('label_3', 'Enhancement', '#FFD93D', 'workspace_1'),
('label_4', 'Documentation', '#6BCF7F', 'workspace_1'),
('label_5', 'Urgent', '#FF6B6B', 'workspace_1');

-- Insert task labels
INSERT INTO task_labels (task_id, label_id) VALUES
('task_1', 'label_2'),
('task_1', 'label_5'),
('task_2', 'label_2'),
('task_3', 'label_2'),
('task_4', 'label_2'),
('task_5', 'label_3');

-- Insert sample documents
INSERT INTO documents (id, title, content, type, project_id, created_at, updated_at) VALUES
('doc_1', 'Project Requirements', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Project Requirements"}]},{"type":"paragraph","content":[{"type":"text","text":"This document outlines the requirements for the NEXD.PM platform."}]}]}', 'RICH_TEXT', 'project_1', NOW(), NOW()),
('doc_2', 'API Documentation', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"API Documentation"}]},{"type":"paragraph","content":[{"type":"text","text":"GraphQL API endpoints and usage examples."}]}]}', 'RICH_TEXT', 'project_1', NOW(), NOW()),
('doc_3', 'Design Guidelines', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Design Guidelines"}]},{"type":"paragraph","content":[{"type":"text","text":"Brand colors, typography, and component guidelines."}]}]}', 'RICH_TEXT', 'project_3', NOW(), NOW());

-- Insert sample wireframes
INSERT INTO wireframes (id, title, data, thumbnail, project_id, created_at, updated_at) VALUES
('wireframe_1', 'Dashboard Layout', '{"elements":[{"type":"rectangle","x":0,"y":0,"width":1200,"height":800,"fill":"#f5f5f5"},{"type":"text","x":50,"y":50,"text":"Dashboard","fontSize":24}]}', '/placeholder.svg?height=200&width=300', 'project_1', NOW(), NOW()),
('wireframe_2', 'Mobile App Flow', '{"elements":[{"type":"rectangle","x":0,"y":0,"width":375,"height":812,"fill":"#ffffff"},{"type":"text","x":20,"y":100,"text":"Mobile App","fontSize":18}]}', '/placeholder.svg?height=200&width=150', 'project_2', NOW(), NOW()),
('wireframe_3', 'Website Homepage', '{"elements":[{"type":"rectangle","x":0,"y":0,"width":1440,"height":900,"fill":"#ffffff"},{"type":"text","x":50,"y":50,"text":"Homepage","fontSize":32}]}', '/placeholder.svg?height=200&width=320', 'project_3', NOW(), NOW());

-- Insert sample comments
INSERT INTO comments (id, content, author_id, task_id, created_at, updated_at) VALUES
('comment_1', 'Great progress on the authentication system! The JWT implementation looks solid.', 'user_1', 'task_1', NOW(), NOW()),
('comment_2', 'Should we consider adding OAuth providers like Google and GitHub?', 'user_3', 'task_1', NOW(), NOW()),
('comment_3', 'The database schema is comprehensive. Nice work on the relationships!', 'user_2', 'task_2', NOW(), NOW()),
('comment_4', 'I can help with the GraphQL resolvers once the schema is finalized.', 'user_3', 'task_3', NOW(), NOW());

-- Insert sample activities
INSERT INTO activities (id, type, data, user_id, project_id, task_id, created_at) VALUES
('activity_1', 'TASK_CREATED', '{"taskTitle":"Setup Authentication System"}', 'user_1', 'project_1', 'task_1', NOW()),
('activity_2', 'TASK_UPDATED', '{"taskTitle":"Setup Authentication System","field":"status","oldValue":"TODO","newValue":"IN_PROGRESS"}', 'user_2', 'project_1', 'task_1', NOW()),
('activity_3', 'TASK_COMPLETED', '{"taskTitle":"Design Database Schema"}', 'user_1', 'project_1', 'task_2', NOW()),
('activity_4', 'PROJECT_CREATED', '{"projectName":"NEXD.PM Platform"}', 'user_1', 'project_1', NULL, NOW()),
('activity_5', 'COMMENT_ADDED', '{"commentContent":"Great progress on the authentication system!"}', 'user_1', 'project_1', 'task_1', NOW());

-- Insert sample subscriptions
INSERT INTO subscriptions (id, plan, status, current_period_end, cancel_at_period_end, workspace_id, created_at, updated_at) VALUES
('sub_1', 'PRO', 'ACTIVE', '2024-12-31 23:59:59', false, 'workspace_1', NOW(), NOW());

// src/hooks/usePromptDataLookups.ts
import { useQuery } from '@apollo/client';
import {
  GET_PROJECT_SPRINTS_LOOKUP_QUERY,
  GET_PROJECT_MEMBERS_LOOKUP_QUERY,
  GET_PROJECT_TASKS_LOOKUP_QUERY,
  GET_PROJECT_DOCUMENTS_LOOKUP_QUERY,
  GET_WORKSPACE_DATA_LOOKUP_QUERY
} from '@/graphql/queries/projectPromptVariablesQuerries';


export interface ProjectMemberLookupItem {
    id: string; // ProjectMember ID
    role: string;
    user: {
      id: string; // User ID
      firstName?: string | null;
      lastName?: string | null;
      email: string;
      avatar?: string | null;
    };
}

export interface SprintLookupItem {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
}

export interface TaskLookupItem {
    id: string;
    title: string;
    status: string;
    priority: string;
    endDate?: string | null;
    dueDate?: string | null;
    assignee?: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
    } | null;
    sprint?: {
        id: string;
        name: string;
    } | null;
}

export interface DocumentLookupItem {
    id: string;
    title: string;
    updatedAt: string;
    type: string; // "doc" or "pdf"
}

export interface WorkspaceLookupData {
  id: string;
  name: string;
  owner: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  members: Array<{
    id: string; // WorkspaceMember ID
    role: string;
    user: {
      id: string; // User ID
      firstName?: string | null;
      lastName?: string | null;
      email: string;
    };
  }>;
}


interface UsePromptDataLookupsProps {
  projectId?: string | null;
  workspaceId?: string | null; // Needed for workspace data
  selectedEntityType?: 'PROJECT' | 'TASK' | 'SPRINT' | 'DOCUMENT' | 'MEMBER' | 'WORKSPACE' | 'USER' | 'DATE_FUNCTION' | null;
}

export const usePromptDataLookups = ({ projectId, workspaceId, selectedEntityType }: UsePromptDataLookupsProps) => {

  // Fetch sprints for lookup
  const { data: sprintsLookupData, loading: sprintsLoading, error: sprintsError } = useQuery<{ getProjectSprintsLookup: SprintLookupItem[] }>(
    GET_PROJECT_SPRINTS_LOOKUP_QUERY,
    {
      variables: { projectId: projectId! },
      skip: !projectId || selectedEntityType !== 'SPRINT',
      fetchPolicy: 'network-only',
    }
  );

  // Fetch project members for lookup
  const { data: membersLookupData, loading: membersLoading, error: membersError } = useQuery<{ getProjectMembersLookup: ProjectMemberLookupItem[] }>(
    GET_PROJECT_MEMBERS_LOOKUP_QUERY,
    {
      variables: { projectId: projectId! },
      skip: !projectId || selectedEntityType !== 'MEMBER',
      fetchPolicy: 'network-only',
    }
  );

  // Fetch tasks for lookup (potentially filtered by sprint, if that becomes an advanced filter in UI)
  const { data: tasksLookupData, loading: tasksLoading, error: tasksError } = useQuery<{ getProjectTasksLookup: TaskLookupItem[] }>(
    GET_PROJECT_TASKS_LOOKUP_QUERY,
    {
      variables: { projectId: projectId! },
      skip: !projectId || selectedEntityType !== 'TASK',
      fetchPolicy: 'network-only',
    }
  );

  // Fetch documents for lookup
  const { data: documentsLookupData, loading: documentsLoading, error: documentsError } = useQuery<{ getProjectDocumentsLookup: DocumentLookupItem[] }>(
    GET_PROJECT_DOCUMENTS_LOOKUP_QUERY,
    {
      variables: { projectId: projectId! },
      skip: !projectId || selectedEntityType !== 'DOCUMENT',
      fetchPolicy: 'network-only',
    }
  );

  // Fetch workspace data for lookup
  const { data: workspaceLookupData, loading: workspaceLoading, error: workspaceError } = useQuery<{ getWorkspaceDataLookup: WorkspaceLookupData }>(
    GET_WORKSPACE_DATA_LOOKUP_QUERY,
    {
      variables: { workspaceId: workspaceId! },
      skip: !workspaceId || selectedEntityType !== 'WORKSPACE',
      fetchPolicy: 'network-only',
    }
  );


  const loading = sprintsLoading || membersLoading || tasksLoading || documentsLoading || workspaceLoading;
  const error = sprintsError || membersError || tasksError || documentsError || workspaceError;

  return {
    sprints: sprintsLookupData?.getProjectSprintsLookup || [],
    members: membersLookupData?.getProjectMembersLookup || [],
    tasks: tasksLookupData?.getProjectTasksLookup || [],
    documents: documentsLookupData?.getProjectDocumentsLookup || [],
    workspace: workspaceLookupData?.getWorkspaceDataLookup || null,
    loading,
    error,
  };
};

import { useMutation } from '@apollo/client'; // Removed ApolloCache
// Removed: import { GET_PROJECT_DETAILS_QUERY } from '@/graphql/queries/getProjectDetails';
import { SprintStatus, SprintDetailsFragment } from '@/types/sprint';
import {
  CREATE_SPRINT,
  UPDATE_SPRINT,
  DELETE_SPRINT,
} from '@/graphql/mutations/sprintMutations';

// --- Type Definitions (retained from previous iteration for clarity) ---
interface CreateSprintInput {
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: SprintStatus;
}

interface UpdateSprintInput {
  id: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCompleted?: boolean;
  status?: SprintStatus;
}

interface CreateSprintResponse {
  createSprint: SprintDetailsFragment;
}

interface UpdateSprintResponse {
  updateSprint: SprintDetailsFragment;
}

interface DeleteSprintResponse {
  deleteSprint: SprintDetailsFragment;
}
// Removed: interface GetProjectDetailsResponse {...}

// --- End Type Definitions ---


export function useSprintMutations(projectId: string) { // projectId is no longer used here internally, but kept for consistency if component still passes it

  // Removed updateProjectDetailsCache helper

  const [createSprint, { loading: createLoading, error: createError }] = useMutation<CreateSprintResponse, { input: CreateSprintInput }>(
    CREATE_SPRINT,
    {
      // Removed optimisticResponse
      // Removed update function
    }
  );

  const [updateSprint, { loading: updateLoading, error: updateError }] = useMutation<UpdateSprintResponse, { input: UpdateSprintInput }>(
    UPDATE_SPRINT,
    {
      // Removed optimisticResponse
      // Removed update function
    }
  );

  const [deleteSprint, { loading: deleteLoading, error: deleteError }] = useMutation<DeleteSprintResponse, { id: string }>(
    DELETE_SPRINT,
    {
      // Removed optimisticResponse
      // Removed update function
    }
  );

  return {
    createSprint,
    createLoading,
    createError,
    updateSprint,
    updateLoading,
    updateError,
    deleteSprint,
    deleteLoading,
    deleteError,
  };
}
import { useMutation } from '@apollo/client';
import { DELETE_PROJECT_MUTATION } from '@/graphql/mutations/delete-project';
import { UPDATE_PROJECT_MUTATION } from '@/graphql/mutations/update-project';

// This input type should align with your GraphQL schema's UpdateProjectInput
interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  status?: string; // e.g., 'PLANNING', 'ACTIVE', etc.
}

export const useProjectMutations = () => {
  const [updateProjectMutation, { loading: updateLoading, error: updateError }] = useMutation(UPDATE_PROJECT_MUTATION);
  const [deleteProjectMutation, { loading: deleteLoading, error: deleteError }] = useMutation(DELETE_PROJECT_MUTATION);

  const updateProject = async (input: UpdateProjectInput) => {
    try {
      const response = await updateProjectMutation({
        variables: { input },
      });
      return response.data.updateProject;
    } catch (e) {
      console.error("Error updating project:", e);
      throw e;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await deleteProjectMutation({
        variables: { id },
        // It's good practice to update the cache after a deletion
        update: (cache) => {
          // Evict the project from the cache
          const normalizedId = cache.identify({ id, __typename: 'Project' });
          cache.evict({ id: normalizedId });
          cache.gc();
        },
      });
      return response.data.deleteProject;
    } catch (e) {
      console.error("Error deleting project:", e);
      throw e;
    }
  };

  return {
    updateProject,
    deleteProject,
    loading: updateLoading || deleteLoading,
    error: updateError || deleteError,
  };
};
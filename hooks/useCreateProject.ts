// hooks/useCreateProject.ts
import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@apollo/client";
import { CREATE_PROJECT_MUTATION } from "@/graphql/mutations/createProject";
import { GET_WORKSPACE_DATA_QUERY } from "@/graphql/queries/getWorkspaceData"; // To refetch workspace data

// Define the shape of the data that the mutation returns (matching your GraphQL schema)
interface ProjectMutationResponse {
  createProject: {
    id: string;
    name: string;
    description?: string;
    status: string;
    color: string;
    createdAt: string;
    members: Array<{
      id: string;
      role: string;
      user: { id: string; email: string };
    }>;
    sprints: Array<{
      id: string;
      name: string;
      startDate: string;
    }>;
    sections: Array<{
      id: string;
      name: string;
      order: number;
    }>;
  };
}

// Arguments for the mutation
interface CreateProjectVariables {
  workspaceId: string;
  name: string;
  description?: string;
}

export function useCreateProjectModal(
  currentWorkspaceId: string, // Pass the current active workspace ID to the hook
  onClose: () => void,
  onProjectCreated?: (projectId: string) => void
) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [createProjectMutation, { loading, error, data: mutationData }] = useMutation<
    ProjectMutationResponse,
    CreateProjectVariables
  >(CREATE_PROJECT_MUTATION, {
    // Optimistic UI or refetchQueries can go here
    refetchQueries: [
      GET_WORKSPACE_DATA_QUERY, // Refetch the workspace data to get updated project list and counts
      "GetWorkspaceData", // Query name
    ],
  });

  // Reset form when modal opens/closes or workspace changes
  useEffect(() => {
    setProjectName("");
    setProjectDescription("");
  }, [onClose, currentWorkspaceId]);


  // Handle successful mutation
  useEffect(() => {
    if (mutationData?.createProject?.id) {
      console.log("Project created successfully:", mutationData.createProject);
      onProjectCreated?.(mutationData.createProject.id); // Call optional callback
      onClose(); // Close the modal
    }
    if (error) {
      console.error("Error creating project:", error);
      // You might want to display a toast or error message to the user
    }
  }, [mutationData, error, onClose, onProjectCreated]);

  const handleSubmit = useCallback(async () => {
    if (!projectName.trim()) {
      // Basic client-side validation
      console.error("Project name cannot be empty.");
      return;
    }

    if (!currentWorkspaceId) {
      console.error("Current workspace ID is not available.");
      return;
    }

    try {
      await createProjectMutation({
        variables: {
          workspaceId: currentWorkspaceId,
          name: projectName,
          description: projectDescription.trim() === "" ? undefined : projectDescription.trim(),
        },
      });
      // The useEffect will handle closing the modal and other post-mutation actions
    } catch (e) {
      // Error is already captured by the useMutation hook and propagated to the error state.
      // You can add more specific error handling here if needed.
      console.error("Mutation submission failed:", e);
    }
  }, [projectName, projectDescription, currentWorkspaceId, createProjectMutation, onClose, onProjectCreated]);

  return {
    projectName,
    setProjectName,
    projectDescription,
    setProjectDescription,
    handleSubmit,
    loading, // Expose loading state for the button
    error,   // Expose error state for feedback
  };
}
// hooks/useSetupWorkspaceAndProject.ts
import { useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import { initializeApollo } from "@/lib/apollo-client";
import { useToast } from "@/components/ui/use-toast";

const SETUP_WORKSPACE_AND_PROJECT_MUTATION = gql`
  mutation SetupWorkspaceAndProject($input: SetupInput!) {
    setupWorkspaceAndProject(input: $input) {
      id
      name
      slug
      description
      ownerId
      projects {
        id
        name
        description
      }
    }
  }
`;

export const useSetupWorkspaceAndProject = () => {
  const [setupWorkspaceAndProject, { loading, error }] = useMutation(SETUP_WORKSPACE_AND_PROJECT_MUTATION);
    const { toast } = useToast()

  const handleSetupWorkspaceAndProject = async (input: { workspaceName: string; workspaceDescription?: string; projectName: string; projectDescription?: string }) => {
    try {
       const apolloClient = initializeApollo();
      const { data } = await apolloClient.mutate({
        mutation: SETUP_WORKSPACE_AND_PROJECT_MUTATION,
        variables: { input },
      });

      toast({
            title: "Workspace and Project created!",
            description: "We've created your workspace and project for you.",
          })
      return data?.setupWorkspaceAndProject;
    } catch (err:any) {
      console.error("Error creating user:", err);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: err.message,
          })
      return null;
    }
  };

  return { setupWorkspaceAndProject: handleSetupWorkspaceAndProject, loading, error };
};
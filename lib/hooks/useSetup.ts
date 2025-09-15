import { useMutation, gql } from "@apollo/client";

const SETUP_WORKSPACE_PROJECT = gql`
  mutation SetupWorkspaceAndProject($input: SetupInput!) {
    setupWorkspaceAndProject(input: $input) {
      id
      name
      slug
      description
      owner {
        id
        firstName
        lastName
      }
      members {
        id
        role
        user {
          id
          firstName
          lastName
        }
      }
      projects {
        id
        name
        members {
          id
          role
          user {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`;

export const useSetup = () => {
  const [setupWorkspaceAndProject, { data, loading, error }] = useMutation(
    SETUP_WORKSPACE_PROJECT
  );

  const createSetup = async (input: {
    workspaceName: string;
    workspaceDescription?: string;
    projectName: string;
    projectDescription?: string;
  }) => {
    return setupWorkspaceAndProject({ variables: { input } });
  };

  return { createSetup, data, loading, error };
};

//hooks/useModelProfiles.ts
import { gql, useMutation, useQuery } from '@apollo/client';

// -----------------------------------
// Interfaces
// -----------------------------------

interface ModelProfile {
  id: string;
  name: string;
  provider?: string | null;
  enhancementInstructions: string;
}

// Get Single
interface GetModelProfileData {
  modelProfile: ModelProfile;
}

interface GetModelProfileVars {
  id: string;
}

// Get Many
interface GetModelProfilesData {
  modelProfiles: ModelProfile[];
}

// Create Single
interface CreateModelProfileData {
  createModelProfile: ModelProfile;
}

interface CreateModelProfileVars {
  name: string;
  provider?: string;
  enhancementInstructions: string;
}

// Create Many
interface ModelProfileCreateManyInput {
  name: string;
  provider?: string;
  enhancementInstructions: string;
}

interface CreateManyModelProfilesData {
  createManyModelProfiles: {
    count: number;
  };
}

interface CreateManyModelProfilesVars {
  data: ModelProfileCreateManyInput[];
}


// Update Single
interface UpdateModelProfileData {
  updateModelProfile: ModelProfile;
}

interface UpdateModelProfileVars {
  id: string;
  name?: string;
  provider?: string;
  enhancementInstructions?: string;
}

// Update Many
interface ModelProfileUpdateManyInput {
    name?: string;
    provider?: string;
    enhancementInstructions?: string;
}

interface UpdateManyModelProfilesData {
    updateManyModelProfiles: {
        count: number;
    };
}

interface UpdateManyModelProfilesVars {
    ids: string[];
    data: ModelProfileUpdateManyInput;
}

// Delete Single
interface DeleteModelProfileData {
  deleteModelProfile: ModelProfile;
}

interface DeleteModelProfileVars {
  id: string;
}

// Delete Many
interface DeleteManyModelProfilesData {
    deleteManyModelProfiles: {
        count: number;
    };
}

interface DeleteManyModelProfilesVars {
    ids: string[];
}


// -----------------------------------
// GraphQL Queries & Mutations
// -----------------------------------

export const GET_MODEL_PROFILE_QUERY = gql`
  query GetModelProfile($id: ID!) {
    modelProfile(id: $id) {
      id
      name
      provider
      enhancementInstructions
    }
  }
`;

export const GET_MODEL_PROFILES_QUERY = gql`
  query GetModelProfiles {
    modelProfiles {
      id
      name
      provider
      enhancementInstructions
    }
  }
`;

export const CREATE_MODEL_PROFILE_MUTATION = gql`
  mutation CreateModelProfile($name: String!, $provider: String, $enhancementInstructions: String!) {
    createModelProfile(data: {
      name: $name,
      provider: $provider,
      enhancementInstructions: $enhancementInstructions
    }) {
      id
      name
      provider
      enhancementInstructions
    }
  }
`;

export const CREATE_MANY_MODEL_PROFILES_MUTATION = gql`
    mutation CreateManyModelProfiles($data: [ModelProfileCreateManyInput!]!) {
        createManyModelProfiles(data: $data) {
            count
        }
    }
`;


export const UPDATE_MODEL_PROFILE_MUTATION = gql`
  mutation UpdateModelProfile($id: ID!, $name: String, $provider: String, $enhancementInstructions: String) {
    updateModelProfile(
      id: $id,
      data: {
        name: $name,
        provider: $provider,
        enhancementInstructions: $enhancementInstructions
      }
    ) {
      id
      name
      provider
      enhancementInstructions
    }
  }
`;

export const UPDATE_MANY_MODEL_PROFILES_MUTATION = gql`
    mutation UpdateManyModelProfiles($ids: [ID!]!, $data: ModelProfileUpdateManyInput!) {
        updateManyModelProfiles(ids: $ids, data: $data) {
            count
        }
    }
`;

export const DELETE_MODEL_PROFILE_MUTATION = gql`
  mutation DeleteModelProfile($id: ID!) {
    deleteModelProfile(id: $id) {
      id
    }
  }
`;

export const DELETE_MANY_MODEL_PROFILES_MUTATION = gql`
    mutation DeleteManyModelProfiles($ids: [ID!]!) {
        deleteManyModelProfiles(ids: $ids) {
            count
        }
    }
`;

// -----------------------------------
// Hooks
// -----------------------------------

// --- Query Hooks ---

export const useGetModelProfile = (id: string) => {
  const { data, loading, error } = useQuery<GetModelProfileData, GetModelProfileVars>(GET_MODEL_PROFILE_QUERY, {
    variables: { id },
    skip: !id,
  });

  return {
    model: data?.modelProfile,
    loading,
    error,
  };
};


export const useGetModelProfiles = () => {
  const { data, loading, error, refetch } = useQuery<GetModelProfilesData>(GET_MODEL_PROFILES_QUERY);

  return {
    models: data?.modelProfiles || [],
    loading,
    error,
    refetch,
  };
};


// --- Mutation Hooks ---

export const useCreateModelProfile = () => {
    return useMutation<CreateModelProfileData, CreateModelProfileVars>(CREATE_MODEL_PROFILE_MUTATION, {
      refetchQueries: [{ query: GET_MODEL_PROFILES_QUERY }],
    });
};

export const useCreateManyModelProfiles = () => {
    return useMutation<CreateManyModelProfilesData, CreateManyModelProfilesVars>(CREATE_MANY_MODEL_PROFILES_MUTATION, {
        refetchQueries: [{ query: GET_MODEL_PROFILES_QUERY }],
    });
};

export const useUpdateModelProfile = () => {
    return useMutation<UpdateModelProfileData, UpdateModelProfileVars>(UPDATE_MODEL_PROFILE_MUTATION);
};

export const useUpdateManyModelProfiles = () => {
    return useMutation<UpdateManyModelProfilesData, UpdateManyModelProfilesVars>(UPDATE_MANY_MODEL_PROFILES_MUTATION, {
        refetchQueries: [{ query: GET_MODEL_PROFILES_QUERY }],
    });
};

export const useDeleteModelProfile = () => {
    return useMutation<DeleteModelProfileData, DeleteModelProfileVars>(DELETE_MODEL_PROFILE_MUTATION, {
        update(cache, { data }) {
            if (!data?.deleteModelProfile) return;

            const deletedId = data.deleteModelProfile.id;
            const existingProfiles = cache.readQuery<GetModelProfilesData>({ query: GET_MODEL_PROFILES_QUERY });

            if (existingProfiles) {
                cache.writeQuery({
                    query: GET_MODEL_PROFILES_QUERY,
                    data: {
                        modelProfiles: existingProfiles.modelProfiles.filter(profile => profile.id !== deletedId),
                    },
                });
            }
        },
    });
};

export const useDeleteManyModelProfiles = () => {
    return useMutation<DeleteManyModelProfilesData, DeleteManyModelProfilesVars>(DELETE_MANY_MODEL_PROFILES_MUTATION, {
        refetchQueries: [{ query: GET_MODEL_PROFILES_QUERY }],
    });
};
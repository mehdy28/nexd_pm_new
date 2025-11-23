import { useQuery, useMutation, NetworkStatus, Reference } from "@apollo/client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { GET_PROJECT_WIREFRAMES, GET_WIREFRAME_DETAILS } from "@/graphql/queries/wireframes"; 
import { CREATE_WIREFRAME, UPDATE_WIREFRAME, DELETE_WIREFRAME } from "@/graphql/mutations/wireframes";
import {
  CREATE_PERSONAL_WIREFRAME,
} from "@/graphql/mutations/personal/personalWireframes";


type JsonScalar = any;

export type WireframeListItem = {
  id: string;
  title: string;
  updatedAt: string;
  thumbnail: string | null;
  projectId: string | null;
};

export type WireframeDetails = {
  id: string;
  title: string;
  data: JsonScalar;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
  } | null
};

type CreateWireframeInput = {
  projectId: string;
  title: string;
  data: JsonScalar;
  thumbnail?: string | null;
};

type UpdateWireframeInput = {
  id: string;
  title?: string;
  data?: JsonScalar;
  thumbnail?: string | null;
};

// --- PROJECT HOOK ---
export const useProjectWireframes = (projectId?: string) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const listVariables = useMemo(() => ({
    projectId,
    search: debouncedSearch,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }), [projectId, debouncedSearch, page, pageSize]);

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_PROJECT_WIREFRAMES, {
    variables: listVariables,
    skip: !projectId,
    fetchPolicy: "network-only", // Changed to network-only for consistent list updates
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const wireframes = useMemo(() => data?.getProjectWireframes?.wireframes || [], [data]);
  const totalCount = useMemo(() => data?.getProjectWireframes?.totalCount || 0, [data]);

  const [createWireframeMutation] = useMutation(CREATE_WIREFRAME, {
    // FIX 1: Use dynamic variables for refetching the current list state
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: listVariables }],
  });
  
  const [updateWireframeMutation] = useMutation(UPDATE_WIREFRAME);
  
  const [deleteWireframeMutation] = useMutation(DELETE_WIREFRAME, {
    // FIX 2: Added refetchQueries for DELETE to ensure proper pagination calculation 
    // when using network-only fetching. Retaining cache update for quick UI response.
    update(cache, { data: { deleteWireframe } }) {
      if (!deleteWireframe) return;
      cache.modify({
        fields: {
          getProjectWireframes(existing = { wireframes: [], totalCount: 0 }, { readField }) {
            return {
              ...existing,
              totalCount: existing.totalCount - 1,
              wireframes: existing.wireframes.filter(
                (wRef: Reference) => deleteWireframe.id !== readField("id", wRef)
              ),
            };
          },
        },
      });
    },
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: listVariables }],
  });

  const createWireframe = useCallback(async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      // projectId is correctly included here in the input object: { projectId, title, data: initialData, thumbnail }
      if (!projectId) throw new Error("projectId is required.");
      const { data } = await createWireframeMutation({ variables: { input: { projectId, title, data: initialData, thumbnail } } });
      return data?.createWireframe;
    }, [projectId, createWireframeMutation]);

  const updateWireframe = useCallback(async (id: string, updates: Omit<UpdateWireframeInput, "id">) => {
      // NOTE: Relying on cache normalization to update the list item title/thumbnail
      const { data } = await updateWireframeMutation({ variables: { input: { id, ...updates } } });
      return data?.updateWireframe;
    }, [updateWireframeMutation]);

  const deleteWireframe = useCallback(async (id: string) => {
      const { data } = await deleteWireframeMutation({ variables: { id } });
      return data?.deleteWireframe;
    }, [deleteWireframeMutation]);

  return {
    wireframes,
    totalCount,
    loading: loading || networkStatus === NetworkStatus.refetch,
    error: error as any,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetch,
    createWireframe,
    updateWireframe,
    deleteWireframe,
  };
};

// --- PERSONAL HOOK ---
export const usePersonalWireframes = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const listVariables = useMemo(() => ({
    search: debouncedSearch,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }), [debouncedSearch, page, pageSize]);

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_PROJECT_WIREFRAMES, {
    variables: listVariables,
    fetchPolicy: "network-only", // Changed to network-only for consistent list updates
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const wireframes = useMemo(() => data?.getMyWireframes?.wireframes || [], [data]);
  const totalCount = useMemo(() => data?.getMyWireframes?.totalCount || 0, [data]);

  const [createWireframeMutation] = useMutation(CREATE_PERSONAL_WIREFRAME, {
     // FIX 3: Use dynamic variables for refetching the current list state
     refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: listVariables }],
  });

  const [updateWireframeMutation] = useMutation(UPDATE_WIREFRAME); 

  const [deleteWireframeMutation] = useMutation(DELETE_WIREFRAME, {
    update(cache, { data: { deletePersonalWireframe } }) {
      if (!deletePersonalWireframe) return;
      cache.modify({
        fields: {
          getMyWireframes(existing = { wireframes: [], totalCount: 0 }, { readField }) {
            return {
              ...existing,
              totalCount: existing.totalCount - 1,
              wireframes: existing.wireframes.filter(
                (wRef: Reference) => deletePersonalWireframe.id !== readField("id", wRef)
              ),
            };
          },
        },
      });
    },
    // FIX 4: Add refetchQueries for DELETE for network-only fetch policy
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: listVariables }],
  });

  const createWireframe = useCallback(
    async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      const { data } = await createWireframeMutation({
        variables: { input: { title, data: initialData, thumbnail } },
      });
      return data?.createPersonalWireframe;
    },
    [createWireframeMutation]
  );

  const updateWireframe = useCallback(
    async (id: string, updates: Omit<UpdateWireframeInput, "id">) => {
      // NOTE: We assume the mutation response includes the updated object 
      // which allows Apollo to automatically update the item in the list cache.
      const { data } = await updateWireframeMutation({ variables: { input: { id, ...updates } } });
      // The return type suggests personal wireframe mutation returns `updatePersonalWireframe`
      return data?.updateWireframe; 
    },
    [updateWireframeMutation]
  );

  const deleteWireframe = useCallback(
    async (id: string) => {
      const { data } = await deleteWireframeMutation({ variables: { id } });
      return data?.deleteWireframe;
    },
    [deleteWireframeMutation]
  );

  return {
    wireframes,
    totalCount,
    loading: loading || networkStatus === NetworkStatus.refetch,
    error: error as any,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetch,
    createWireframe,
    updateWireframe,
    deleteWireframe,
  };
};

// --- DETAILS HOOK ---
export const useWireframeDetails = (wireframeId: string | null) => {
  // FIX 5: Use the generic GET_WIREFRAME_DETAILS query, suitable for both project and personal details.
  const { data, loading, error, refetch } = useQuery<{ getWireframeDetails: WireframeDetails }>(
    GET_WIREFRAME_DETAILS,
    {
      variables: { id: wireframeId! },
      skip: !wireframeId,
      fetchPolicy: "network-only",
    }
  );

  return {
    wireframe: data?.getWireframeDetails,
    loading,
    error,
    refetch,
  };
};
// src/hooks/useWireframes.ts
import { useQuery, useMutation, NetworkStatus, Reference } from "@apollo/client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { GET_PROJECT_WIREFRAMES, GET_WIREFRAME_DETAILS } from "@/graphql/queries/wireframes";
import { CREATE_WIREFRAME, UPDATE_WIREFRAME, DELETE_WIREFRAME } from "@/graphql/mutations/wireframes";
import { GET_MY_WIREFRAMES, GET_WIREFRAME_DETAILS as GET_PERSONAL_WIREFRAME_DETAILS } from "@/graphql/queries/personal/personalWireframes";
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

export const useProjectWireframes = (projectId?: string) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_PROJECT_WIREFRAMES, {
    variables: {
      projectId,
      search: debouncedSearch,
      skip: (page - 1) * pageSize,
      take: pageSize,
    },
    skip: !projectId,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const wireframes = useMemo(() => data?.getProjectWireframes?.wireframes || [], [data]);
  const totalCount = useMemo(() => data?.getProjectWireframes?.totalCount || 0, [data]);

  const [createWireframeMutation] = useMutation(CREATE_WIREFRAME, {
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: { projectId, search: "", skip: 0, take: pageSize } }],
  });
  
  // This mutation should NOT refetch the entire list.
  const [updateWireframeMutation] = useMutation(UPDATE_WIREFRAME);
  
  const [deleteWireframeMutation] = useMutation(DELETE_WIREFRAME, {
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
  });

  const createWireframe = useCallback(async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      if (!projectId) throw new Error("projectId is required.");
      const { data } = await createWireframeMutation({ variables: { input: { projectId, title, data: initialData, thumbnail } } });
      return data?.createWireframe;
    }, [projectId, createWireframeMutation]);

  const updateWireframe = useCallback(async (id: string, updates: Omit<UpdateWireframeInput, "id">) => {
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
    error,
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

export const usePersonalWireframes = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_MY_WIREFRAMES, {
    variables: {
      search: debouncedSearch,
      skip: (page - 1) * pageSize,
      take: pageSize,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const wireframes = useMemo(() => data?.getMyWireframes?.wireframes || [], [data]);
  const totalCount = useMemo(() => data?.getMyWireframes?.totalCount || 0, [data]);

  const [createWireframeMutation] = useMutation(CREATE_PERSONAL_WIREFRAME, {
     refetchQueries: [{ query: GET_MY_WIREFRAMES, variables: { search: "", skip: 0, take: pageSize } }],
  });

  // **** THIS IS THE FIX ****
  // Removed `refetchQueries` from this mutation to break the re-render loop.
  // Apollo's cache normalization will still update the specific item.
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
      const { data } = await updateWireframeMutation({ variables: { input: { id, ...updates } } });
      return data?.updatePersonalWireframe;
    },
    [updateWireframeMutation]
  );

  const deleteWireframe = useCallback(
    async (id: string) => {
      const { data } = await deleteWireframeMutation({ variables: { id } });
      return data?.deletePersonalWireframe;
    },
    [deleteWireframeMutation]
  );

  return {
    wireframes,
    totalCount,
    loading: loading || networkStatus === NetworkStatus.refetch,
    error,
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

export const useWireframeDetails = (wireframeId: string | null) => {
  const { data, loading, error, refetch } = useQuery<{ getWireframeDetails: WireframeDetails }>(
    GET_PERSONAL_WIREFRAME_DETAILS,
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
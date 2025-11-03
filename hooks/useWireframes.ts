// src/hooks/useWireframes.ts
import { useQuery, useMutation, NetworkStatus } from "@apollo/client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { GET_PROJECT_WIREFRAMES, GET_WIREFRAME_DETAILS } from "@/graphql/queries/wireframes";
import { CREATE_WIREFRAME, UPDATE_WIREFRAME, DELETE_WIREFRAME } from "@/graphql/mutations/wireframes";

type JsonScalar = any;

export type WireframeListItem = {
  id: string;
  title: string;
  updatedAt: string;
  thumbnail: string | null;
  projectId: string;
};

export type WireframeDetails = {
  id: string;
  title: string;
  data: JsonScalar;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
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

export const useProjectWireframes = (projectId: string) => {
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

  const refetchQueries = [
    {
      query: GET_PROJECT_WIREFRAMES,
      variables: { projectId, search: debouncedSearch, skip: (page - 1) * pageSize, take: pageSize },
    },
  ];

  const [createWireframeMutation] = useMutation(CREATE_WIREFRAME, { refetchQueries });
  const [updateWireframeMutation] = useMutation(UPDATE_WIREFRAME, { refetchQueries });
  const [deleteWireframeMutation] = useMutation(DELETE_WIREFRAME, { refetchQueries });

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

export const useWireframeDetails = (wireframeId: string | null) => {
  const { data, loading, error, refetch } = useQuery<{ getWireframeDetails: WireframeDetails }>(
    GET_WIREFRAME_DETAILS,
    {
      variables: { id: wireframeId! },
      skip: !wireframeId,
      fetchPolicy: "cache-and-network",
    },
  );

  return {
    wireframe: data?.getWireframeDetails,
    loading,
    error,
    refetch,
  };
};
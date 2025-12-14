import { useQuery, useMutation, NetworkStatus, Reference } from "@apollo/client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { GET_PROJECT_WhiteboardS, GET_WHITEBOARD_DETAILS } from "@/graphql/queries/Whiteboards"; 
import { CREATE_Whiteboard, UPDATE_Whiteboard, DELETE_Whiteboard, DELETE_MANY_WhiteboardS } from "@/graphql/mutations/Whiteboards";
import {
  CREATE_PERSONAL_Whiteboard,
} from "@/graphql/mutations/personal/personalWhiteboards";


type JsonScalar = any;

export type WhiteboardListItem = {
  id: string;
  title: string;
  updatedAt: string;
  thumbnail: string | null;
  projectId: string | null;
};

export type WhiteboardDetails = {
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

type CreateWhiteboardInput = {
  projectId: string;
  title: string;
  data: JsonScalar;
  thumbnail?: string | null;
};

type UpdateWhiteboardInput = {
  id: string;
  title?: string;
  data?: JsonScalar;
  thumbnail?: string | null;
};

// --- PROJECT HOOK ---
export const useProjectWhiteboards = (projectId?: string) => {
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

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_PROJECT_WhiteboardS, {
    variables: listVariables,
    skip: !projectId,
    fetchPolicy: "network-only", // Changed to network-only for consistent list updates
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const Whiteboards = useMemo(() => data?.getProjectWhiteboards?.Whiteboards || [], [data]);
  const totalCount = useMemo(() => data?.getProjectWhiteboards?.totalCount || 0, [data]);

  const [createWhiteboardMutation] = useMutation(CREATE_Whiteboard, {
    // FIX 1: Use dynamic variables for refetching the current list state
    refetchQueries: [{ query: GET_PROJECT_WhiteboardS, variables: listVariables }],
  });
  
  const [updateWhiteboardMutation] = useMutation(UPDATE_Whiteboard);
  
  const [deleteWhiteboardMutation] = useMutation(DELETE_Whiteboard, {
    // FIX 2: Added refetchQueries for DELETE to ensure proper pagination calculation 
    // when using network-only fetching. Retaining cache update for quick UI response.
    update(cache, { data: { deleteWhiteboard } }) {
      if (!deleteWhiteboard) return;
      cache.modify({
        fields: {
          getProjectWhiteboards(existing = { Whiteboards: [], totalCount: 0 }, { readField }) {
            return {
              ...existing,
              totalCount: existing.totalCount - 1,
              Whiteboards: existing.Whiteboards.filter(
                (wRef: Reference) => deleteWhiteboard.id !== readField("id", wRef)
              ),
            };
          },
        },
      });
    },
    refetchQueries: [{ query: GET_PROJECT_WhiteboardS, variables: listVariables }],
  });

  const [deleteManyWhiteboardMutation] = useMutation(DELETE_MANY_WhiteboardS, {
    onCompleted: () => {
      // Logic handled by refetch
    },
    refetchQueries: [{ query: GET_PROJECT_WhiteboardS, variables: listVariables }],
  });

  const createWhiteboard = useCallback(async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      // projectId is correctly included here in the input object: { projectId, title, data: initialData, thumbnail }
      if (!projectId) throw new Error("projectId is required.");
      const { data } = await createWhiteboardMutation({ variables: { input: { projectId, title, data: initialData, thumbnail } } });
      return data?.createWhiteboard;
    }, [projectId, createWhiteboardMutation]);

  const updateWhiteboard = useCallback(async (id: string, updates: Omit<UpdateWhiteboardInput, "id">) => {
      // NOTE: Relying on cache normalization to update the list item title/thumbnail
      const { data } = await updateWhiteboardMutation({ variables: { input: { id, ...updates } } });
      return data?.updateWhiteboard;
    }, [updateWhiteboardMutation]);

  const deleteWhiteboard = useCallback(async (id: string) => {
      const { data } = await deleteWhiteboardMutation({ variables: { id } });
      return data?.deleteWhiteboard;
    }, [deleteWhiteboardMutation]);

  const deleteManyProjectWhiteboards = useCallback(async (ids: string[]) => {
      const { data } = await deleteManyWhiteboardMutation({ variables: { ids } });
      return data?.deleteManyWhiteboards;
  }, [deleteManyWhiteboardMutation]);

  return {
    Whiteboards,
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
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    deleteManyProjectWhiteboards,
  };
};

// --- PERSONAL HOOK ---
export const usePersonalWhiteboards = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const listVariables = useMemo(() => ({
    search: debouncedSearch,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }), [debouncedSearch, page, pageSize]);

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_PROJECT_WhiteboardS, {
    variables: listVariables,
    fetchPolicy: "network-only", // Changed to network-only for consistent list updates
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const Whiteboards = useMemo(() => data?.getMyWhiteboards?.Whiteboards || [], [data]);
  const totalCount = useMemo(() => data?.getMyWhiteboards?.totalCount || 0, [data]);

  const [createWhiteboardMutation] = useMutation(CREATE_PERSONAL_Whiteboard, {
     // FIX 3: Use dynamic variables for refetching the current list state
     refetchQueries: [{ query: GET_PROJECT_WhiteboardS, variables: listVariables }],
  });

  const [updateWhiteboardMutation] = useMutation(UPDATE_Whiteboard); 

  const [deleteWhiteboardMutation] = useMutation(DELETE_Whiteboard, {
    update(cache, { data: { deletePersonalWhiteboard } }) {
      if (!deletePersonalWhiteboard) return;
      cache.modify({
        fields: {
          getMyWhiteboards(existing = { Whiteboards: [], totalCount: 0 }, { readField }) {
            return {
              ...existing,
              totalCount: existing.totalCount - 1,
              Whiteboards: existing.Whiteboards.filter(
                (wRef: Reference) => deletePersonalWhiteboard.id !== readField("id", wRef)
              ),
            };
          },
        },
      });
    },
    // FIX 4: Add refetchQueries for DELETE for network-only fetch policy
    refetchQueries: [{ query: GET_PROJECT_WhiteboardS, variables: listVariables }],
  });

  const createWhiteboard = useCallback(
    async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      const { data } = await createWhiteboardMutation({
        variables: { input: { title, data: initialData, thumbnail } },
      });
      return data?.createPersonalWhiteboard;
    },
    [createWhiteboardMutation]
  );

  const updateWhiteboard = useCallback(
    async (id: string, updates: Omit<UpdateWhiteboardInput, "id">) => {
      // NOTE: We assume the mutation response includes the updated object 
      // which allows Apollo to automatically update the item in the list cache.
      const { data } = await updateWhiteboardMutation({ variables: { input: { id, ...updates } } });
      // The return type suggests personal Whiteboard mutation returns `updatePersonalWhiteboard`
      return data?.updateWhiteboard; 
    },
    [updateWhiteboardMutation]
  );

  const deleteWhiteboard = useCallback(
    async (id: string) => {
      const { data } = await deleteWhiteboardMutation({ variables: { id } });
      return data?.deleteWhiteboard;
    },
    [deleteWhiteboardMutation]
  );

  return {
    Whiteboards,
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
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
  };
};

// --- DETAILS HOOK ---
export const useWhiteboardDetails = (WhiteboardId: string | null) => {
  // FIX 5: Use the generic GET_WHITEBOARD_DETAILS query, suitable for both project and personal details.
  const { data, loading, error, refetch } = useQuery<{ getWhiteboardDetails: WhiteboardDetails }>(
    GET_WHITEBOARD_DETAILS,
    {
      variables: { id: WhiteboardId! },
      skip: !WhiteboardId,
      fetchPolicy: "network-only",
    }
  );

  return {
    Whiteboard: data?.getWhiteboardDetails,
    loading,
    error,
    refetch,
  };
};
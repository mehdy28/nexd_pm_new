// src/hooks/useWireframes.ts
import { useQuery, useMutation } from "@apollo/client";
import { useState, useEffect, useCallback } from "react";
import { GET_PROJECT_WIREFRAMES, GET_WIREFRAME_DETAILS } from "@/graphql/queries/wireframes";
import { CREATE_WIREFRAME, UPDATE_WIREFRAME, DELETE_WIREFRAME } from "@/graphql/mutations/wireframes";
// import { JSON } from "graphql-ws"; // REMOVED: This import is incorrect.

// Define JSON scalar type for TypeScript. In GraphQL, it's treated as a custom scalar.
// For frontend TypeScript, 'any' or 'Record<string, any>' is typically sufficient.
type JsonScalar = any; // Or type JsonScalar = Record<string, any>;

// Define the Wireframe types based on your GraphQL schema
export type WireframeListItem = {
  id: string;
  title: string;
  updatedAt: string; // ISO date string
  thumbnail: string | null;
  projectId: string;
};

export type WireframeDetails = {
  id: string;
  title: string;
  data: JsonScalar; // Use the defined JsonScalar type
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
  };
  personalUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type CreateWireframeInput = {
  projectId: string;
  title: string;
  data: JsonScalar; // Use the defined JsonScalar type
  thumbnail?: string | null;
};

type UpdateWireframeInput = {
  id: string;
  title?: string;
  data?: JsonScalar; // Use the defined JsonScalar type
  thumbnail?: string | null;
};

export const useProjectWireframes = (projectId: string) => {
  const { data, loading, error, refetch } = useQuery<{ getProjectWireframes: WireframeListItem[] }>(
    GET_PROJECT_WIREFRAMES,
    {
      variables: { projectId },
      skip: !projectId, // Skip query if projectId is not provided
      fetchPolicy: "cache-and-network", // Always try to get fresh data
    },
  );

  const [createWireframeMutation] = useMutation<
    { createWireframe: WireframeListItem },
    { input: CreateWireframeInput }
  >(CREATE_WIREFRAME, {
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: { projectId } }],
  });

  const [updateWireframeMutation] = useMutation<
    { updateWireframe: WireframeListItem },
    { input: UpdateWireframeInput }
  >(UPDATE_WIREFRAME, {
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: { projectId } }],
  });

  const [deleteWireframeMutation] = useMutation<
    { deleteWireframe: WireframeListItem },
    { id: string }
  >(DELETE_WIREFRAME, {
    refetchQueries: [{ query: GET_PROJECT_WIREFRAMES, variables: { projectId } }],
  });

  const wireframes = data?.getProjectWireframes || [];

  const createWireframe = useCallback(
    async (title: string, initialData: JsonScalar, thumbnail?: string | null) => {
      if (!projectId) throw new Error("projectId is required to create a wireframe.");
      const input: CreateWireframeInput = {
        projectId,
        title,
        data: initialData,
        thumbnail,
      };
      try {
        const { data } = await createWireframeMutation({ variables: { input } });
        return data?.createWireframe;
      } catch (err) {
        console.error("Error creating wireframe:", err);
        throw err;
      }
    },
    [projectId, createWireframeMutation],
  );

  const updateWireframe = useCallback(
    async (id: string, updates: Omit<UpdateWireframeInput, 'id'>) => {
      const input: UpdateWireframeInput = { id, ...updates };
      try {
        const { data } = await updateWireframeMutation({ variables: { input } });
        return data?.updateWireframe;
      } catch (err) {
        console.error("Error updating wireframe:", err);
        throw err;
      }
    },
    [updateWireframeMutation],
  );

  const deleteWireframe = useCallback(
    async (id: string) => {
      try {
        const { data } = await deleteWireframeMutation({ variables: { id } });
        return data?.deleteWireframe;
      } catch (err) {
        console.error("Error deleting wireframe:", err);
        throw err;
      }
    },
    [deleteWireframeMutation],
  );

  return {
    wireframes,
    loading,
    error,
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
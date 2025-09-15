// lib/hooks/useWorkspacePageData.ts
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { GET_WORKSPACE_PAGE_DATA } from "@/graphql/queries/workspaceQueries";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL!;

export const useWorkspacePageData = (userId: string) => {
  return useQuery({
    queryKey: ["workspacePageData", userId],
    queryFn: async () => {
      if (!userId) return null;

      const data = await request(GRAPHQL_ENDPOINT, GET_WORKSPACE_PAGE_DATA, { userId });

      // Match the GraphQL type WorkspacePageData
      return {
        workspace: data.workspacePageData.workspace,
        projects: data.workspacePageData.projects,
        members: data.workspacePageData.members,
      };
    },
    enabled: !!userId,
  });
};

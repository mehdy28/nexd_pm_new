import { useQuery } from "@apollo/client"
import { GET_ACCOUNT_PAGE_DATA } from "@/graphql/queries/personal/userQuerries"
import { useMemo } from "react"
import { useUser } from "@/hooks/useUser";

export const useAccountPage = () => {
  const { data, loading, error } = useQuery(GET_ACCOUNT_PAGE_DATA)

  const { user } = useUser();
  const workspace = data?.getWorkspaceData

  const isOwner = useMemo(() => {
    if (!user || !workspace) return false
    return user.id === workspace.owner.id
  }, [user, workspace])

  return {
    user,
    workspace,
    isOwner,
    loading,
    error,
  }
}
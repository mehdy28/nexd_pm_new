"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { GET_ME } from "@/graphql/queries/user"

export function useAuth() {
  const { data: session, status } = useSession()
  const { data: userData, loading: userLoading } = useQuery(GET_ME, {
    skip: !session?.user,
  })

  return {
    user: userData?.me || session?.user,
    isLoading: status === "loading" || userLoading,
    isAuthenticated: !!session?.user,
    signIn,
    signOut,
  }
}

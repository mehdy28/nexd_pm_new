import type { Context } from "@/lib/apollo-server"

export function requireAuth(context: Context) {
  if (!context.user) {
    throw new Error("Authentication required")
  }
  return context.user
}

export function requireWorkspaceAccess(context: Context, workspaceId: string) {
  const user = requireAuth(context)

  // This would typically check if user has access to the workspace
  // For now, we'll implement basic auth check
  return user
}

export function requireProjectAccess(context: Context, projectId: string) {
  const user = requireAuth(context)

  // This would typically check if user has access to the project
  // For now, we'll implement basic auth check
  return user
}

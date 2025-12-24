export function requireAuth(context) {
    if (!context.user) {
        throw new Error("Authentication required");
    }
    return context.user;
}
export function requireWorkspaceAccess(context, workspaceId) {
    const user = requireAuth(context);
    // This would typically check if user has access to the workspace
    // For now, we'll implement basic auth check
    return user;
}
export function requireProjectAccess(context, projectId) {
    const user = requireAuth(context);
    // This would typically check if user has access to the project
    // For now, we'll implement basic auth check
    return user;
}

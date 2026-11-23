import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";

/**
 * Checks whether the current user is a Settings admin in the current workspace.
 * For example, use it to conditionally show a workspace settings control.
 * Returns false while roles are loading or unavailable.
 */
export function useIsGlobalAdmin(): boolean {
  const [roles, isLoading] = useUserAppRoles();
  if (isLoading || roles === undefined) {
    return false;
  }
  return roles.settings === "admin";
}

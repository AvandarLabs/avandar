import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles";

/**
 * True when the current user is a Settings (global) admin in the workspace.
 */
export function useIsGlobalAdmin(): boolean {
  const [roles, isLoading] = useUserAppRoles();

  if (isLoading || roles === undefined) {
    return false;
  }

  return roles.settings === "admin";
}

import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

/**
 * True when the current user may delete the crosswalk: its owner, or a Data
 * Sources admin. Matches the delete policy on `crosswalks`, which silently
 * deletes nothing for any other editor. False before the first save.
 */
export function useCanDeleteCrosswalk(
  crosswalk: Crosswalk.T | undefined,
): boolean {
  const user = useCurrentUser();
  const [roles] = useUserAppRoles();
  if (!crosswalk) {
    return false;
  }
  const isOwner = user?.id !== undefined && crosswalk.ownerId === user.id;
  return isOwner || roles?.data_sources === "admin";
}

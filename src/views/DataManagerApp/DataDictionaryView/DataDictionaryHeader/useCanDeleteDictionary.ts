import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

/**
 * True when the current user may delete the dictionary: its owner, or a Data
 * Sources admin. Matches the delete policy on `data_dictionaries`, which
 * silently deletes nothing for any other editor.
 */
export function useCanDeleteDictionary(
  dictionary: DataDictionary.T,
): boolean {
  const user = useCurrentUser();
  const [roles] = useUserAppRoles();
  const isDataSourcesAdmin = roles?.data_sources === "admin";
  const isOwner = user?.id !== undefined && dictionary.ownerId === user.id;
  return isOwner || isDataSourcesAdmin;
}

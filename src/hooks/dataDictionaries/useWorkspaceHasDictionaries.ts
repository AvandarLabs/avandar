import { where } from "@avandar/utils";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Whether the current workspace has any dictionary. Use it to offer an
 * action only when there is a dictionary to act on, such as applying one to
 * a dataset. `hasDictionaries` is false while loading and when the
 * dictionaries cannot be read, so check `isLoading` and `isError` before
 * treating false as "the workspace has none".
 */
export function useWorkspaceHasDictionaries(): {
  hasDictionaries: boolean;
  isLoading: boolean;
  /** True when the dictionaries could not be read. */
  isError: boolean;
} {
  const workspace = useCurrentWorkspace();
  const [dictionaries, isLoading, dictionariesQuery] =
    DataDictionaryClient.useGetAll({
      ...where("workspace_id", "eq", workspace.id),
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  return {
    hasDictionaries: (dictionaries?.length ?? 0) > 0,
    isLoading,
    isError: dictionariesQuery.isError,
  };
}

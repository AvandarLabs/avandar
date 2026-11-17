import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { PluginContentImport } from "$/models/PluginContentImport/PluginContentImport";

/** The content a plugin already imported into the current workspace. */
export type ImportedPluginContent = Readonly<{
  /** Each import by the manifest content id it imported. */
  importsByContentId: Readonly<Record<string, PluginContentImport.T>>;
  isLoading: boolean;

  /**
   * True while a request for the imports is in flight, including the refetch
   * that follows a restored cache. `importsByContentId` may be stale until
   * it is false.
   */
  isFetching: boolean;

  /**
   * True when the last request for the imports failed. `importsByContentId`
   * then holds what an earlier request returned, or nothing, and is not to
   * be trusted.
   */
  isError: boolean;

  /**
   * Asks for the imports again, for example from a Retry button after
   * `isError`. `isFetching` is true until the request settles.
   */
  refetch: () => void;
}>;

/**
 * Loads which of a plugin's content items the current workspace already
 * imported, even through an earlier install. Use it wherever content is
 * offered for import, for example to disable an item the install wizard
 * would otherwise import twice, or to link an item to its dataset. It
 * refetches whenever a component using it mounts, because the cache is
 * restored from the last session and a caller may offer a destructive choice
 * from the list. Such a caller waits for `isFetching` to be false and
 * `isError` to be false.
 */
export function useImportedPluginContent(
  pluginId: string,
): ImportedPluginContent {
  const workspace = useCurrentWorkspace();
  const [imports, isLoading, query] = PluginContentImportClient.useGetAll({
    where: {
      workspace_id: { eq: workspace.id },
      plugin_id: { eq: pluginId },
    },
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  return {
    importsByContentId: Object.fromEntries(
      (imports ?? []).map((contentImport) => {
        return [contentImport.contentId, contentImport];
      }),
    ),
    isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
